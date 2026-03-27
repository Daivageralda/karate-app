package handler

import (
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"eo-karate/internal/models"
	"eo-karate/internal/response"
	"eo-karate/internal/service"
)

// ParticipantHandler handles participant-related requests
type ParticipantHandler struct {
	participantService *service.ParticipantService
}

type updateParticipantStatusRequest struct {
	Status string `json:"status"`
}

// NewParticipantHandler creates a new ParticipantHandler instance
func NewParticipantHandler(participantService *service.ParticipantService) *ParticipantHandler {
	return &ParticipantHandler{participantService: participantService}
}

// DownloadTemplate handles GET /api/v1/events/:id/participants/template
// Returns an Excel template file for participants
func (h *ParticipantHandler) DownloadTemplate(c *gin.Context) {
	eventID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid event id")
		return
	}

	excelData, err := h.participantService.GenerateExcelTemplate(c.Request.Context(), eventID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=peserta-template-%s.xlsx", eventID.String()))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", excelData)
}

// UploadParticipants handles POST /api/v1/events/:id/dojos/:dojoId/participants/upload
// Parses Excel file and creates participants
func (h *ParticipantHandler) UploadParticipants(c *gin.Context) {
	eventID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid event id")
		return
	}

	dojoID, err := uuid.Parse(c.Param("dojoId"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid dojo id")
		return
	}

	// Get file from form
	file, err := c.FormFile("file")
	if err != nil {
		response.Error(c, http.StatusBadRequest, "file is required")
		return
	}

	// Read file content
	src, err := file.Open()
	if err != nil {
		response.Error(c, http.StatusBadRequest, "failed to open file")
		return
	}
	defer src.Close()

	excelData, err := io.ReadAll(src)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "failed to read file")
		return
	}

	// Process Excel
	participants, err := h.participantService.BulkCreateFromExcel(c.Request.Context(), eventID, dojoID, excelData)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.participantService.SaveUploadedParticipantsExcel(eventID, dojoID, file.Filename, excelData); err != nil {
		response.Error(c, http.StatusInternalServerError, "failed to persist uploaded excel")
		return
	}

	response.Success(c, http.StatusCreated, "participants uploaded successfully", gin.H{
		"count":        len(participants),
		"participants": participants,
	})
}

// GetUploadedParticipantsExcelPreview handles GET /api/v1/events/:id/dojos/:dojoId/participants/uploaded-excel-preview
// Returns preview for the latest persisted uploaded participants Excel file.
func (h *ParticipantHandler) GetUploadedParticipantsExcelPreview(c *gin.Context) {
	eventID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid event id")
		return
	}

	dojoID, err := uuid.Parse(c.Param("dojoId"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid dojo id")
		return
	}

	preview, err := h.participantService.GetLatestUploadedParticipantsExcelPreview(eventID, dojoID, 8)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "failed to fetch uploaded excel preview")
		return
	}

	if preview == nil {
		response.Success(c, http.StatusOK, "uploaded excel preview not found", nil)
		return
	}

	response.Success(c, http.StatusOK, "uploaded excel preview retrieved", preview)
}

// GetParticipants handles GET /api/v1/events/:id/dojos/:dojoId/participants
// Returns all participants for an event/dojo combination
func (h *ParticipantHandler) GetParticipants(c *gin.Context) {
	eventID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid event id")
		return
	}

	dojoID, err := uuid.Parse(c.Param("dojoId"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid dojo id")
		return
	}

	participants, err := h.participantService.GetParticipants(c.Request.Context(), eventID, dojoID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "failed to fetch participants")
		return
	}

	response.Success(c, http.StatusOK, "participants retrieved", gin.H{
		"meta": gin.H{
			"count": len(participants),
		},
		"data": participants,
	})
}

// ListEventRegistrationDojos handles GET /api/v1/events/:id/registrations/dojos
// Returns dojo-level registration summaries for an event.
func (h *ParticipantHandler) ListEventRegistrationDojos(c *gin.Context) {
	eventID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid event id")
		return
	}

	items, err := h.participantService.ListEventRegistrationDojos(c.Request.Context(), eventID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "failed to fetch dojo registrations")
		return
	}

	response.Success(c, http.StatusOK, "dojo registrations retrieved", gin.H{
		"items": items,
		"meta": gin.H{
			"count": len(items),
		},
	})
}

// DownloadEventRegistrationDojosExcel handles GET /api/v1/events/:id/registrations/dojos/export
// Returns merged dojo registration participant data as an Excel file.
func (h *ParticipantHandler) DownloadEventRegistrationDojosExcel(c *gin.Context) {
	eventID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid event id")
		return
	}

	excelData, err := h.participantService.GenerateEventRegistrationDojosExcel(c.Request.Context(), eventID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "failed to generate dojo registration excel")
		return
	}

	fileName := fmt.Sprintf("pendaftaran-dojo-%s.xlsx", eventID.String())
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%s", fileName))
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", excelData)
}

// GetStatusSummary handles GET /api/v1/events/:id/dojos/:dojoId/participants/status
// Returns a summary of participant registration status
func (h *ParticipantHandler) GetStatusSummary(c *gin.Context) {
	eventID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid event id")
		return
	}

	dojoID, err := uuid.Parse(c.Param("dojoId"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid dojo id")
		return
	}

	summary, err := h.participantService.GetStatusSummary(c.Request.Context(), eventID, dojoID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "failed to fetch status summary")
		return
	}

	response.Success(c, http.StatusOK, "status summary retrieved", summary)
}

// UploadDocument handles POST /api/v1/participants/:participantId/documents
// Uploads a document for a participant
func (h *ParticipantHandler) UploadDocument(c *gin.Context) {
	participantID, err := uuid.Parse(c.Param("participantId"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid participant id")
		return
	}

	documentType := c.PostForm("document_type")
	if documentType == "" {
		response.Error(c, http.StatusBadRequest, "document_type is required")
		return
	}

	// Get file from form
	file, err := c.FormFile("file")
	if err != nil {
		response.Error(c, http.StatusBadRequest, "file is required")
		return
	}

	if err := validateDocumentMIME(file); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	safeFilename := filepath.Base(file.Filename)
	relativePath := filepath.Join("uploads", "participants", participantID.String(), safeFilename)
	if err := os.MkdirAll(filepath.Dir(relativePath), 0o755); err != nil {
		response.Error(c, http.StatusInternalServerError, "failed to prepare upload directory")
		return
	}

	if err := c.SaveUploadedFile(file, relativePath); err != nil {
		response.Error(c, http.StatusInternalServerError, "failed to save file")
		return
	}

	storedPath := "/" + strings.ReplaceAll(relativePath, string(filepath.Separator), "/")

	input := models.UploadParticipantDocumentInput{
		ParticipantID: participantID,
		DocumentType:  documentType,
		FilePath:      storedPath,
	}

	doc, err := h.participantService.CreateDocument(c.Request.Context(), input)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(c, http.StatusCreated, "document uploaded", doc)
}

// UploadRecommendationLetter handles POST /api/v1/events/:id/dojos/:dojoId/recommendation-letter
// Uploads a recommendation letter from a dojo for an event
func (h *ParticipantHandler) UploadRecommendationLetter(c *gin.Context) {
	eventID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid event id")
		return
	}

	dojoID, err := uuid.Parse(c.Param("dojoId"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid dojo id")
		return
	}

	// Get file from form
	file, err := c.FormFile("file")
	if err != nil {
		response.Error(c, http.StatusBadRequest, "file is required")
		return
	}

	if err := validateDocumentMIME(file); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	safeFilename := filepath.Base(file.Filename)
	relativePath := filepath.Join("uploads", "recommendation_letters", eventID.String(), dojoID.String(), safeFilename)
	if err := os.MkdirAll(filepath.Dir(relativePath), 0o755); err != nil {
		response.Error(c, http.StatusInternalServerError, "failed to prepare upload directory")
		return
	}

	if err := c.SaveUploadedFile(file, relativePath); err != nil {
		response.Error(c, http.StatusInternalServerError, "failed to save file")
		return
	}

	storedPath := "/" + strings.ReplaceAll(relativePath, string(filepath.Separator), "/")

	input := models.UploadRecommendationLetterInput{
		DojoID:   dojoID,
		EventID:  eventID,
		FilePath: storedPath,
	}

	letter, err := h.participantService.CreateRecommendationLetter(c.Request.Context(), input)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(c, http.StatusCreated, "recommendation letter uploaded", letter)
}

// UploadRegistrationPayment handles POST /api/v1/events/:id/dojos/:dojoId/registration-payment
// Uploads registration payment proof from a dojo for an event.
func (h *ParticipantHandler) UploadRegistrationPayment(c *gin.Context) {
	eventID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid event id")
		return
	}

	dojoID, err := uuid.Parse(c.Param("dojoId"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid dojo id")
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		response.Error(c, http.StatusBadRequest, "file is required")
		return
	}

	if err := validateDocumentMIME(file); err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	safeFilename := filepath.Base(file.Filename)
	relativePath := filepath.Join("uploads", "registration_payments", eventID.String(), dojoID.String(), safeFilename)
	if err := os.MkdirAll(filepath.Dir(relativePath), 0o755); err != nil {
		response.Error(c, http.StatusInternalServerError, "failed to prepare upload directory")
		return
	}

	if err := c.SaveUploadedFile(file, relativePath); err != nil {
		response.Error(c, http.StatusInternalServerError, "failed to save file")
		return
	}

	storedPath := "/" + strings.ReplaceAll(relativePath, string(filepath.Separator), "/")

	input := models.UploadRegistrationPaymentInput{
		DojoID:   dojoID,
		EventID:  eventID,
		FilePath: storedPath,
	}

	payment, err := h.participantService.CreateRegistrationPayment(c.Request.Context(), input)
	if err != nil {
		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(c, http.StatusCreated, "registration payment uploaded", payment)
}

// GetRecommendationLetter handles GET /api/v1/events/:id/dojos/:dojoId/recommendation-letter
// Returns persisted recommendation letter for a dojo and event.
func (h *ParticipantHandler) GetRecommendationLetter(c *gin.Context) {
	eventID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid event id")
		return
	}

	dojoID, err := uuid.Parse(c.Param("dojoId"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid dojo id")
		return
	}

	letter, err := h.participantService.GetRecommendationLetter(c.Request.Context(), eventID, dojoID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "failed to fetch recommendation letter")
		return
	}

	if letter == nil {
		response.Success(c, http.StatusOK, "recommendation letter not found", nil)
		return
	}

	response.Success(c, http.StatusOK, "recommendation letter retrieved", letter)
}

// GetRegistrationPayment handles GET /api/v1/events/:id/dojos/:dojoId/registration-payment
// Returns persisted registration payment proof for a dojo and event.
func (h *ParticipantHandler) GetRegistrationPayment(c *gin.Context) {
	eventID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid event id")
		return
	}

	dojoID, err := uuid.Parse(c.Param("dojoId"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid dojo id")
		return
	}

	payment, err := h.participantService.GetRegistrationPayment(c.Request.Context(), eventID, dojoID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "failed to fetch registration payment")
		return
	}

	if payment == nil {
		response.Success(c, http.StatusOK, "registration payment not found", nil)
		return
	}

	response.Success(c, http.StatusOK, "registration payment retrieved", payment)
}

// DeleteParticipant handles DELETE /api/v1/events/:id/dojos/:dojoId/participants/:participantId
// Deletes one participant if dojo registration has not been approved.
func (h *ParticipantHandler) DeleteParticipant(c *gin.Context) {
	eventID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid event id")
		return
	}

	dojoID, err := uuid.Parse(c.Param("dojoId"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid dojo id")
		return
	}

	participantID, err := uuid.Parse(c.Param("participantId"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid participant id")
		return
	}

	err = h.participantService.DeleteParticipantFromDojoRegistration(c.Request.Context(), eventID, dojoID, participantID)
	if err != nil {
		if strings.Contains(err.Error(), "already approved") {
			response.Error(c, http.StatusConflict, err.Error())
			return
		}

		if strings.Contains(err.Error(), "not found") {
			response.Error(c, http.StatusNotFound, err.Error())
			return
		}

		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(c, http.StatusOK, "participant deleted", gin.H{})
}

// UpdateParticipantStatus handles PUT /api/v1/events/:id/dojos/:dojoId/participants/:participantId/status
// Updates one participant approval status.
func (h *ParticipantHandler) UpdateParticipantStatus(c *gin.Context) {
	eventID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid event id")
		return
	}

	dojoID, err := uuid.Parse(c.Param("dojoId"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid dojo id")
		return
	}

	participantID, err := uuid.Parse(c.Param("participantId"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid participant id")
		return
	}

	var req updateParticipantStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "invalid request body")
		return
	}

	participant, err := h.participantService.UpdateParticipantStatusByDojo(
		c.Request.Context(),
		eventID,
		dojoID,
		participantID,
		req.Status,
	)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			response.Error(c, http.StatusNotFound, err.Error())
			return
		}

		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(c, http.StatusOK, "participant status updated", participant)
}

// UpdateRecommendationLetterStatus handles PUT /api/v1/events/:id/dojos/:dojoId/recommendation-letter/status
// Updates the approval status of a recommendation letter.
func (h *ParticipantHandler) UpdateRecommendationLetterStatus(c *gin.Context) {
	eventID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid event id")
		return
	}

	dojoID, err := uuid.Parse(c.Param("dojoId"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid dojo id")
		return
	}

	var req updateParticipantStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "invalid request body")
		return
	}

	letter, err := h.participantService.UpdateRecommendationLetterStatus(
		c.Request.Context(),
		eventID,
		dojoID,
		req.Status,
	)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			response.Error(c, http.StatusNotFound, err.Error())
			return
		}

		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(c, http.StatusOK, "recommendation letter status updated", letter)
}

// UpdateRegistrationPaymentStatus handles PUT /api/v1/events/:id/dojos/:dojoId/registration-payment/status
// Updates the approval status of a registration payment proof.
func (h *ParticipantHandler) UpdateRegistrationPaymentStatus(c *gin.Context) {
	eventID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid event id")
		return
	}

	dojoID, err := uuid.Parse(c.Param("dojoId"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid dojo id")
		return
	}

	var req updateParticipantStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.Error(c, http.StatusBadRequest, "invalid request body")
		return
	}

	payment, err := h.participantService.UpdateRegistrationPaymentStatus(
		c.Request.Context(),
		eventID,
		dojoID,
		req.Status,
	)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			response.Error(c, http.StatusNotFound, err.Error())
			return
		}

		response.Error(c, http.StatusBadRequest, err.Error())
		return
	}

	response.Success(c, http.StatusOK, "registration payment status updated", payment)
}

// DeleteDojoRegistration handles DELETE /api/v1/events/:id/dojos/:dojoId/registration
// Deletes all dojo-level registration data if overall registration is not approved yet.
func (h *ParticipantHandler) DeleteDojoRegistration(c *gin.Context) {
	eventID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid event id")
		return
	}

	dojoID, err := uuid.Parse(c.Param("dojoId"))
	if err != nil {
		response.Error(c, http.StatusBadRequest, "invalid dojo id")
		return
	}

	result, err := h.participantService.DeleteDojoRegistration(c.Request.Context(), eventID, dojoID)
	if err != nil {
		if strings.Contains(err.Error(), "already approved") {
			response.Error(c, http.StatusConflict, err.Error())
			return
		}

		response.Error(c, http.StatusInternalServerError, err.Error())
		return
	}

	response.Success(c, http.StatusOK, "dojo registration deleted", result)
}

// validateDocumentMIME reads the first 512 bytes of an uploaded file and rejects
// anything that is not a PDF or a supported image type (JPEG, PNG).
func validateDocumentMIME(file *multipart.FileHeader) error {
	f, err := file.Open()
	if err != nil {
		return fmt.Errorf("unable to open file")
	}
	defer f.Close()

	buf := make([]byte, 512)
	n, err := io.ReadAtLeast(f, buf, 1)
	if err != nil {
		return fmt.Errorf("unable to read file")
	}

	mime := http.DetectContentType(buf[:n])
	switch mime {
	case "application/pdf", "image/jpeg", "image/png":
		return nil
	default:
		return fmt.Errorf("file type not allowed: only PDF, JPEG, and PNG are accepted")
	}
}
