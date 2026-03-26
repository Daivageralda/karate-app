package handler

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"eo-karate/internal/models"
	"eo-karate/internal/response"
	"eo-karate/internal/service"
)

// KelasTandingHandler handles kelas tanding requests
type KelasTandingHandler struct {
	kelasTandingService *service.KelasTandingService
}

// NewKelasTandingHandler creates a new KelasTandingHandler
func NewKelasTandingHandler(kelasTandingService *service.KelasTandingService) *KelasTandingHandler {
	return &KelasTandingHandler{kelasTandingService: kelasTandingService}
}

// Create handles POST /api/v1/kelas-tanding
func (h *KelasTandingHandler) Create(c *gin.Context) {
	var input models.CreateKelasTandingInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, "invalid request body")
		return
	}

	input.Nama = strings.TrimSpace(input.Nama)

	item, err := h.kelasTandingService.Create(c.Request.Context(), input)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(c, http.StatusCreated, "kelas tanding created", item)
}

// List handles GET /api/v1/kelas-tanding
func (h *KelasTandingHandler) List(c *gin.Context) {
	cursor := c.Query("cursor")
	direction := strings.ToLower(strings.TrimSpace(c.DefaultQuery("direction", models.CursorDirectionNext)))
	limit := 20

	if rawLimit := c.Query("limit"); rawLimit != "" {
		parsedLimit, err := strconv.Atoi(rawLimit)
		if err != nil || parsedLimit <= 0 {
			response.Error(c, http.StatusBadRequest, "limit must be a positive integer")
			return
		}
		limit = parsedLimit
	}

	if direction == models.CursorDirectionPrev && cursor == "" {
		response.Error(c, http.StatusBadRequest, "cursor is required when direction=prev")
		return
	}

	result, err := h.kelasTandingService.List(c.Request.Context(), models.PaginationQuery{
		Cursor:    cursor,
		Limit:     limit,
		Direction: direction,
	})
	if err != nil {
		switch {
		case errors.Is(err, models.ErrInvalidCursor):
			response.Error(c, http.StatusBadRequest, err.Error())
		case errors.Is(err, models.ErrInvalidDirection):
			response.Error(c, http.StatusBadRequest, "direction must be next or prev")
		default:
			response.Error(c, http.StatusInternalServerError, "internal server error")
		}
		return
	}

	response.Success(c, http.StatusOK, "kelas tanding list", result)
}

// GetByID handles GET /api/v1/kelas-tanding/:id
func (h *KelasTandingHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid kelas tanding id")
		return
	}

	item, err := h.kelasTandingService.GetByID(c.Request.Context(), id)
	if err != nil {
		switch {
		case errors.Is(err, models.ErrNotFound):
			response.Error(c, http.StatusNotFound, "kelas tanding not found")
		default:
			response.Error(c, http.StatusInternalServerError, "internal server error")
		}
		return
	}

	response.Success(c, http.StatusOK, "kelas tanding detail", item)
}

// Update handles PUT /api/v1/kelas-tanding/:id
func (h *KelasTandingHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid kelas tanding id")
		return
	}

	var input models.UpdateKelasTandingInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, "invalid request body")
		return
	}

	input.Nama = strings.TrimSpace(input.Nama)

	item, err := h.kelasTandingService.Update(c.Request.Context(), id, input)
	if err != nil {
		switch {
		case errors.Is(err, models.ErrNotFound):
			response.Error(c, http.StatusNotFound, "kelas tanding not found")
		default:
			response.Error(c, http.StatusBadRequest, err.Error())
		}
		return
	}

	response.Success(c, http.StatusOK, "kelas tanding updated", item)
}

// Delete handles DELETE /api/v1/kelas-tanding/:id
func (h *KelasTandingHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid kelas tanding id")
		return
	}

	if err := h.kelasTandingService.Delete(c.Request.Context(), id); err != nil {
		switch {
		case errors.Is(err, models.ErrNotFound):
			response.Error(c, http.StatusNotFound, "kelas tanding not found")
		default:
			response.Error(c, http.StatusInternalServerError, "internal server error")
		}
		return
	}

	response.Success(c, http.StatusOK, "kelas tanding deleted", nil)
}
