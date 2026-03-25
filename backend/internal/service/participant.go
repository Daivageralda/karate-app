package service

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"

	"eo-karate/internal/db"
	"eo-karate/internal/models"
)

const (
	defaultParticipantUploadDir = "uploads/events"
	participantExcelUploadDir   = "uploads/participants_excels"
	maxExcelSizeBytes           = 10 * 1024 * 1024 // 10MB
)

// ParticipantService contains business logic for participant operations
type ParticipantService struct {
	participantDB *db.ParticipantDB
	uploadDir     string
}

// NewParticipantService creates a new ParticipantService instance
func NewParticipantService(participantDB *db.ParticipantDB, uploadDir string) *ParticipantService {
	uploadDir = strings.TrimSpace(uploadDir)
	if uploadDir == "" {
		uploadDir = defaultParticipantUploadDir
	}

	return &ParticipantService{participantDB: participantDB, uploadDir: uploadDir}
}

// BulkCreateFromExcel parses Excel file and creates participants
func (s *ParticipantService) BulkCreateFromExcel(
	ctx context.Context,
	eventID, dojoID uuid.UUID,
	excelData []byte,
) ([]models.Participant, error) {
	if len(excelData) == 0 {
		return nil, fmt.Errorf("excel file is empty")
	}

	if len(excelData) > maxExcelSizeBytes {
		return nil, fmt.Errorf("excel file exceeds maximum size of %d MB", maxExcelSizeBytes/(1024*1024))
	}

	// Read Excel file
	f, err := excelize.OpenReader(bytes.NewReader(excelData))
	if err != nil {
		return nil, fmt.Errorf("open excel file: %w", err)
	}
	defer f.Close()

	// Get first sheet
	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, fmt.Errorf("excel file has no sheets")
	}

	sheetName := sheets[0]
	rows, err := f.GetRows(sheetName)
	if err != nil {
		return nil, fmt.Errorf("read excel rows: %w", err)
	}

	if len(rows) < 2 {
		return nil, fmt.Errorf("excel must have header row and at least one data row")
	}

	// Parse header row to get column indices
	headers := rows[0]
	colIdx := parseExcelHeaders(headers)

	// Validate required columns
	if !isValidColumnIndices(colIdx) {
		return nil, fmt.Errorf("excel missing required columns: nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin, berat_badan, kategori_tanding, kelas_tanding")
	}

	// Parse data rows
	var participantRows []models.ParticipantRow
	for i := 1; i < len(rows); i++ {
		row := rows[i]

		// Skip empty rows
		if len(row) == 0 || (len(row) > colIdx.NamaLengkap && strings.TrimSpace(row[colIdx.NamaLengkap]) == "") {
			continue
		}

		participantRow, err := parseExcelRow(row, colIdx)
		if err != nil {
			return nil, fmt.Errorf("parse row %d: %w", i+1, err)
		}

		participantRows = append(participantRows, participantRow)
	}

	if len(participantRows) == 0 {
		return nil, fmt.Errorf("no valid participant rows found in excel")
	}

	// Create in database
	participants, err := s.participantDB.CreateBulk(ctx, eventID, dojoID, participantRows)
	if err != nil {
		return nil, fmt.Errorf("create participants in db: %w", err)
	}

	return participants, nil
}

// CreateDocument creates a new participant document
func (s *ParticipantService) CreateDocument(
	ctx context.Context,
	input models.UploadParticipantDocumentInput,
) (*models.ParticipantDocument, error) {
	if input.ParticipantID == uuid.Nil {
		return nil, fmt.Errorf("participant_id is required")
	}

	if !isValidDocumentType(input.DocumentType) {
		return nil, fmt.Errorf("invalid document_type: must be surat_kesehatan or akta_kelahiran")
	}

	if strings.TrimSpace(input.FilePath) == "" {
		return nil, fmt.Errorf("file_path is required")
	}

	doc, err := s.participantDB.CreateDocument(ctx, input)
	if err != nil {
		return nil, err
	}

	return doc, nil
}

// CreateRecommendationLetter creates a new recommendation letter
func (s *ParticipantService) CreateRecommendationLetter(
	ctx context.Context,
	input models.UploadRecommendationLetterInput,
) (*models.DojoRecommendationLetter, error) {
	if input.DojoID == uuid.Nil {
		return nil, fmt.Errorf("dojo_id is required")
	}

	if input.EventID == uuid.Nil {
		return nil, fmt.Errorf("event_id is required")
	}

	if strings.TrimSpace(input.FilePath) == "" {
		return nil, fmt.Errorf("file_path is required")
	}

	letter, err := s.participantDB.CreateRecommendationLetter(ctx, input)
	if err != nil {
		return nil, err
	}

	return letter, nil
}

// GetRecommendationLetter returns recommendation letter for a dojo and event.
func (s *ParticipantService) GetRecommendationLetter(
	ctx context.Context,
	eventID, dojoID uuid.UUID,
) (*models.DojoRecommendationLetter, error) {
	if eventID == uuid.Nil {
		return nil, fmt.Errorf("event_id is required")
	}

	if dojoID == uuid.Nil {
		return nil, fmt.Errorf("dojo_id is required")
	}

	letter, err := s.participantDB.GetRecommendationLetter(ctx, dojoID, eventID)
	if err != nil {
		return nil, err
	}

	return letter, nil
}

// GetStatusSummary returns the status summary for an event
func (s *ParticipantService) GetStatusSummary(
	ctx context.Context,
	eventID, dojoID uuid.UUID,
) (*models.ParticipantStatusSummary, error) {
	if eventID == uuid.Nil {
		return nil, fmt.Errorf("event_id is required")
	}

	if dojoID == uuid.Nil {
		return nil, fmt.Errorf("dojo_id is required")
	}

	summary, err := s.participantDB.GetStatusSummary(ctx, eventID, dojoID)
	if err != nil {
		return nil, err
	}

	return summary, nil
}

// GetParticipants returns all participants for an event/dojo
func (s *ParticipantService) GetParticipants(
	ctx context.Context,
	eventID, dojoID uuid.UUID,
) ([]models.Participant, error) {
	if eventID == uuid.Nil {
		return nil, fmt.Errorf("event_id is required")
	}

	if dojoID == uuid.Nil {
		return nil, fmt.Errorf("dojo_id is required")
	}

	participants, err := s.participantDB.GetByEventAndDojo(ctx, eventID, dojoID)
	if err != nil {
		return nil, err
	}

	if participants == nil {
		participants = []models.Participant{}
	}

	return participants, nil
}

// ListEventRegistrationDojos returns dojo-level registration summaries for an event.
func (s *ParticipantService) ListEventRegistrationDojos(
	ctx context.Context,
	eventID uuid.UUID,
) ([]models.EventRegistrationDojo, error) {
	if eventID == uuid.Nil {
		return nil, fmt.Errorf("event_id is required")
	}

	items, err := s.participantDB.ListEventRegistrationDojos(ctx, eventID)
	if err != nil {
		return nil, err
	}

	if items == nil {
		items = []models.EventRegistrationDojo{}
	}

	return items, nil
}

// DeleteDojoRegistration deletes dojo registration data for an event if not approved yet.
func (s *ParticipantService) DeleteDojoRegistration(
	ctx context.Context,
	eventID, dojoID uuid.UUID,
) (*models.DeleteDojoRegistrationResult, error) {
	if eventID == uuid.Nil {
		return nil, fmt.Errorf("event_id is required")
	}

	if dojoID == uuid.Nil {
		return nil, fmt.Errorf("dojo_id is required")
	}

	result, err := s.participantDB.DeleteDojoRegistration(ctx, eventID, dojoID)
	if err != nil {
		return nil, err
	}

	return result, nil
}

// DeleteParticipantFromDojoRegistration deletes one participant if dojo registration is not approved.
func (s *ParticipantService) DeleteParticipantFromDojoRegistration(
	ctx context.Context,
	eventID, dojoID, participantID uuid.UUID,
) error {
	if eventID == uuid.Nil {
		return fmt.Errorf("event_id is required")
	}

	if dojoID == uuid.Nil {
		return fmt.Errorf("dojo_id is required")
	}

	if participantID == uuid.Nil {
		return fmt.Errorf("participant_id is required")
	}

	if err := s.participantDB.DeleteParticipantByDojo(ctx, eventID, dojoID, participantID); err != nil {
		return err
	}

	return nil
}

// UpdateRecommendationLetterStatus updates the status of a recommendation letter.
func (s *ParticipantService) UpdateRecommendationLetterStatus(
	ctx context.Context,
	eventID, dojoID uuid.UUID,
	status string,
) (*models.DojoRecommendationLetter, error) {
	if eventID == uuid.Nil {
		return nil, fmt.Errorf("event_id is required")
	}

	if dojoID == uuid.Nil {
		return nil, fmt.Errorf("dojo_id is required")
	}

	status = strings.ToLower(strings.TrimSpace(status))
	if status != models.DocumentStatusPending && status != models.DocumentStatusApproved {
		return nil, fmt.Errorf("status must be pending or approved")
	}

	letter, err := s.participantDB.UpdateRecommendationLetterStatus(ctx, eventID, dojoID, status)
	if err != nil {
		return nil, err
	}

	if letter == nil {
		return nil, fmt.Errorf("recommendation letter not found")
	}

	return letter, nil
}

// UpdateParticipantStatusByDojo updates one participant status in a dojo registration.
func (s *ParticipantService) UpdateParticipantStatusByDojo(
	ctx context.Context,
	eventID, dojoID, participantID uuid.UUID,
	status string,
) (*models.Participant, error) {
	if eventID == uuid.Nil {
		return nil, fmt.Errorf("event_id is required")
	}

	if dojoID == uuid.Nil {
		return nil, fmt.Errorf("dojo_id is required")
	}

	if participantID == uuid.Nil {
		return nil, fmt.Errorf("participant_id is required")
	}

	status = strings.ToLower(strings.TrimSpace(status))
	if status != models.ParticipantStatusPending && status != models.ParticipantStatusApproved {
		return nil, fmt.Errorf("status must be pending or approved")
	}

	participant, err := s.participantDB.UpdateParticipantStatusByDojo(ctx, eventID, dojoID, participantID, status)
	if err != nil {
		return nil, err
	}

	if participant == nil {
		return nil, fmt.Errorf("participant not found")
	}

	return participant, nil
}

// GenerateExcelTemplate generates a template Excel file for participants
func (s *ParticipantService) GenerateExcelTemplate() ([]byte, error) {
	f := excelize.NewFile()
	defer f.Close()

	// Set sheet name
	if err := f.SetSheetName("Sheet1", "Peserta"); err != nil {
		return nil, fmt.Errorf("set sheet name: %w", err)
	}

	// Add headers
	headers := []string{
		"Nama Lengkap",
		"Tempat Lahir",
		"Tanggal Lahir (YYYY-MM-DD)",
		"Jenis Kelamin (Laki-laki/Perempuan)",
		"Berat Badan (kg)",
		"Kategori Tanding (Kata/Kumite, comma-separated)",
		"Kelas Tanding (U-8/U-10/U-12/U-14/U-16/U-18/Adult, comma-separated)",
	}

	for i, header := range headers {
		colLetter := indexToColumn(i)
		cell := colLetter + "1"
		f.SetCellValue("Peserta", cell, header)
	}

	// Add example row
	example := []interface{}{
		"Adi Pratama",
		"Jakarta",
		"2010-05-15",
		"Laki-laki",
		65.5,
		"Kumite",
		"U-12",
	}

	for i, val := range example {
		colLetter := indexToColumn(i)
		cell := colLetter + "2"
		f.SetCellValue("Peserta", cell, val)
	}

	// Write to buffer
	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, fmt.Errorf("write excel file: %w", err)
	}

	return buf.Bytes(), nil
}

// SaveUploadedParticipantsExcel stores the raw uploaded participants Excel file on disk.
func (s *ParticipantService) SaveUploadedParticipantsExcel(
	eventID, dojoID uuid.UUID,
	originalName string,
	excelData []byte,
) error {
	if eventID == uuid.Nil {
		return fmt.Errorf("event_id is required")
	}

	if dojoID == uuid.Nil {
		return fmt.Errorf("dojo_id is required")
	}

	if len(excelData) == 0 {
		return fmt.Errorf("excel data is empty")
	}

	safeFileName := sanitizeUploadedFileName(originalName)
	timestamp := time.Now().UTC().Format("20060102-150405")
	finalFileName := fmt.Sprintf("%s-%s", timestamp, safeFileName)

	dirPath := filepath.Join(participantExcelUploadDir, eventID.String(), dojoID.String())
	if err := os.MkdirAll(dirPath, 0o755); err != nil {
		return fmt.Errorf("create excel upload directory: %w", err)
	}

	fullPath := filepath.Join(dirPath, finalFileName)
	if err := os.WriteFile(fullPath, excelData, 0o644); err != nil {
		return fmt.Errorf("save uploaded excel: %w", err)
	}

	return nil
}

// GetLatestUploadedParticipantsExcelPreview returns preview data for the latest uploaded participants Excel file.
func (s *ParticipantService) GetLatestUploadedParticipantsExcelPreview(
	eventID, dojoID uuid.UUID,
	maxRows int,
) (*models.UploadedParticipantsExcelPreview, error) {
	if eventID == uuid.Nil {
		return nil, fmt.Errorf("event_id is required")
	}

	if dojoID == uuid.Nil {
		return nil, fmt.Errorf("dojo_id is required")
	}

	if maxRows <= 0 {
		maxRows = 8
	}

	dirPath := filepath.Join(participantExcelUploadDir, eventID.String(), dojoID.String())
	entries, err := os.ReadDir(dirPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, nil
		}
		return nil, fmt.Errorf("read excel upload directory: %w", err)
	}

	type fileCandidate struct {
		name    string
		path    string
		modTime time.Time
	}

	var candidates []fileCandidate
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}

		name := entry.Name()
		lower := strings.ToLower(name)
		if !strings.HasSuffix(lower, ".xlsx") && !strings.HasSuffix(lower, ".xls") {
			continue
		}

		info, infoErr := entry.Info()
		if infoErr != nil {
			continue
		}

		candidates = append(candidates, fileCandidate{
			name:    name,
			path:    filepath.Join(dirPath, name),
			modTime: info.ModTime(),
		})
	}

	if len(candidates) == 0 {
		return nil, nil
	}

	sort.Slice(candidates, func(i, j int) bool {
		return candidates[i].modTime.After(candidates[j].modTime)
	})

	latest := candidates[0]
	fileBytes, err := os.ReadFile(latest.path)
	if err != nil {
		return nil, fmt.Errorf("read latest uploaded excel: %w", err)
	}

	headers, rows, err := parseExcelPreview(fileBytes, maxRows)
	if err != nil {
		return nil, fmt.Errorf("parse latest uploaded excel preview: %w", err)
	}

	return &models.UploadedParticipantsExcelPreview{
		FileName:   latest.name,
		Headers:    headers,
		Rows:       rows,
		UploadedAt: latest.modTime,
	}, nil
}

// Helpers

func sanitizeUploadedFileName(name string) string {
	safeName := strings.TrimSpace(filepath.Base(name))
	if safeName == "" {
		return "participants-upload.xlsx"
	}

	replacer := strings.NewReplacer(" ", "-", "..", "", "/", "", "\\", "")
	safeName = replacer.Replace(safeName)
	if safeName == "" {
		return "participants-upload.xlsx"
	}

	return safeName
}

func parseExcelPreview(excelData []byte, maxRows int) ([]string, [][]string, error) {
	f, err := excelize.OpenReader(bytes.NewReader(excelData))
	if err != nil {
		return nil, nil, fmt.Errorf("open excel file: %w", err)
	}
	defer f.Close()

	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, nil, fmt.Errorf("excel file has no sheets")
	}

	rows, err := f.GetRows(sheets[0])
	if err != nil {
		return nil, nil, fmt.Errorf("read excel rows: %w", err)
	}

	if len(rows) == 0 {
		return []string{}, [][]string{}, nil
	}

	firstRow := rows[0]
	headers := make([]string, len(firstRow))
	for idx, value := range firstRow {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			headers[idx] = fmt.Sprintf("Kolom %d", idx+1)
			continue
		}
		headers[idx] = trimmed
	}

	previewRows := make([][]string, 0, maxRows)
	for i := 1; i < len(rows); i++ {
		row := rows[i]
		hasValue := false
		for _, value := range row {
			if strings.TrimSpace(value) != "" {
				hasValue = true
				break
			}
		}

		if !hasValue {
			continue
		}

		normalized := make([]string, len(headers))
		for idx := range headers {
			if idx < len(row) {
				normalized[idx] = row[idx]
			}
		}

		previewRows = append(previewRows, normalized)
		if len(previewRows) >= maxRows {
			break
		}
	}

	return headers, previewRows, nil
}

type excelColumnIndex struct {
	NamaLengkap     int
	TempatLahir     int
	TanggalLahir    int
	JenisKelamin    int
	BeratBadan      int
	KategoriTanding int
	KelasTanding    int
}

func parseExcelHeaders(headers []string) excelColumnIndex {
	idx := excelColumnIndex{
		NamaLengkap:     -1,
		TempatLahir:     -1,
		TanggalLahir:    -1,
		JenisKelamin:    -1,
		BeratBadan:      -1,
		KategoriTanding: -1,
		KelasTanding:    -1,
	}

	for i, header := range headers {
		h := strings.ToLower(strings.TrimSpace(header))
		switch {
		case strings.Contains(h, "nama"):
			idx.NamaLengkap = i
		case strings.Contains(h, "tempat"):
			idx.TempatLahir = i
		case strings.Contains(h, "tanggal"):
			idx.TanggalLahir = i
		case strings.Contains(h, "jenis") || strings.Contains(h, "kelamin"):
			idx.JenisKelamin = i
		case strings.Contains(h, "berat"):
			idx.BeratBadan = i
		case strings.Contains(h, "kategori"):
			idx.KategoriTanding = i
		case strings.Contains(h, "kelas"):
			idx.KelasTanding = i
		}
	}

	return idx
}

func isValidColumnIndices(idx excelColumnIndex) bool {
	return idx.NamaLengkap >= 0 &&
		idx.TempatLahir >= 0 &&
		idx.TanggalLahir >= 0 &&
		idx.JenisKelamin >= 0 &&
		idx.BeratBadan >= 0 &&
		idx.KategoriTanding >= 0 &&
		idx.KelasTanding >= 0
}

func parseExcelRow(row []string, idx excelColumnIndex) (models.ParticipantRow, error) {
	pr := models.ParticipantRow{}

	// Get values with bounds checking
	pr.NamaLengkap = getValue(row, idx.NamaLengkap)
	pr.TempatLahir = getValue(row, idx.TempatLahir)
	pr.TanggalLahir = getValue(row, idx.TanggalLahir)
	pr.JenisKelamin = getValue(row, idx.JenisKelamin)

	// Validate tanggal_lahir format
	if _, err := time.Parse("2006-01-02", pr.TanggalLahir); err != nil {
		return pr, fmt.Errorf("invalid tanggal_lahir format: must be YYYY-MM-DD")
	}

	// Parse berat badan
	beratStr := getValue(row, idx.BeratBadan)
	berat, err := strconv.ParseFloat(beratStr, 64)
	if err != nil {
		return pr, fmt.Errorf("invalid berat_badan: %w", err)
	}
	pr.BeratBadan = berat

	// Parse kategori tanding
	kategoriStr := getValue(row, idx.KategoriTanding)
	pr.KategoriTanding = parseCommaSeparated(kategoriStr)

	// Parse kelas tanding
	kelasStr := getValue(row, idx.KelasTanding)
	pr.KelasTanding = parseCommaSeparated(kelasStr)

	// Validate required fields
	if pr.NamaLengkap == "" {
		return pr, fmt.Errorf("nama_lengkap is required")
	}
	if pr.TempatLahir == "" {
		return pr, fmt.Errorf("tempat_lahir is required")
	}
	if pr.TanggalLahir == "" {
		return pr, fmt.Errorf("tanggal_lahir is required")
	}
	if pr.JenisKelamin == "" {
		return pr, fmt.Errorf("jenis_kelamin is required")
	}
	if pr.BeratBadan <= 0 {
		return pr, fmt.Errorf("berat_badan must be greater than 0")
	}

	return pr, nil
}

func getValue(row []string, idx int) string {
	if idx < 0 || idx >= len(row) {
		return ""
	}
	return strings.TrimSpace(row[idx])
}

func parseCommaSeparated(s string) []string {
	s = strings.TrimSpace(s)
	if s == "" {
		return []string{}
	}

	parts := strings.Split(s, ",")
	var result []string
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			result = append(result, p)
		}
	}
	return result
}

func isValidDocumentType(docType string) bool {
	return docType == models.DocumentTypeSuratKesehatan || docType == models.DocumentTypeAktaKelahiran
}

// indexToColumn converts a 0-based column index to Excel column letter
// e.g., 0 -> A, 1 -> B, 25 -> Z, 26 -> AA, etc.
func indexToColumn(idx int) string {
	result := ""
	col := idx + 1
	for col > 0 {
		col-- // 0-based for modulo calculation
		result = string(rune('A'+col%26)) + result
		col /= 26
	}
	return result
}
