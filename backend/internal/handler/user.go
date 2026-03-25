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

// UserHandler handles user-related requests
type UserHandler struct {
	userService *service.UserService
}

// NewUserHandler creates a new UserHandler instance
func NewUserHandler(userService *service.UserService) *UserHandler {
	return &UserHandler{userService: userService}
}

// Create handles POST /api/v1/users
func (h *UserHandler) Create(c *gin.Context) {
	var input models.CreateUserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, "invalid request body")
		return
	}

	user, err := h.userService.Create(c.Request.Context(), input)
	if err != nil {
		switch {
		case errors.Is(err, models.ErrConflict):
			response.Error(c, http.StatusConflict, "email already exists")
		default:
			response.Error(c, http.StatusBadRequest, err.Error())
		}
		return
	}

	response.Success(c, http.StatusCreated, "user created", user)
}

// Update handles PUT /api/v1/users/:id
func (h *UserHandler) Update(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid user id")
		return
	}

	var input models.UpdateUserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, "invalid request body")
		return
	}

	user, err := h.userService.Update(c.Request.Context(), id, input)
	if err != nil {
		switch {
		case errors.Is(err, models.ErrNotFound):
			response.Error(c, http.StatusNotFound, err.Error())
		case errors.Is(err, models.ErrConflict):
			response.Error(c, http.StatusConflict, "email already exists")
		default:
			response.Error(c, http.StatusBadRequest, err.Error())
		}
		return
	}

	response.Success(c, http.StatusOK, "user updated", user)
}

// Delete handles DELETE /api/v1/users/:id
func (h *UserHandler) Delete(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid user id")
		return
	}

	if err := h.userService.Delete(c.Request.Context(), id); err != nil {
		switch {
		case errors.Is(err, models.ErrNotFound):
			response.Error(c, http.StatusNotFound, err.Error())
		default:
			response.Error(c, http.StatusInternalServerError, "internal server error")
		}
		return
	}

	response.Success(c, http.StatusOK, "user deleted", gin.H{"id": id.String()})
}

// List handles GET /api/v1/users
func (h *UserHandler) List(c *gin.Context) {
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

	users, err := h.userService.List(c.Request.Context(), models.PaginationQuery{
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

	response.Success(c, http.StatusOK, "user list", users)
}

// GetByID handles GET /api/v1/users/:id
func (h *UserHandler) GetByID(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid user id")
		return
	}

	user, err := h.userService.GetByID(c.Request.Context(), id)
	if err != nil {
		switch {
		case errors.Is(err, models.ErrNotFound):
			response.Error(c, http.StatusNotFound, err.Error())
		default:
			response.Error(c, http.StatusInternalServerError, "internal server error")
		}
		return
	}

	response.Success(c, http.StatusOK, "user detail", user)
}

// Register handles POST /api/v1/auth/register
func (h *UserHandler) Register(c *gin.Context) {
	var input models.AuthRegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, "invalid request body")
		return
	}

	user, err := h.userService.Register(c.Request.Context(), input)
	if err != nil {
		switch {
		case errors.Is(err, models.ErrConflict):
			response.Error(c, http.StatusConflict, "email already exists")
		default:
			response.Error(c, http.StatusBadRequest, err.Error())
		}
		return
	}

	response.Success(c, http.StatusCreated, "register success", user)
}

// Login handles POST /api/v1/auth/login
func (h *UserHandler) Login(c *gin.Context) {
	var input models.AuthLoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		response.Error(c, http.StatusBadRequest, "invalid request body")
		return
	}

	result, err := h.userService.Login(c.Request.Context(), input)
	if err != nil {
		switch {
		case errors.Is(err, models.ErrUnauthorized):
			response.Error(c, http.StatusUnauthorized, "invalid email or password")
		default:
			response.Error(c, http.StatusBadRequest, err.Error())
		}
		return
	}

	response.Success(c, http.StatusOK, "login success", result)
}
