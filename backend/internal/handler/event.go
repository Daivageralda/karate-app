package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"mime/multipart"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"eo-karate/internal/models"
	"eo-karate/internal/response"
	"eo-karate/internal/service"
)

// EventHandler handles event-related requests
type EventHandler struct {
	eventService             *service.EventService
	eventKelasTandingService *service.EventKelasTandingService
}

// NewEventHandler creates a new EventHandler instance
func NewEventHandler(eventService *service.EventService, eventKelasTandingService *service.EventKelasTandingService) *EventHandler {
	return &EventHandler{
		eventService:             eventService,
		eventKelasTandingService: eventKelasTandingService,
	}
}

// Create handles POST /api/v1/events
func (h *EventHandler) Create(c *gin.Context) {
	input, err := parseEventInput(c, true)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	event, err := h.eventService.Create(c.Request.Context(), models.CreateEventInput(input))
	if err != nil {
		switch {
		case errors.Is(err, models.ErrConflict):
			response.Error(c, http.StatusConflict, "slug already exists")
		default:
			response.Error(c, http.StatusBadRequest, err.Error())
		}
		return
	}

	response.Success(c, http.StatusCreated, "event created", event)
}

// Update handles PUT /api/v1/events/:id
func (h *EventHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid event id")
		return
	}

	input, err := parseEventInput(c, false)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	event, err := h.eventService.Update(c.Request.Context(), id, input)
	if err != nil {
		switch {
		case errors.Is(err, models.ErrConflict):
			response.Error(c, http.StatusConflict, "slug already exists")
		case errors.Is(err, models.ErrNotFound):
			response.Error(c, http.StatusNotFound, err.Error())
		default:
			response.Error(c, http.StatusBadRequest, err.Error())
		}
		return
	}

	response.Success(c, http.StatusOK, "event updated", event)
}

// Delete handles DELETE /api/v1/events/:id
func (h *EventHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid event id")
		return
	}

	if err := h.eventService.Delete(c.Request.Context(), id); err != nil {
		switch {
		case errors.Is(err, models.ErrNotFound):
			response.Error(c, http.StatusNotFound, err.Error())
		default:
			response.Error(c, http.StatusInternalServerError, "internal server error")
		}
		return
	}

	response.Success(c, http.StatusOK, "event deleted", gin.H{"id": id.String()})
}

func parseEventInput(c *gin.Context, requireBanner bool) (models.UpdateEventInput, error) {
	var input models.UpdateEventInput

	if err := c.Request.ParseMultipartForm(64 << 20); err != nil {
		return input, errors.New("invalid multipart form")
	}

	input.Name = strings.TrimSpace(c.PostForm("name"))
	input.Slug = strings.TrimSpace(c.PostForm("slug"))
	input.Description = strings.TrimSpace(c.PostForm("description"))

	if err := parseJSONField(c.PostForm("time"), &input.Time, "time"); err != nil {
		return input, err
	}

	if err := parseJSONField(c.PostForm("organizer"), &input.Organizer, "organizer"); err != nil {
		return input, err
	}

	if err := parseJSONField(c.PostForm("location"), &input.Location, "location"); err != nil {
		return input, err
	}

	if err := parseJSONField(c.PostForm("config"), &input.Config, "config"); err != nil {
		return input, err
	}

	bannerFile, err := c.FormFile("banner")
	if err == nil {
		input.BannerFile = bannerFile
	} else if requireBanner {
		return input, errors.New("banner is required")
	}

	if c.Request.MultipartForm != nil {
		attachments := make([]*multipart.FileHeader, 0)
		if files, ok := c.Request.MultipartForm.File["attachments"]; ok {
			attachments = append(attachments, files...)
		}
		if files, ok := c.Request.MultipartForm.File["attachments[]"]; ok {
			attachments = append(attachments, files...)
		}
		input.Attachments = attachments
	}

	return input, nil
}

func parseJSONField(raw string, target any, fieldName string) error {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return fmt.Errorf("%s is required and must be a JSON object", fieldName)
	}

	if err := json.Unmarshal([]byte(raw), target); err != nil {
		return fmt.Errorf("%s is invalid JSON", fieldName)
	}

	return nil
}

// List handles GET /api/v1/events
func (h *EventHandler) List(c *gin.Context) {
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

	events, err := h.eventService.List(c.Request.Context(), models.PaginationQuery{
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

	response.Success(c, http.StatusOK, "event list", events)
}

// GetByID handles GET /api/v1/events/:id
func (h *EventHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid event id")
		return
	}

	event, err := h.eventService.GetByID(c.Request.Context(), id)
	if err != nil {
		switch {
		case errors.Is(err, models.ErrNotFound):
			response.Error(c, http.StatusNotFound, err.Error())
		default:
			response.Error(c, http.StatusInternalServerError, "internal server error")
		}
		return
	}

	response.Success(c, http.StatusOK, "event detail", event)
}

// GetKelasTandingAssignments handles GET /api/v1/events/:id/kelas-tanding
func (h *EventHandler) GetKelasTandingAssignments(c *gin.Context) {
	eventID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid event id")
		return
	}

	assignments, err := h.eventKelasTandingService.GetAssignments(c.Request.Context(), eventID)
	if err != nil {
		switch {
		case errors.Is(err, models.ErrNotFound):
			response.Error(c, http.StatusNotFound, "event not found")
		default:
			response.Error(c, http.StatusBadRequest, err.Error())
		}
		return
	}

	response.Success(c, http.StatusOK, "event kelas tanding assignments", assignments)
}

// AssignKelasTanding handles POST /api/v1/events/:id/kelas-tanding
func (h *EventHandler) AssignKelasTanding(c *gin.Context) {
	eventID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid event id")
		return
	}

	var input models.AssignEventKelasTandingInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, "invalid request body")
		return
	}
	if input.Harga == nil {
		response.Error(c, http.StatusBadRequest, "harga is required")
		return
	}

	assignments, err := h.eventKelasTandingService.AssignOne(c.Request.Context(), eventID, input.KelasTandingID, *input.Harga)
	if err != nil {
		switch {
		case errors.Is(err, models.ErrNotFound):
			response.Error(c, http.StatusNotFound, "event not found")
		default:
			response.Error(c, http.StatusBadRequest, err.Error())
		}
		return
	}

	response.Success(c, http.StatusOK, "kelas tanding assigned to event", assignments)
}

// UnassignKelasTanding handles DELETE /api/v1/events/:id/kelas-tanding/:kelasTandingId
func (h *EventHandler) UnassignKelasTanding(c *gin.Context) {
	eventID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid event id")
		return
	}

	kelasTandingID, err := uuid.Parse(c.Param("kelasTandingId"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid kelas tanding id")
		return
	}

	assignments, err := h.eventKelasTandingService.UnassignOne(c.Request.Context(), eventID, kelasTandingID)
	if err != nil {
		switch {
		case errors.Is(err, models.ErrNotFound):
			response.Error(c, http.StatusNotFound, "event not found")
		default:
			response.Error(c, http.StatusBadRequest, err.Error())
		}
		return
	}

	response.Success(c, http.StatusOK, "kelas tanding unassigned from event", assignments)
}
