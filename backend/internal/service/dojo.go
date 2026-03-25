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
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/chai2010/webp"
	"github.com/google/uuid"
	_ "golang.org/x/image/webp"

	"eo-karate/internal/db"
	"eo-karate/internal/models"
	"eo-karate/internal/utils"
)

const (
	maxDojoLogoSizeBytes = 5 * 1024 * 1024
)

var allowedDojoLogoExt = map[string]bool{
	".jpg":  true,
	".jpeg": true,
	".png":  true,
	".webp": true,
	".gif":  true,
}

// DojoService contains business logic for dojo operations
type DojoService struct {
	dojoDB    *db.DojoDB
	uploadDir string
}

// NewDojoService creates a new DojoService instance
func NewDojoService(dojoDB *db.DojoDB, uploadDir string) *DojoService {
	uploadDir = strings.TrimSpace(uploadDir)
	if uploadDir == "" {
		uploadDir = defaultUploadDir
	}

	return &DojoService{dojoDB: dojoDB, uploadDir: uploadDir}
}

// Create creates dojo record
func (s *DojoService) Create(ctx context.Context, input models.CreateDojoInput) (*models.Dojo, error) {
	input.Name = strings.TrimSpace(input.Name)
	if input.Name == "" {
		return nil, fmt.Errorf("name is required")
	}

	if input.LogoFile == nil {
		return nil, fmt.Errorf("logo is required")
	}

	logoURL, logoPath, err := s.saveLogo(input.LogoFile)
	if err != nil {
		return nil, err
	}

	dojo, err := s.dojoDB.Create(ctx, input, logoURL)
	if err != nil {
		_ = os.Remove(logoPath)
		return nil, err
	}

	return dojo, nil
}

// Update updates dojo record
func (s *DojoService) Update(ctx context.Context, id uuid.UUID, input models.UpdateDojoInput) (*models.Dojo, error) {
	existingDojo, err := s.dojoDB.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	input.Name = strings.TrimSpace(input.Name)
	if input.Name == "" {
		return nil, fmt.Errorf("name is required")
	}

	logoURL := existingDojo.LogoURL
	newLogoPath := ""
	oldLogoPath := ""

	if input.LogoFile != nil {
		logoURL, newLogoPath, err = s.saveLogo(input.LogoFile)
		if err != nil {
			return nil, err
		}

		oldLogoPath = s.resolveUploadFilePath(existingDojo.LogoURL)
	}

	dojo, err := s.dojoDB.Update(ctx, id, input, logoURL)
	if err != nil {
		if newLogoPath != "" {
			_ = os.Remove(newLogoPath)
		}
		return nil, err
	}

	if oldLogoPath != "" && newLogoPath != "" {
		_ = os.Remove(oldLogoPath)
	}

	return dojo, nil
}

// Delete deletes dojo record
func (s *DojoService) Delete(ctx context.Context, id uuid.UUID) error {
	dojo, err := s.dojoDB.GetByID(ctx, id)
	if err != nil {
		return err
	}

	if err := s.dojoDB.Delete(ctx, id); err != nil {
		return err
	}

	logoPath := s.resolveUploadFilePath(dojo.LogoURL)
	if logoPath != "" {
		_ = os.Remove(logoPath)
	}

	return nil
}

// GetByID retrieves dojo detail
func (s *DojoService) GetByID(ctx context.Context, id uuid.UUID) (*models.Dojo, error) {
	return s.dojoDB.GetByID(ctx, id)
}

// List retrieves dojos with pagination
func (s *DojoService) List(ctx context.Context, query models.PaginationQuery) (*models.DojoListResult, error) {
	query = utils.NormalizePageRequest(query)
	if !utils.IsValidDirection(query.Direction) {
		return nil, models.ErrInvalidDirection
	}

	return s.dojoDB.List(ctx, query)
}

func (s *DojoService) saveLogo(fileHeader *multipart.FileHeader) (string, string, error) {
	if fileHeader.Size > maxDojoLogoSizeBytes {
		return "", "", fmt.Errorf("logo max size is %d MB", maxDojoLogoSizeBytes/(1024*1024))
	}

	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if !allowedDojoLogoExt[ext] {
		return "", "", fmt.Errorf("logo file format is not allowed")
	}

	file, err := fileHeader.Open()
	if err != nil {
		return "", "", fmt.Errorf("open logo file: %w", err)
	}
	defer file.Close()

	rawBytes, err := io.ReadAll(io.LimitReader(file, maxDojoLogoSizeBytes+1))
	if err != nil {
		return "", "", fmt.Errorf("read logo file: %w", err)
	}

	if len(rawBytes) > maxDojoLogoSizeBytes {
		return "", "", fmt.Errorf("logo max size is %d MB", maxDojoLogoSizeBytes/(1024*1024))
	}

	detectedType := http.DetectContentType(rawBytes)
	if !strings.HasPrefix(detectedType, "image/") {
		return "", "", fmt.Errorf("logo must be an image")
	}

	decodedImage, _, err := image.Decode(bytes.NewReader(rawBytes))
	if err != nil {
		return "", "", fmt.Errorf("logo image is invalid")
	}

	logosDir := filepath.Join(s.uploadDir, "dojos", "logos")
	if err := os.MkdirAll(logosDir, 0o755); err != nil {
		return "", "", fmt.Errorf("create logo directory: %w", err)
	}

	fileName := fmt.Sprintf("%s.webp", uuid.NewString())
	absolutePath := filepath.Join(logosDir, fileName)

	outFile, err := os.Create(absolutePath)
	if err != nil {
		return "", "", fmt.Errorf("create logo file: %w", err)
	}
	defer outFile.Close()

	if err := webp.Encode(outFile, decodedImage, &webp.Options{Quality: 85}); err != nil {
		return "", "", fmt.Errorf("encode logo to webp: %w", err)
	}

	return path.Join("/uploads", "dojos", "logos", fileName), absolutePath, nil
}

func (s *DojoService) resolveUploadFilePath(fileURL string) string {
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
