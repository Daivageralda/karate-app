package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"eo-karate/internal/models"
	"eo-karate/internal/response"
)

// HealthHandler handles health check endpoint
type HealthHandler struct{}

// NewHealthHandler creates a new HealthHandler instance
func NewHealthHandler() *HealthHandler {
	return &HealthHandler{}
}

// Check handles GET /api/v1/health
func (h *HealthHandler) Check(c *gin.Context) {
	response.Success(c, http.StatusOK, "service is healthy", gin.H{"healthy": true})
}

// DocsHandler handles documentation endpoints
type DocsHandler struct{}

// NewDocsHandler creates a new DocsHandler instance
func NewDocsHandler() *DocsHandler {
	return &DocsHandler{}
}

// Pagination handles GET /api/v1/docs/pagination
func (h *DocsHandler) Pagination(c *gin.Context) {
	response.Success(c, http.StatusOK, "pagination docs", gin.H{
		"summary": "Cursor-based pagination for users and events.",
		"query": gin.H{
			"limit":     "positive integer, default 20, max 100",
			"cursor":    "cursor token from previous response meta",
			"direction": "next|prev (default next)",
		},
		"rules": []string{
			"When direction=prev, cursor is required.",
			"Use meta.next_cursor to move forward.",
			"Use meta.prev_cursor to move backward.",
		},
		"endpoints": []gin.H{
			{"path": "/api/v1/users", "method": "GET"},
			{"path": "/api/v1/dojos", "method": "GET"},
			{"path": "/api/v1/events", "method": "GET"},
		},
		"example": gin.H{
			"first_page": "/api/v1/users?limit=2&direction=" + models.CursorDirectionNext,
			"next_page":  "/api/v1/users?limit=2&direction=" + models.CursorDirectionNext + "&cursor=<next_cursor>",
			"prev_page":  "/api/v1/users?limit=2&direction=" + models.CursorDirectionPrev + "&cursor=<prev_cursor>",
		},
	})
}
