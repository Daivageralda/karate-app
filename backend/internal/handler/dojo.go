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

// DojoHandler handles dojo requests
type DojoHandler struct {
	dojoService *service.DojoService
}

// NewDojoHandler creates a new DojoHandler
func NewDojoHandler(dojoService *service.DojoService) *DojoHandler {
	return &DojoHandler{dojoService: dojoService}
}

// Create handles POST /api/v1/dojos
func (h *DojoHandler) Create(c *gin.Context) {
	input, err := parseDojoInput(c, true)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	dojo, err := h.dojoService.Create(c.Request.Context(), models.CreateDojoInput(input))
	if err != nil {
		switch {
		case errors.Is(err, models.ErrConflict):
			response.Error(c, http.StatusConflict, "dojo name already exists")
		default:
			response.Error(c, http.StatusBadRequest, err.Error())
		}
		return
	}

	response.Success(c, http.StatusCreated, "dojo created", dojo)
}

// List handles GET /api/v1/dojos
func (h *DojoHandler) List(c *gin.Context) {
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

	dojos, err := h.dojoService.List(c.Request.Context(), models.PaginationQuery{
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

	response.Success(c, http.StatusOK, "dojo list", dojos)
}

// GetByID handles GET /api/v1/dojos/:id
func (h *DojoHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid dojo id")
		return
	}

	dojo, err := h.dojoService.GetByID(c.Request.Context(), id)
	if err != nil {
		switch {
		case errors.Is(err, models.ErrNotFound):
			response.Error(c, http.StatusNotFound, err.Error())
		default:
			response.Error(c, http.StatusInternalServerError, "internal server error")
		}
		return
	}

	response.Success(c, http.StatusOK, "dojo detail", dojo)
}

// Update handles PUT /api/v1/dojos/:id
func (h *DojoHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid dojo id")
		return
	}

	input, err := parseDojoInput(c, false)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	dojo, err := h.dojoService.Update(c.Request.Context(), id, input)
	if err != nil {
		switch {
		case errors.Is(err, models.ErrNotFound):
			response.Error(c, http.StatusNotFound, err.Error())
		case errors.Is(err, models.ErrConflict):
			response.Error(c, http.StatusConflict, "dojo name already exists")
		default:
			response.Error(c, http.StatusBadRequest, err.Error())
		}
		return
	}

	response.Success(c, http.StatusOK, "dojo updated", dojo)
}

// Delete handles DELETE /api/v1/dojos/:id
func (h *DojoHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid dojo id")
		return
	}

	if err := h.dojoService.Delete(c.Request.Context(), id); err != nil {
		switch {
		case errors.Is(err, models.ErrNotFound):
			response.Error(c, http.StatusNotFound, err.Error())
		default:
			response.Error(c, http.StatusInternalServerError, "internal server error")
		}
		return
	}

	response.Success(c, http.StatusOK, "dojo deleted", gin.H{"id": id.String()})
}

func parseDojoInput(c *gin.Context, requireLogo bool) (models.UpdateDojoInput, error) {
	var input models.UpdateDojoInput

	if err := c.Request.ParseMultipartForm(32 << 20); err != nil {
		return input, errors.New("invalid multipart form")
	}

	input.Name = strings.TrimSpace(c.PostForm("name"))

	logoFile, err := c.FormFile("logo")
	if err == nil {
		input.LogoFile = logoFile
	} else if requireLogo {
		return input, errors.New("logo is required")
	}

	return input, nil
}
