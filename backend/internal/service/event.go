package service

import (
	"bytes"
	"context"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"mime/multipart"
	"net/http"
	"net/mail"
	"os"
	"path"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/chai2010/webp"
	"github.com/google/uuid"
	_ "golang.org/x/image/webp"

	"eo-karate/internal/db"
	"eo-karate/internal/models"
	"eo-karate/internal/utils"
)

const (
	defaultUploadDir       = "uploads"
	maxBannerSizeBytes     = 8 * 1024 * 1024
	maxAttachmentSizeBytes = 20 * 1024 * 1024
	maxAttachmentCount     = 10
)

var (
	slugPattern           = regexp.MustCompile(`[^a-z0-9]+`)
	attachmentNamePattern = regexp.MustCompile(`[^a-zA-Z0-9._-]+`)
	allowedBannerExt      = map[string]bool{".jpg": true, ".jpeg": true, ".png": true, ".webp": true, ".gif": true}
	allowedAttachmentExt  = map[string]bool{".pdf": true, ".doc": true, ".docx": true, ".xls": true, ".xlsx": true, ".ppt": true, ".pptx": true, ".txt": true, ".csv": true, ".zip": true, ".rar": true, ".7z": true, ".jpg": true, ".jpeg": true, ".png": true, ".webp": true}
	allowedAttachmentMIME = map[string]bool{"application/pdf": true, "application/msword": true, "application/vnd.openxmlformats-officedocument.wordprocessingml.document": true, "application/vnd.ms-excel": true, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": true, "application/vnd.ms-powerpoint": true, "application/vnd.openxmlformats-officedocument.presentationml.presentation": true, "text/plain": true, "text/csv": true, "application/csv": true, "application/zip": true, "application/x-zip-compressed": true, "application/vnd.rar": true, "application/x-rar-compressed": true, "application/x-7z-compressed": true, "image/jpeg": true, "image/png": true, "image/webp": true}
	allowedConfigStatuses = map[string]bool{"draft": true, "published": true, "archived": true}
)

// EventService contains business logic for event operations
type EventService struct {
	eventDB   *db.EventDB
	uploadDir string
}

// NewEventService creates a new EventService instance
func NewEventService(eventDB *db.EventDB, uploadDir string) *EventService {
	uploadDir = strings.TrimSpace(uploadDir)
	if uploadDir == "" {
		uploadDir = defaultUploadDir
	}

	return &EventService{eventDB: eventDB, uploadDir: uploadDir}
}

// Create creates a new event with validation
func (s *EventService) Create(ctx context.Context, input models.CreateEventInput) (*models.Event, error) {
	input.Name = strings.TrimSpace(input.Name)
	input.Slug = normalizeSlug(input.Slug)
	input.Description = strings.TrimSpace(input.Description)
	input.Organizer.Name = strings.TrimSpace(input.Organizer.Name)
	input.Organizer.Email = strings.TrimSpace(strings.ToLower(input.Organizer.Email))
	input.Location.Name = strings.TrimSpace(input.Location.Name)
	input.Location.Address = strings.TrimSpace(input.Location.Address)
	input.Location.City = strings.TrimSpace(input.Location.City)
	input.Config.Status = strings.ToLower(strings.TrimSpace(input.Config.Status))

	if input.Name == "" {
		return nil, fmt.Errorf("name is required")
	}

	if input.Slug == "" {
		input.Slug = normalizeSlug(input.Name)
	}

	if input.Slug == "" {
		return nil, fmt.Errorf("slug is required")
	}

	if input.Time.StartAt.IsZero() || input.Time.EndAt.IsZero() || input.Time.RegistrationDeadline.IsZero() {
		return nil, fmt.Errorf("time.start_at, time.end_at, and time.registration_deadline are required")
	}

	if !input.Time.EndAt.After(input.Time.StartAt) {
		return nil, fmt.Errorf("time.end_at must be after time.start_at")
	}

	if input.Time.RegistrationDeadline.After(input.Time.StartAt) {
		return nil, fmt.Errorf("time.registration_deadline must be before or equal to time.start_at")
	}

	if input.Time.StartAt.Before(time.Now()) {
		return nil, fmt.Errorf("time.start_at must be in the future")
	}

	if input.Organizer.Name == "" {
		return nil, fmt.Errorf("organizer.name is required")
	}

	if _, err := mail.ParseAddress(input.Organizer.Email); err != nil {
		return nil, fmt.Errorf("organizer.email is invalid")
	}

	if input.Location.Name == "" || input.Location.Address == "" || input.Location.City == "" {
		return nil, fmt.Errorf("location.name, location.address, and location.city are required")
	}

	if input.Config.Status == "" {
		input.Config.Status = "draft"
	}

	if !allowedConfigStatuses[input.Config.Status] {
		return nil, fmt.Errorf("config.status must be one of: draft, published, archived")
	}

	if input.Config.MaxParticipants < 0 {
		return nil, fmt.Errorf("config.max_participants cannot be negative")
	}

	if input.BannerFile == nil {
		return nil, fmt.Errorf("banner is required")
	}

	if len(input.Attachments) > maxAttachmentCount {
		return nil, fmt.Errorf("attachments limit exceeded, maximum is %d files", maxAttachmentCount)
	}

	bannerURL, bannerPath, err := s.saveBanner(input.BannerFile)
	if err != nil {
		return nil, err
	}

	attachments, attachmentPaths, err := s.saveAttachments(input.Attachments)
	if err != nil {
		_ = os.Remove(bannerPath)
		return nil, err
	}

	event, err := s.eventDB.Create(ctx, input, bannerURL, attachments)
	if err != nil {
		_ = os.Remove(bannerPath)
		for _, attachmentPath := range attachmentPaths {
			_ = os.Remove(attachmentPath)
		}
		return nil, err
	}

	return event, nil
}

// Update updates an event with validation
func (s *EventService) Update(ctx context.Context, id uuid.UUID, input models.UpdateEventInput) (*models.Event, error) {
	existingEvent, err := s.eventDB.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	input.Name = strings.TrimSpace(input.Name)
	input.Slug = normalizeSlug(input.Slug)
	input.Description = strings.TrimSpace(input.Description)
	input.Organizer.Name = strings.TrimSpace(input.Organizer.Name)
	input.Organizer.Email = strings.TrimSpace(strings.ToLower(input.Organizer.Email))
	input.Location.Name = strings.TrimSpace(input.Location.Name)
	input.Location.Address = strings.TrimSpace(input.Location.Address)
	input.Location.City = strings.TrimSpace(input.Location.City)
	input.Config.Status = strings.ToLower(strings.TrimSpace(input.Config.Status))

	if input.Name == "" {
		return nil, fmt.Errorf("name is required")
	}

	if input.Slug == "" {
		input.Slug = normalizeSlug(input.Name)
	}

	if input.Slug == "" {
		return nil, fmt.Errorf("slug is required")
	}

	if input.Time.StartAt.IsZero() || input.Time.EndAt.IsZero() || input.Time.RegistrationDeadline.IsZero() {
		return nil, fmt.Errorf("time.start_at, time.end_at, and time.registration_deadline are required")
	}

	if !input.Time.EndAt.After(input.Time.StartAt) {
		return nil, fmt.Errorf("time.end_at must be after time.start_at")
	}

	if input.Time.RegistrationDeadline.After(input.Time.StartAt) {
		return nil, fmt.Errorf("time.registration_deadline must be before or equal to time.start_at")
	}

	if input.Organizer.Name == "" {
		return nil, fmt.Errorf("organizer.name is required")
	}

	if _, err := mail.ParseAddress(input.Organizer.Email); err != nil {
		return nil, fmt.Errorf("organizer.email is invalid")
	}

	if input.Location.Name == "" || input.Location.Address == "" || input.Location.City == "" {
		return nil, fmt.Errorf("location.name, location.address, and location.city are required")
	}

	if input.Config.Status == "" {
		input.Config.Status = "draft"
	}

	if !allowedConfigStatuses[input.Config.Status] {
		return nil, fmt.Errorf("config.status must be one of: draft, published, archived")
	}

	if input.Config.MaxParticipants < 0 {
		return nil, fmt.Errorf("config.max_participants cannot be negative")
	}

	if len(input.Attachments) > maxAttachmentCount {
		return nil, fmt.Errorf("attachments limit exceeded, maximum is %d files", maxAttachmentCount)
	}

	bannerURL := existingEvent.BannerURL
	newBannerPath := ""
	oldBannerPath := ""

	if input.BannerFile != nil {
		var saveBannerErr error
		bannerURL, newBannerPath, saveBannerErr = s.saveBanner(input.BannerFile)
		if saveBannerErr != nil {
			return nil, saveBannerErr
		}

		oldBannerPath = s.resolveUploadFilePath(existingEvent.BannerURL)
	}

	attachments := existingEvent.Attachments
	newAttachmentPaths := []string{}
	oldAttachmentPaths := []string{}

	if len(input.Attachments) > 0 {
		var saveAttachmentsErr error
		attachments, newAttachmentPaths, saveAttachmentsErr = s.saveAttachments(input.Attachments)
		if saveAttachmentsErr != nil {
			if newBannerPath != "" {
				_ = os.Remove(newBannerPath)
			}
			return nil, saveAttachmentsErr
		}

		oldAttachmentPaths = s.collectAttachmentPaths(existingEvent.Attachments)
	}

	event, err := s.eventDB.Update(ctx, id, input, bannerURL, attachments)
	if err != nil {
		if newBannerPath != "" {
			_ = os.Remove(newBannerPath)
		}
		cleanupFiles(newAttachmentPaths)
		return nil, err
	}

	if oldBannerPath != "" && newBannerPath != "" {
		_ = os.Remove(oldBannerPath)
	}

	if len(oldAttachmentPaths) > 0 && len(newAttachmentPaths) > 0 {
		cleanupFiles(oldAttachmentPaths)
	}

	return event, nil
}

// Delete deletes an event and cleans up uploaded files
func (s *EventService) Delete(ctx context.Context, id uuid.UUID) error {
	event, err := s.eventDB.GetByID(ctx, id)
	if err != nil {
		return err
	}

	if err := s.eventDB.Delete(ctx, id); err != nil {
		return err
	}

	paths := make([]string, 0, 1+len(event.Attachments))
	bannerPath := s.resolveUploadFilePath(event.BannerURL)
	if bannerPath != "" {
		paths = append(paths, bannerPath)
	}

	paths = append(paths, s.collectAttachmentPaths(event.Attachments)...)
	cleanupFiles(paths)

	return nil
}

func (s *EventService) saveBanner(fileHeader *multipart.FileHeader) (string, string, error) {
	if fileHeader.Size > maxBannerSizeBytes {
		return "", "", fmt.Errorf("banner max size is %d MB", maxBannerSizeBytes/(1024*1024))
	}

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if !allowedBannerExt[ext] {
		return "", "", fmt.Errorf("banner file format is not allowed")
	}

	file, err := fileHeader.Open()
	if err != nil {
		return "", "", fmt.Errorf("open banner file: %w", err)
	}
	defer file.Close()

	rawBytes, err := io.ReadAll(io.LimitReader(file, maxBannerSizeBytes+1))
	if err != nil {
		return "", "", fmt.Errorf("read banner file: %w", err)
	}

	if len(rawBytes) > maxBannerSizeBytes {
		return "", "", fmt.Errorf("banner max size is %d MB", maxBannerSizeBytes/(1024*1024))
	}

	detectedType := http.DetectContentType(rawBytes)
	if !strings.HasPrefix(detectedType, "image/") {
		return "", "", fmt.Errorf("banner must be an image")
	}

	decodedImage, _, err := image.Decode(bytes.NewReader(rawBytes))
	if err != nil {
		return "", "", fmt.Errorf("banner image is invalid")
	}

	bannersDir := filepath.Join(s.uploadDir, "events", "banners")
	if err := os.MkdirAll(bannersDir, 0o755); err != nil {
		return "", "", fmt.Errorf("create banner directory: %w", err)
	}

	fileName := fmt.Sprintf("%s.webp", uuid.NewString())
	absolutePath := filepath.Join(bannersDir, fileName)

	outFile, err := os.Create(absolutePath)
	if err != nil {
		return "", "", fmt.Errorf("create banner file: %w", err)
	}
	defer outFile.Close()

	if err := webp.Encode(outFile, decodedImage, &webp.Options{Quality: 85}); err != nil {
		return "", "", fmt.Errorf("encode banner to webp: %w", err)
	}

	return path.Join("/uploads", "events", "banners", fileName), absolutePath, nil
}

func (s *EventService) saveAttachments(fileHeaders []*multipart.FileHeader) ([]models.EventAttachment, []string, error) {
	if len(fileHeaders) == 0 {
		return []models.EventAttachment{}, []string{}, nil
	}

	attachmentsDir := filepath.Join(s.uploadDir, "events", "attachments")
	if err := os.MkdirAll(attachmentsDir, 0o755); err != nil {
		return nil, nil, fmt.Errorf("create attachment directory: %w", err)
	}

	attachments := make([]models.EventAttachment, 0, len(fileHeaders))
	paths := make([]string, 0, len(fileHeaders))

	for _, fileHeader := range fileHeaders {
		if fileHeader == nil {
			continue
		}

		if fileHeader.Size > maxAttachmentSizeBytes {
			cleanupFiles(paths)
			return nil, nil, fmt.Errorf("attachment %s exceeds max size of %d MB", fileHeader.Filename, maxAttachmentSizeBytes/(1024*1024))
		}

		ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
		if !allowedAttachmentExt[ext] {
			cleanupFiles(paths)
			return nil, nil, fmt.Errorf("attachment format is not allowed: %s", fileHeader.Filename)
		}

		file, err := fileHeader.Open()
		if err != nil {
			cleanupFiles(paths)
			return nil, nil, fmt.Errorf("open attachment %s: %w", fileHeader.Filename, err)
		}

		rawBytes, err := io.ReadAll(io.LimitReader(file, maxAttachmentSizeBytes+1))
		_ = file.Close()
		if err != nil {
			cleanupFiles(paths)
			return nil, nil, fmt.Errorf("read attachment %s: %w", fileHeader.Filename, err)
		}

		if len(rawBytes) > maxAttachmentSizeBytes {
			cleanupFiles(paths)
			return nil, nil, fmt.Errorf("attachment %s exceeds max size of %d MB", fileHeader.Filename, maxAttachmentSizeBytes/(1024*1024))
		}

		detectedType := http.DetectContentType(rawBytes)
		if !isAllowedAttachmentType(ext, detectedType) {
			cleanupFiles(paths)
			return nil, nil, fmt.Errorf("attachment type is not allowed: %s", fileHeader.Filename)
		}

		safeName := sanitizeAttachmentName(strings.TrimSuffix(fileHeader.Filename, ext))
		fileName := fmt.Sprintf("%s-%s%s", safeName, uuid.NewString(), ext)
		absolutePath := filepath.Join(attachmentsDir, fileName)

		if err := os.WriteFile(absolutePath, rawBytes, 0o644); err != nil {
			cleanupFiles(paths)
			return nil, nil, fmt.Errorf("save attachment %s: %w", fileHeader.Filename, err)
		}

		paths = append(paths, absolutePath)
		attachments = append(attachments, models.EventAttachment{
			FileName:    fileHeader.Filename,
			FileURL:     path.Join("/uploads", "events", "attachments", fileName),
			ContentType: detectedType,
			Size:        int64(len(rawBytes)),
		})
	}

	return attachments, paths, nil
}

func isAllowedAttachmentType(ext, mimeType string) bool {
	if allowedAttachmentMIME[mimeType] {
		return true
	}

	if mimeType == "application/octet-stream" {
		return ext == ".doc" || ext == ".docx" || ext == ".xls" || ext == ".xlsx" || ext == ".ppt" || ext == ".pptx" || ext == ".zip" || ext == ".rar" || ext == ".7z"
	}

	if mimeType == "application/zip" || mimeType == "application/x-zip-compressed" {
		return ext == ".zip" || ext == ".docx" || ext == ".xlsx" || ext == ".pptx"
	}

	if strings.HasPrefix(mimeType, "text/") {
		return ext == ".txt" || ext == ".csv"
	}

	return false
}

func normalizeSlug(value string) string {
	normalized := strings.ToLower(strings.TrimSpace(value))
	normalized = slugPattern.ReplaceAllString(normalized, "-")
	normalized = strings.Trim(normalized, "-")
	if len(normalized) > 120 {
		normalized = strings.Trim(normalized[:120], "-")
	}

	return normalized
}

func sanitizeAttachmentName(value string) string {
	sanitized := strings.TrimSpace(value)
	if sanitized == "" {
		return "attachment"
	}

	sanitized = attachmentNamePattern.ReplaceAllString(sanitized, "-")
	sanitized = strings.Trim(sanitized, "-.")
	if sanitized == "" {
		return "attachment"
	}

	if len(sanitized) > 64 {
		sanitized = sanitized[:64]
	}

	return sanitized
}

func (s *EventService) collectAttachmentPaths(attachments []models.EventAttachment) []string {
	paths := make([]string, 0, len(attachments))
	for _, attachment := range attachments {
		resolvedPath := s.resolveUploadFilePath(attachment.FileURL)
		if resolvedPath != "" {
			paths = append(paths, resolvedPath)
		}
	}

	return paths
}

func (s *EventService) resolveUploadFilePath(fileURL string) string {
	trimmedURL := strings.TrimSpace(fileURL)
	if trimmedURL == "" || !strings.HasPrefix(trimmedURL, "/uploads/") {
		return ""
	}

	relativePath := strings.TrimPrefix(trimmedURL, "/uploads/")
	relativePath = strings.TrimLeft(relativePath, "/")
	if relativePath == "" {
		return ""
	}

	cleanedPath := filepath.Clean(relativePath)
	if cleanedPath == "." || strings.HasPrefix(cleanedPath, "..") {
		return ""
	}

	return filepath.Join(s.uploadDir, cleanedPath)
}

func cleanupFiles(paths []string) {
	for _, savedPath := range paths {
		_ = os.Remove(savedPath)
	}
}

// GetByID retrieves an event by ID
func (s *EventService) GetByID(ctx context.Context, id uuid.UUID) (*models.Event, error) {
	return s.eventDB.GetByID(ctx, id)
}

// List retrieves events with pagination
func (s *EventService) List(ctx context.Context, query models.PaginationQuery) (*models.EventListResult, error) {
	query = utils.NormalizePageRequest(query)
	if !utils.IsValidDirection(query.Direction) {
		return nil, models.ErrInvalidDirection
	}

	return s.eventDB.List(ctx, query)
}
