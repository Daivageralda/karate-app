package handler

import (
	"github.com/gin-gonic/gin"
)

// New creates a new router with all handlers
func New(healthHandler *HealthHandler, userHandler *UserHandler, dojoHandler *DojoHandler, eventHandler *EventHandler, participantHandler *ParticipantHandler, docsHandler *DocsHandler) *gin.Engine {
	engine := gin.New()
	engine.Use(gin.Logger(), gin.Recovery())
	engine.MaxMultipartMemory = 64 << 20
	engine.Static("/uploads", "./uploads")

	api := engine.Group("/api/v1")
	api.GET("/health", healthHandler.Check)
	api.GET("/docs/pagination", docsHandler.Pagination)
	api.POST("/auth/register", userHandler.Register)
	api.POST("/auth/login", userHandler.Login)
	api.GET("/users", userHandler.List)
	api.POST("/users", userHandler.Create)
	api.GET("/users/:id", userHandler.GetByID)
	api.PUT("/users/:id", userHandler.Update)
	api.DELETE("/users/:id", userHandler.Delete)
	api.GET("/dojos", dojoHandler.List)
	api.POST("/dojos", dojoHandler.Create)
	api.GET("/dojos/:id", dojoHandler.GetByID)
	api.PUT("/dojos/:id", dojoHandler.Update)
	api.DELETE("/dojos/:id", dojoHandler.Delete)
	// Participant routes (more specific, register BEFORE generic event routes)
	api.GET("/events/:id/participants/template", participantHandler.DownloadTemplate)
	api.GET("/events/:id/registrations/dojos", participantHandler.ListEventRegistrationDojos)
	api.GET("/events/:id/registrations/dojos/export", participantHandler.DownloadEventRegistrationDojosExcel)
	api.POST("/events/:id/dojos/:dojoId/participants/upload", participantHandler.UploadParticipants)
	api.GET("/events/:id/dojos/:dojoId/participants/uploaded-excel-preview", participantHandler.GetUploadedParticipantsExcelPreview)
	api.GET("/events/:id/dojos/:dojoId/participants", participantHandler.GetParticipants)
	api.PUT("/events/:id/dojos/:dojoId/participants/:participantId/status", participantHandler.UpdateParticipantStatus)
	api.DELETE("/events/:id/dojos/:dojoId/participants/:participantId", participantHandler.DeleteParticipant)
	api.GET("/events/:id/dojos/:dojoId/participants/status", participantHandler.GetStatusSummary)
	api.POST("/participants/:participantId/documents", participantHandler.UploadDocument)
	api.GET("/events/:id/dojos/:dojoId/recommendation-letter", participantHandler.GetRecommendationLetter)
	api.POST("/events/:id/dojos/:dojoId/recommendation-letter", participantHandler.UploadRecommendationLetter)
	api.PUT("/events/:id/dojos/:dojoId/recommendation-letter/status", participantHandler.UpdateRecommendationLetterStatus)

	// Generic event routes (less specific, register AFTER participant routes)
	api.GET("/events", eventHandler.List)
	api.POST("/events", eventHandler.Create)
	api.GET("/events/:id", eventHandler.GetByID)
	api.PUT("/events/:id", eventHandler.Update)
	api.DELETE("/events/:id", eventHandler.Delete)

	return engine
}
