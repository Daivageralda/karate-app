package service

import (
	"bytes"
	"context"
	"encoding/json"
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
	participantDB       *db.ParticipantDB
	eventDB             *db.EventDB
	dojoDB              *db.DojoDB
	eventKelasTandingDB *db.EventKelasTandingDB
	uploadDir           string
	xenditClient        *XenditInvoiceClient
	xenditWebhookToken  string
	xenditEnabled       bool
	xenditInvoiceHour   int
}

// NewParticipantService creates a new ParticipantService instance
func NewParticipantService(
	participantDB *db.ParticipantDB,
	eventDB *db.EventDB,
	dojoDB *db.DojoDB,
	eventKelasTandingDB *db.EventKelasTandingDB,
	uploadDir string,
	xenditSecretKey string,
	xenditWebhookToken string,
	xenditBaseURL string,
	xenditInvoiceHour int,
) *ParticipantService {
	uploadDir = strings.TrimSpace(uploadDir)
	if uploadDir == "" {
		uploadDir = defaultParticipantUploadDir
	}

	if xenditInvoiceHour <= 0 {
		xenditInvoiceHour = 24
	}

	xenditSecretKey = strings.TrimSpace(xenditSecretKey)
	xenditWebhookToken = strings.TrimSpace(xenditWebhookToken)
	xenditEnabled := xenditSecretKey != ""

	return &ParticipantService{
		participantDB:       participantDB,
		eventDB:             eventDB,
		dojoDB:              dojoDB,
		eventKelasTandingDB: eventKelasTandingDB,
		uploadDir:           uploadDir,
		xenditClient:        NewXenditInvoiceClient(xenditSecretKey, xenditBaseURL),
		xenditWebhookToken:  xenditWebhookToken,
		xenditEnabled:       xenditEnabled,
		xenditInvoiceHour:   xenditInvoiceHour,
	}
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
		return nil, fmt.Errorf("excel missing required columns: nama_lengkap, tempat_lahir, tanggal_lahir, jenis_kelamin, kategori_tanding, kelas_tanding")
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

	if err := s.validateParticipantRowsAgainstEventKelasTanding(ctx, eventID, participantRows); err != nil {
		return nil, err
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

// CreateRegistrationPayment creates a dojo registration payment proof.
func (s *ParticipantService) CreateRegistrationPayment(
	ctx context.Context,
	input models.UploadRegistrationPaymentInput,
) (*models.DojoRegistrationPayment, error) {
	if input.DojoID == uuid.Nil {
		return nil, fmt.Errorf("dojo_id is required")
	}

	if input.EventID == uuid.Nil {
		return nil, fmt.Errorf("event_id is required")
	}

	if strings.TrimSpace(input.FilePath) == "" {
		return nil, fmt.Errorf("file_path is required")
	}

	payment, err := s.participantDB.CreateRegistrationPayment(ctx, input)
	if err != nil {
		return nil, err
	}

	return payment, nil
}

// CreateRegistrationPaymentInvoice creates a hosted Xendit invoice for dojo registration payment.
func (s *ParticipantService) CreateRegistrationPaymentInvoice(
	ctx context.Context,
	input models.CreateRegistrationPaymentInvoiceInput,
) (*models.DojoRegistrationPayment, error) {
	if input.EventID == uuid.Nil {
		return nil, fmt.Errorf("event_id is required")
	}

	if input.DojoID == uuid.Nil {
		return nil, fmt.Errorf("dojo_id is required")
	}

	if !s.xenditEnabled || s.xenditClient == nil {
		return nil, fmt.Errorf("xendit is not configured")
	}

	summary, err := s.GetStatusSummary(ctx, input.EventID, input.DojoID)
	if err != nil {
		return nil, err
	}

	if summary.TotalNominal <= 0 {
		return nil, fmt.Errorf("total nominal must be greater than zero before creating invoice")
	}

	event, err := s.eventDB.GetByID(ctx, input.EventID)
	if err != nil {
		return nil, fmt.Errorf("get event: %w", err)
	}

	dojo, err := s.dojoDB.GetByID(ctx, input.DojoID)
	if err != nil {
		return nil, fmt.Errorf("get dojo: %w", err)
	}

	invoiceResp, err := s.xenditClient.CreateInvoice(ctx, XenditCreateInvoiceInput{
		ExternalID: s.buildRegistrationPaymentExternalID(input.EventID, input.DojoID),
		Amount:     summary.TotalNominal,
		PayerEmail: event.Organizer.Email,
		Description: fmt.Sprintf(
			"Pembayaran pendaftaran dojo %s untuk event %s",
			dojo.Name,
			event.Name,
		),
		InvoiceDurationHour: s.xenditInvoiceHour,
		SuccessRedirectURL:  strings.TrimSpace(input.SuccessURL),
		FailureRedirectURL:  strings.TrimSpace(input.FailureURL),
	})
	if err != nil {
		return nil, err
	}

	payment, err := s.participantDB.CreateOrUpdateXenditRegistrationPayment(
		ctx,
		input.EventID,
		input.DojoID,
		invoiceResp.ID,
		invoiceResp.ExternalID,
		invoiceResp.InvoiceURL,
		invoiceResp.Status,
		invoiceResp.ExpiryDate,
	)
	if err != nil {
		return nil, err
	}

	return payment, nil
}

// UpdateRegistrationPaymentFromXenditWebhook synchronizes payment status from Xendit callback.
func (s *ParticipantService) UpdateRegistrationPaymentFromXenditWebhook(
	ctx context.Context,
	webhook models.XenditInvoiceWebhookPayload,
) (*models.DojoRegistrationPayment, error) {
	if strings.TrimSpace(webhook.ID) == "" {
		return nil, fmt.Errorf("xendit invoice id is required")
	}

	if strings.TrimSpace(webhook.Status) == "" {
		return nil, fmt.Errorf("xendit status is required")
	}

	internalStatus := mapXenditStatusToInternalStatus(webhook.Status)
	payment, err := s.participantDB.UpdateRegistrationPaymentByXenditInvoiceID(ctx, webhook, internalStatus)
	if err != nil {
		return nil, err
	}

	if payment == nil {
		return nil, fmt.Errorf("registration payment not found")
	}

	return payment, nil
}

// ValidateXenditWebhookToken verifies callback token header against configured value.
func (s *ParticipantService) ValidateXenditWebhookToken(token string) bool {
	token = strings.TrimSpace(token)
	if token == "" || strings.TrimSpace(s.xenditWebhookToken) == "" {
		return false
	}

	return token == strings.TrimSpace(s.xenditWebhookToken)
}

func (s *ParticipantService) IsXenditEnabled() bool {
	return s.xenditEnabled && s.xenditClient != nil
}

func (s *ParticipantService) buildRegistrationPaymentExternalID(eventID, dojoID uuid.UUID) string {
	return fmt.Sprintf("dojo-reg-%s-%s-%d", eventID.String(), dojoID.String(), time.Now().Unix())
}

func mapXenditStatusToInternalStatus(status string) string {
	normalizedStatus := strings.ToUpper(strings.TrimSpace(status))
	switch normalizedStatus {
	case models.XenditInvoiceStatusPaid, models.XenditInvoiceStatusSettled:
		return models.DocumentStatusApproved
	default:
		return models.DocumentStatusPending
	}
}

func deriveRegistrationPaymentDisplayStatus(payment *models.DojoRegistrationPayment) string {
	if payment == nil {
		return models.DocumentStatusNotUploaded
	}

	if strings.EqualFold(payment.Status, models.DocumentStatusApproved) {
		return models.DocumentStatusApproved
	}

	switch strings.ToUpper(strings.TrimSpace(payment.XenditStatus)) {
	case models.XenditInvoiceStatusPaid, models.XenditInvoiceStatusSettled:
		return models.DocumentStatusApproved
	case models.XenditInvoiceStatusExpired:
		return "expired"
	case models.XenditInvoiceStatusFailed:
		return "failed"
	case models.XenditInvoiceStatusPending:
		return models.DocumentStatusPending
	}

	if strings.TrimSpace(payment.XenditInvoiceID) != "" || strings.TrimSpace(payment.FilePath) != "" {
		return models.DocumentStatusPending
	}

	return models.DocumentStatusNotUploaded
}

func (s *ParticipantService) syncRegistrationPaymentWithXendit(
	ctx context.Context,
	payment *models.DojoRegistrationPayment,
) (*models.DojoRegistrationPayment, error) {
	if payment == nil {
		return nil, nil
	}

	if !strings.EqualFold(payment.PaymentProvider, models.PaymentProviderXendit) {
		return payment, nil
	}

	if !s.IsXenditEnabled() || strings.TrimSpace(payment.XenditInvoiceID) == "" {
		return payment, nil
	}

	invoice, err := s.xenditClient.GetInvoice(ctx, payment.XenditInvoiceID)
	if err != nil {
		return payment, nil
	}

	invoicePaymentChannel := strings.TrimSpace(invoice.PaymentChannel)
	if invoicePaymentChannel == "" {
		invoicePaymentChannel = strings.TrimSpace(invoice.PaymentMethod)
	}

	// Skip sync if the Xendit status hasn't changed since the last sync.
	// This prevents overwriting a superadmin's manual status change (e.g. rejecting
	// an already-SETTLED invoice back to pending) on the very next loadDetail() call.
	if strings.EqualFold(strings.TrimSpace(payment.XenditStatus), strings.TrimSpace(invoice.Status)) &&
		strings.EqualFold(strings.TrimSpace(payment.XenditPaymentChannel), invoicePaymentChannel) {
		return payment, nil
	}

	webhookPayload := models.XenditInvoiceWebhookPayload{
		ID:             invoice.ID,
		ExternalID:     invoice.ExternalID,
		Status:         invoice.Status,
		InvoiceURL:     invoice.InvoiceURL,
		PaidAt:         invoice.PaidAt,
		ExpiryDate:     invoice.ExpiryDate,
		PaymentChannel: invoicePaymentChannel,
		RawPayload: map[string]any{
			"id":              invoice.ID,
			"external_id":     invoice.ExternalID,
			"status":          invoice.Status,
			"invoice_url":     invoice.InvoiceURL,
			"payment_channel": invoicePaymentChannel,
		},
	}

	updatedPayment, updateErr := s.participantDB.UpdateRegistrationPaymentByXenditInvoiceID(
		ctx,
		webhookPayload,
		mapXenditStatusToInternalStatus(invoice.Status),
	)
	if updateErr != nil || updatedPayment == nil {
		return payment, nil
	}

	return updatedPayment, nil
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

// GetRegistrationPayment returns dojo registration payment proof for one event.
func (s *ParticipantService) GetRegistrationPayment(
	ctx context.Context,
	eventID, dojoID uuid.UUID,
) (*models.DojoRegistrationPayment, error) {
	if eventID == uuid.Nil {
		return nil, fmt.Errorf("event_id is required")
	}

	if dojoID == uuid.Nil {
		return nil, fmt.Errorf("dojo_id is required")
	}

	payment, err := s.participantDB.GetRegistrationPayment(ctx, dojoID, eventID)
	if err != nil {
		return nil, err
	}

	payment, err = s.syncRegistrationPaymentWithXendit(ctx, payment)
	if err != nil {
		return nil, err
	}

	return payment, nil
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

	payment, err := s.participantDB.GetRegistrationPayment(ctx, dojoID, eventID)
	if err != nil {
		return nil, err
	}

	payment, err = s.syncRegistrationPaymentWithXendit(ctx, payment)
	if err != nil {
		return nil, err
	}

	summary.RegistrationPaymentStatus = deriveRegistrationPaymentDisplayStatus(payment)

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

// GenerateEventRegistrationDojosExcel generates a merged Excel for all dojo registrations in an event.
func (s *ParticipantService) GenerateEventRegistrationDojosExcel(
	ctx context.Context,
	eventID uuid.UUID,
) ([]byte, error) {
	if eventID == uuid.Nil {
		return nil, fmt.Errorf("event_id is required")
	}

	event, err := s.eventDB.GetByID(ctx, eventID)
	if err != nil {
		if err == models.ErrNotFound {
			return nil, fmt.Errorf("event not found")
		}
		return nil, err
	}

	referenceDate := event.Time.StartAt
	if referenceDate.IsZero() {
		referenceDate = time.Now().UTC()
	}

	dojos, err := s.participantDB.ListEventRegistrationDojos(ctx, eventID)
	if err != nil {
		return nil, err
	}

	f := excelize.NewFile()
	defer f.Close()

	detailSheetName := "Data Pertandingan"
	if err := f.SetSheetName("Sheet1", detailSheetName); err != nil {
		return nil, fmt.Errorf("set sheet name: %w", err)
	}
	summarySheetName := "Ringkasan Atlet"
	if _, err := f.NewSheet(summarySheetName); err != nil {
		return nil, fmt.Errorf("create summary sheet: %w", err)
	}
	dojoSummarySheetName := "Ringkasan Dojo"
	if _, err := f.NewSheet(dojoSummarySheetName); err != nil {
		return nil, fmt.Errorf("create dojo summary sheet: %w", err)
	}

	detailHeaders := []string{
		"Dojo",
		"Nama Atlet",
		"Tempat Lahir",
		"Tanggal Lahir",
		"Jenis Kelamin",
		"Berat Badan (kg)",
		"Kategori",
		"Kategori Umur",
		"Kelas Tanding",
	}
	summaryHeaders := []string{
		"Dojo",
		"Nama Atlet",
		"Tempat Lahir",
		"Tanggal Lahir",
		"Jenis Kelamin",
		"Berat Badan (kg)",
		"Kategori",
		"Kategori Umur",
		"Kelas Tanding 1",
		"Kelas Tanding 2",
		"Kelas Tanding 3",
		"Kelas Tanding 4",
		"Kelas Tanding 5",
	}
	dojoSummaryHeaders := []string{
		"Dojo",
		"Total Atlet",
		"Atlet Disetujui",
		"Surat Kesehatan Uploaded",
		"Akta Kelahiran Uploaded",
		"Persentase Kelengkapan Berkas",
		"Status Surat Rekomendasi",
		"Terdaftar Pada",
		"Diperbarui Pada",
	}

	writeHeaders := func(sheetName string, headers []string) error {
		for idx, header := range headers {
			cell, _ := excelize.CoordinatesToCellName(idx+1, 1)
			if err := f.SetCellValue(sheetName, cell, header); err != nil {
				return err
			}
		}
		return nil
	}

	if err := writeHeaders(detailSheetName, detailHeaders); err != nil {
		return nil, fmt.Errorf("set detail header cell: %w", err)
	}
	if err := writeHeaders(summarySheetName, summaryHeaders); err != nil {
		return nil, fmt.Errorf("set summary header cell: %w", err)
	}
	if err := writeHeaders(dojoSummarySheetName, dojoSummaryHeaders); err != nil {
		return nil, fmt.Errorf("set dojo summary header cell: %w", err)
	}

	currentDetailRow := 2
	currentSummaryRow := 2
	currentDojoSummaryRow := 2
	for _, dojo := range dojos {
		documentCompletionPercentage := formatDojoDocumentCompletionPercentage(dojo.TotalAthletes, dojo.SuratKesehatanUploaded, dojo.AktaKelahiranUploaded)
		dojoSummaryValues := []any{
			dojo.DojoName,
			dojo.TotalAthletes,
			dojo.ApprovedAthletes,
			dojo.SuratKesehatanUploaded,
			dojo.AktaKelahiranUploaded,
			documentCompletionPercentage,
			humanizeRecommendationLetterStatus(dojo.RecommendationLetterStatus),
			formatExcelDateTime(dojo.RegisteredAt),
			formatExcelDateTime(dojo.UpdatedAt),
		}
		for colIdx, val := range dojoSummaryValues {
			cell, _ := excelize.CoordinatesToCellName(colIdx+1, currentDojoSummaryRow)
			if err := f.SetCellValue(dojoSummarySheetName, cell, val); err != nil {
				return nil, fmt.Errorf("set dojo summary row: %w", err)
			}
		}
		currentDojoSummaryRow++

		participants, err := s.participantDB.GetByEventAndDojo(ctx, eventID, dojo.DojoID)
		if err != nil {
			return nil, err
		}

		if len(participants) == 0 {
			continue
		}

		for _, participant := range participants {
			kategoriTandingItems := parseParticipantJSONList(participant.KategoriTanding)
			kelasTandingItems := parseParticipantJSONList(participant.KelasTanding)
			kategoriUmurLabel := kategoriUmurLabelFromBirthDate(participant.TanggalLahir, referenceDate)
			tanggalLahirLabel := formatExcelDate(participant.TanggalLahir)

			kelas1, kelas2, kelas3, kelas4, kelas5 := "-", "-", "-", "-", "-"
			if len(kelasTandingItems) > 0 {
				kelas1 = kelasTandingItems[0]
			}
			if len(kelasTandingItems) > 1 {
				kelas2 = kelasTandingItems[1]
			}
			if len(kelasTandingItems) > 2 {
				kelas3 = kelasTandingItems[2]
			}
			if len(kelasTandingItems) > 3 {
				kelas4 = kelasTandingItems[3]
			}
			if len(kelasTandingItems) > 4 {
				kelas5 = kelasTandingItems[4]
			}

			summaryValues := []any{
				dojo.DojoName,
				participant.NamaLengkap,
				participant.TempatLahir,
				tanggalLahirLabel,
				participant.JenisKelamin,
				participant.BeratBadan,
				strings.Join(kategoriTandingItems, ", "),
				kategoriUmurLabel,
				kelas1,
				kelas2,
				kelas3,
				kelas4,
				kelas5,
			}

			for colIdx, val := range summaryValues {
				cell, _ := excelize.CoordinatesToCellName(colIdx+1, currentSummaryRow)
				if err := f.SetCellValue(summarySheetName, cell, val); err != nil {
					return nil, fmt.Errorf("set summary participant row: %w", err)
				}
			}
			currentSummaryRow++

			detailKelasItems := kelasTandingItems
			if len(detailKelasItems) == 0 {
				detailKelasItems = []string{"-"}
			}

			for _, kelasTanding := range detailKelasItems {
				detailValues := []any{
					dojo.DojoName,
					participant.NamaLengkap,
					participant.TempatLahir,
					tanggalLahirLabel,
					participant.JenisKelamin,
					participant.BeratBadan,
					strings.Join(kategoriTandingItems, ", "),
					kategoriUmurLabel,
					kelasTanding,
				}

				for colIdx, val := range detailValues {
					cell, _ := excelize.CoordinatesToCellName(colIdx+1, currentDetailRow)
					if err := f.SetCellValue(detailSheetName, cell, val); err != nil {
						return nil, fmt.Errorf("set detail participant row: %w", err)
					}
				}
				currentDetailRow++
			}
		}
	}

	headerStyleID, err := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "#FFFFFF"},
		Fill:      excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"#1E4E79"}},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border: []excelize.Border{
			{Type: "left", Color: "#D9D9D9", Style: 1},
			{Type: "top", Color: "#D9D9D9", Style: 1},
			{Type: "right", Color: "#D9D9D9", Style: 1},
			{Type: "bottom", Color: "#D9D9D9", Style: 1},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("create header style: %w", err)
	}

	bodyStyleID, err := f.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center"},
		Border: []excelize.Border{
			{Type: "left", Color: "#D9D9D9", Style: 1},
			{Type: "top", Color: "#D9D9D9", Style: 1},
			{Type: "right", Color: "#D9D9D9", Style: 1},
			{Type: "bottom", Color: "#D9D9D9", Style: 1},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("create body style: %w", err)
	}

	bodyAltStyleID, err := f.NewStyle(&excelize.Style{
		Alignment: &excelize.Alignment{Horizontal: "left", Vertical: "center"},
		Fill:      excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"#F7FAFC"}},
		Border: []excelize.Border{
			{Type: "left", Color: "#D9D9D9", Style: 1},
			{Type: "top", Color: "#D9D9D9", Style: 1},
			{Type: "right", Color: "#D9D9D9", Style: 1},
			{Type: "bottom", Color: "#D9D9D9", Style: 1},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("create alternate body style: %w", err)
	}

	applySheetFormatting := func(sheetName string, headers []string, lastRow int, widthErrLabel string) error {
		lastColName, _ := excelize.ColumnNumberToName(len(headers))
		if err := f.SetCellStyle(sheetName, "A1", fmt.Sprintf("%s1", lastColName), headerStyleID); err != nil {
			return fmt.Errorf("apply header style: %w", err)
		}

		if lastRow >= 2 {
			for row := 2; row <= lastRow; row++ {
				startCell := fmt.Sprintf("A%d", row)
				endCell := fmt.Sprintf("%s%d", lastColName, row)
				styleID := bodyStyleID
				if row%2 == 0 {
					styleID = bodyAltStyleID
				}
				if err := f.SetCellStyle(sheetName, startCell, endCell, styleID); err != nil {
					return fmt.Errorf("apply row style: %w", err)
				}
			}
		}

		if err := f.SetRowHeight(sheetName, 1, 24); err != nil {
			return fmt.Errorf("set header row height: %w", err)
		}
		for row := 2; row <= lastRow; row++ {
			if err := f.SetRowHeight(sheetName, row, 20); err != nil {
				return fmt.Errorf("set body row height: %w", err)
			}
		}

		if err := f.SetColWidth(sheetName, "A", "A", 24); err != nil {
			return fmt.Errorf("set column width A: %w", err)
		}
		if err := f.SetColWidth(sheetName, "B", "B", 28); err != nil {
			return fmt.Errorf("set column width B: %w", err)
		}
		if err := f.SetColWidth(sheetName, "C", "C", 20); err != nil {
			return fmt.Errorf("set column width C: %w", err)
		}
		if err := f.SetColWidth(sheetName, "D", "D", 14); err != nil {
			return fmt.Errorf("set column width D: %w", err)
		}
		if err := f.SetColWidth(sheetName, "E", "E", 16); err != nil {
			return fmt.Errorf("set column width E: %w", err)
		}
		if err := f.SetColWidth(sheetName, "F", "F", 14); err != nil {
			return fmt.Errorf("set column width F: %w", err)
		}
		if sheetName == detailSheetName {
			if err := f.SetColWidth(sheetName, "G", "H", 20); err != nil {
				return fmt.Errorf("set column width G-H: %w", err)
			}
			if err := f.SetColWidth(sheetName, "I", "I", 34); err != nil {
				return fmt.Errorf("set column width I: %w", err)
			}
		} else if sheetName == summarySheetName {
			if err := f.SetColWidth(sheetName, "G", "H", 20); err != nil {
				return fmt.Errorf("set column width G-H: %w", err)
			}
			if err := f.SetColWidth(sheetName, "I", "M", 26); err != nil {
				return fmt.Errorf("set column width I-M: %w", err)
			}
		} else {
			if err := f.SetColWidth(sheetName, "G", "H", 18); err != nil {
				return fmt.Errorf("set column width G-H: %w", err)
			}
		}

		if err := f.SetPanes(sheetName, &excelize.Panes{
			Freeze:      true,
			Split:       false,
			XSplit:      0,
			YSplit:      1,
			TopLeftCell: "A2",
			ActivePane:  "bottomLeft",
			Selection: []excelize.Selection{
				{SQRef: "A2", ActiveCell: "A2", Pane: "bottomLeft"},
			},
		}); err != nil {
			return fmt.Errorf("set frozen header pane: %w", err)
		}

		autoFilterRange := fmt.Sprintf("A1:%s%d", lastColName, lastRow)
		if err := f.AutoFilter(sheetName, autoFilterRange, nil); err != nil {
			return fmt.Errorf("apply autofilter: %w", err)
		}

		return nil
	}

	detailLastRow := currentDetailRow - 1
	if detailLastRow < 1 {
		detailLastRow = 1
	}
	if err := applySheetFormatting(detailSheetName, detailHeaders, detailLastRow, "detail"); err != nil {
		return nil, err
	}

	summaryLastRow := currentSummaryRow - 1
	if summaryLastRow < 1 {
		summaryLastRow = 1
	}
	if err := applySheetFormatting(summarySheetName, summaryHeaders, summaryLastRow, "summary"); err != nil {
		return nil, err
	}

	dojoSummaryLastRow := currentDojoSummaryRow - 1
	if dojoSummaryLastRow < 1 {
		dojoSummaryLastRow = 1
	}
	if err := applySheetFormatting(dojoSummarySheetName, dojoSummaryHeaders, dojoSummaryLastRow, "dojo-summary"); err != nil {
		return nil, err
	}

	f.SetActiveSheet(0)

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, fmt.Errorf("write export excel: %w", err)
	}

	return buf.Bytes(), nil
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

// DeleteRegistrationPayment deletes the registration payment record for a dojo in an event.
func (s *ParticipantService) DeleteRegistrationPayment(
	ctx context.Context,
	eventID, dojoID uuid.UUID,
) error {
	if eventID == uuid.Nil {
		return fmt.Errorf("event_id is required")
	}

	if dojoID == uuid.Nil {
		return fmt.Errorf("dojo_id is required")
	}

	return s.participantDB.DeleteRegistrationPayment(ctx, eventID, dojoID)
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

// UpdateRegistrationPaymentStatus updates the status of a registration payment proof.
func (s *ParticipantService) UpdateRegistrationPaymentStatus(
	ctx context.Context,
	eventID, dojoID uuid.UUID,
	status string,
) (*models.DojoRegistrationPayment, error) {
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

	payment, err := s.participantDB.UpdateRegistrationPaymentStatus(ctx, eventID, dojoID, status)
	if err != nil {
		return nil, err
	}

	if payment == nil {
		return nil, fmt.Errorf("registration payment not found")
	}

	return payment, nil
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

// GenerateExcelTemplate generates a dynamic template Excel file for participants by event assignment.
func (s *ParticipantService) GenerateExcelTemplate(ctx context.Context, eventID uuid.UUID) ([]byte, error) {
	if eventID == uuid.Nil {
		return nil, fmt.Errorf("event_id is required")
	}

	event, assignedKelasTanding, err := s.getEventAndAssignedKelasTanding(ctx, eventID)
	if err != nil {
		return nil, err
	}

	if len(assignedKelasTanding) == 0 {
		return nil, fmt.Errorf("event belum memiliki kelas tanding yang di-assign")
	}

	f := excelize.NewFile()
	defer f.Close()

	const pesertaSheet = "Peserta"
	const summarySheet = "Ringkasan Biaya"
	const referensiSheet = "Referensi"

	if err := f.SetSheetName("Sheet1", pesertaSheet); err != nil {
		return nil, fmt.Errorf("set peserta sheet name: %w", err)
	}
	f.NewSheet(summarySheet)
	f.NewSheet(referensiSheet)

	headers := []string{
		"Nama Lengkap",
		"Tempat Lahir",
		"Tanggal Lahir",
		"Jenis Kelamin",
		"Berat Badan (kg)",
		"Kategori Tanding",
		"Kategori Umur (Otomatis)",
		"Kelas Tanding 1",
		"Kelas Tanding 2",
		"Kelas Tanding 3",
		"Kelas Tanding 4",
		"Kelas Tanding 5",
	}

	for i, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		if err := f.SetCellValue(pesertaSheet, cell, header); err != nil {
			return nil, fmt.Errorf("set peserta header: %w", err)
		}
	}
	if err := f.SetCellValue(pesertaSheet, "M1", "Total Biaya (Rp)"); err != nil {
		return nil, fmt.Errorf("set peserta total biaya header: %w", err)
	}

	dependentOptions := buildDependentKelasTandingOptions(assignedKelasTanding)
	if len(dependentOptions) == 0 {
		return nil, fmt.Errorf("event belum memiliki opsi kelas tanding yang valid")
	}

	referenceDate := event.Time.StartAt
	if referenceDate.IsZero() {
		referenceDate = time.Now().UTC()
	}
	referenceDateString := referenceDate.Format("2006-01-02")

	if err := f.SetCellValue(referensiSheet, "A1", "Jenis Kelamin"); err != nil {
		return nil, fmt.Errorf("set referensi header jenis kelamin: %w", err)
	}
	if err := f.SetCellValue(referensiSheet, "A2", "Perempuan"); err != nil {
		return nil, fmt.Errorf("set referensi jenis kelamin perempuan: %w", err)
	}
	if err := f.SetCellValue(referensiSheet, "A3", "Laki-laki"); err != nil {
		return nil, fmt.Errorf("set referensi jenis kelamin laki-laki: %w", err)
	}

	if err := f.SetCellValue(referensiSheet, "B1", "Kategori Tanding"); err != nil {
		return nil, fmt.Errorf("set referensi header kategori tanding: %w", err)
	}
	if err := f.SetCellValue(referensiSheet, "B2", "Kata"); err != nil {
		return nil, fmt.Errorf("set referensi kategori tanding kata: %w", err)
	}
	if err := f.SetCellValue(referensiSheet, "B3", "Kumite"); err != nil {
		return nil, fmt.Errorf("set referensi kategori tanding kumite: %w", err)
	}
	if err := f.SetCellValue(referensiSheet, "B4", "Kata dan Kumite"); err != nil {
		return nil, fmt.Errorf("set referensi kategori tanding kata dan kumite: %w", err)
	}

	if err := f.SetCellValue(referensiSheet, "E1", "Tanggal Referensi Umur"); err != nil {
		return nil, fmt.Errorf("set referensi header tanggal: %w", err)
	}
	if err := f.SetCellValue(referensiSheet, "E2", referenceDateString); err != nil {
		return nil, fmt.Errorf("set referensi tanggal: %w", err)
	}

	rangeNames := make([]string, 0, len(dependentOptions))
	for rangeName := range dependentOptions {
		rangeNames = append(rangeNames, rangeName)
	}
	sort.Strings(rangeNames)
	priceLookup := buildKelasTandingPriceLookup(assignedKelasTanding)

	startColIdx := 7
	for i, rangeName := range rangeNames {
		colIdx := startColIdx + i
		colName, _ := excelize.ColumnNumberToName(colIdx)

		headerCell, _ := excelize.CoordinatesToCellName(colIdx, 1)
		if err := f.SetCellValue(referensiSheet, headerCell, rangeName); err != nil {
			return nil, fmt.Errorf("set referensi range header: %w", err)
		}

		labels := dependentOptions[rangeName]
		if len(labels) == 0 {
			labels = []string{""}
		}

		for rowOffset, label := range labels {
			cell, _ := excelize.CoordinatesToCellName(colIdx, rowOffset+2)
			if err := f.SetCellValue(referensiSheet, cell, label); err != nil {
				return nil, fmt.Errorf("set referensi range value: %w", err)
			}
		}

		lastRow := len(labels) + 1
		if err := f.SetDefinedName(&excelize.DefinedName{
			Name:     rangeName,
			RefersTo: fmt.Sprintf("%s!$%s$2:$%s$%d", referensiSheet, colName, colName, lastRow),
		}); err != nil {
			return nil, fmt.Errorf("set defined name %s: %w", rangeName, err)
		}
	}

	priceNameColIdx := startColIdx + len(rangeNames)
	priceValueColIdx := priceNameColIdx + 1
	priceNameColName, _ := excelize.ColumnNumberToName(priceNameColIdx)
	priceValueColName, _ := excelize.ColumnNumberToName(priceValueColIdx)
	priceNameHeaderCell, _ := excelize.CoordinatesToCellName(priceNameColIdx, 1)
	priceValueHeaderCell, _ := excelize.CoordinatesToCellName(priceValueColIdx, 1)
	if err := f.SetCellValue(referensiSheet, priceNameHeaderCell, "Nama Kelas Tanding"); err != nil {
		return nil, fmt.Errorf("set referensi harga header nama: %w", err)
	}
	if err := f.SetCellValue(referensiSheet, priceValueHeaderCell, "Harga"); err != nil {
		return nil, fmt.Errorf("set referensi harga header value: %w", err)
	}
	priceLookupLastRow := 2
	for idx, item := range priceLookup {
		nameCell, _ := excelize.CoordinatesToCellName(priceNameColIdx, idx+2)
		valueCell, _ := excelize.CoordinatesToCellName(priceValueColIdx, idx+2)
		if err := f.SetCellValue(referensiSheet, nameCell, item.Nama); err != nil {
			return nil, fmt.Errorf("set referensi harga nama: %w", err)
		}
		if err := f.SetCellValue(referensiSheet, valueCell, item.Harga); err != nil {
			return nil, fmt.Errorf("set referensi harga value: %w", err)
		}
		priceLookupLastRow = idx + 2
	}

	dvJenisKelamin := excelize.NewDataValidation(true)
	dvJenisKelamin.Sqref = "D2:D500"
	dvJenisKelamin.SetSqrefDropList(fmt.Sprintf("%s!$A$2:$A$3", referensiSheet))
	dvJenisKelamin.SetInput("Jenis Kelamin", "Pilih Perempuan atau Laki-laki")
	if err := f.AddDataValidation(pesertaSheet, dvJenisKelamin); err != nil {
		return nil, fmt.Errorf("add validation jenis kelamin: %w", err)
	}

	dvKategoriTanding := excelize.NewDataValidation(true)
	dvKategoriTanding.Sqref = "F2:F500"
	dvKategoriTanding.SetSqrefDropList(fmt.Sprintf("%s!$B$2:$B$4", referensiSheet))
	dvKategoriTanding.SetInput("Kategori Tanding", "Pilih Kata, Kumite, atau Kata dan Kumite")
	if err := f.AddDataValidation(pesertaSheet, dvKategoriTanding); err != nil {
		return nil, fmt.Errorf("add validation kategori tanding: %w", err)
	}

	dvKelasTanding := excelize.NewDataValidation(true)
	dvKelasTanding.Sqref = "H2:L500"
	if err := dvKelasTanding.SetDropList([]string{"=INDIRECT($N2)"}); err != nil {
		return nil, fmt.Errorf("set validation kelas tanding formula: %w", err)
	}
	dvKelasTanding.SetInput("Kelas Tanding", "Pilih bisa lebih dari satu lewat kolom Kelas Tanding 1-5. Opsi dropdown mengikuti kombinasi per baris dan berat badan.")
	if err := f.AddDataValidation(pesertaSheet, dvKelasTanding); err != nil {
		return nil, fmt.Errorf("add validation kelas tanding: %w", err)
	}

	// Build a lookup map for weight ranges: kategori_jenis -> []weightRange
	weightRangesByKombinasi := make(map[string][]weightRange)
	for _, item := range assignedKelasTanding {
		if strings.ToLower(strings.TrimSpace(item.Jenis)) != "kumite" {
			continue
		}
		if item.BatasBerat == nil {
			continue
		}
		key := fmt.Sprintf("%s_%s", item.Kategori, item.JenisKelamin)
		wr := weightRange{lower: item.BatasBerat.Bawah, upper: item.BatasBerat.Atas}
		found := false
		for _, existing := range weightRangesByKombinasi[key] {
			if existing.lower == wr.lower && existing.upper == wr.upper {
				found = true
				break
			}
		}
		if !found {
			weightRangesByKombinasi[key] = append(weightRangesByKombinasi[key], wr)
		}
	}

	// Sort weight ranges
	for key := range weightRangesByKombinasi {
		ranges := weightRangesByKombinasi[key]
		sort.Slice(ranges, func(i, j int) bool {
			if ranges[i].lower != ranges[j].lower {
				return ranges[i].lower < ranges[j].lower
			}
			return ranges[i].upper < ranges[j].upper
		})
		weightRangesByKombinasi[key] = ranges
	}

	for row := 2; row <= 500; row++ {
		formula := fmt.Sprintf(`=IF(C%d="","",IF(DATEDIF(C%d,%s!$E$2,"Y")<4,"Tidak Masuk Kategori",IF(DATEDIF(C%d,%s!$E$2,"Y")<=5,"Pra Usia Dini",IF(DATEDIF(C%d,%s!$E$2,"Y")<=7,"Usia Dini",IF(DATEDIF(C%d,%s!$E$2,"Y")<=9,"Pra-Pemula",IF(DATEDIF(C%d,%s!$E$2,"Y")<=11,"Pemula",IF(DATEDIF(C%d,%s!$E$2,"Y")<=13,"Kadet",IF(DATEDIF(C%d,%s!$E$2,"Y")<=15,"Junior",IF(DATEDIF(C%d,%s!$E$2,"Y")<=20,"U-21","Senior")))))))))`, row, row, referensiSheet, row, referensiSheet, row, referensiSheet, row, referensiSheet, row, referensiSheet, row, referensiSheet, row, referensiSheet, row, referensiSheet)
		cell, _ := excelize.CoordinatesToCellName(7, row)
		if err := f.SetCellFormula(pesertaSheet, cell, formula); err != nil {
			return nil, fmt.Errorf("set kategori umur formula: %w", err)
		}

		totalHargaCell, _ := excelize.CoordinatesToCellName(13, row)
		totalHargaFormula := buildTotalHargaFormula(row, referensiSheet, priceNameColName, priceValueColName, priceLookupLastRow)
		if err := f.SetCellFormula(pesertaSheet, totalHargaCell, totalHargaFormula); err != nil {
			return nil, fmt.Errorf("set total harga formula: %w", err)
		}

		// Helper formula that selects weight-filtered range for kumite, or standard range for kata
		helperFormula := buildHelperFormulaWithWeightFiltering(row, referensiSheet, weightRangesByKombinasi)
		helperCell, _ := excelize.CoordinatesToCellName(14, row)
		if err := f.SetCellFormula(pesertaSheet, helperCell, helperFormula); err != nil {
			return nil, fmt.Errorf("set kelas key helper formula: %w", err)
		}
	}

	if err := f.SetCellValue(pesertaSheet, "N1", "__kelas_key"); err != nil {
		return nil, fmt.Errorf("set helper header: %w", err)
	}

	if err := f.SetCellValue(summarySheet, "A1", "Ringkasan Biaya Pendaftaran"); err != nil {
		return nil, fmt.Errorf("set summary title: %w", err)
	}
	if err := f.SetCellValue(summarySheet, "A3", "Total Seluruh Atlet"); err != nil {
		return nil, fmt.Errorf("set summary total label: %w", err)
	}
	if err := f.SetCellFormula(summarySheet, "B3", "=SUM(Peserta!M2:M500)"); err != nil {
		return nil, fmt.Errorf("set summary total formula: %w", err)
	}
	if err := f.SetCellValue(summarySheet, "A4", "Jumlah Atlet Terisi"); err != nil {
		return nil, fmt.Errorf("set summary count label: %w", err)
	}
	if err := f.SetCellFormula(summarySheet, "B4", "=COUNTA(Peserta!A2:A500)"); err != nil {
		return nil, fmt.Errorf("set summary count formula: %w", err)
	}

	example := []any{
		"Adi Pratama",
		"Jakarta",
		"2010-05-15",
		"Laki-laki",
		65,
		"Kumite",
		"",
		firstNonEmptyDependentOption(dependentOptions),
		"",
		"",
		"",
		"",
	}
	for i, val := range example {
		cell, _ := excelize.CoordinatesToCellName(i+1, 2)
		if err := f.SetCellValue(pesertaSheet, cell, val); err != nil {
			return nil, fmt.Errorf("set contoh data: %w", err)
		}
	}

	headerStyleID, err := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "#FFFFFF"},
		Fill:      excelize.Fill{Type: "pattern", Pattern: 1, Color: []string{"#1E4E79"}},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
	})
	if err != nil {
		return nil, fmt.Errorf("create header style: %w", err)
	}

	if err := f.SetCellStyle(pesertaSheet, "A1", "M1", headerStyleID); err != nil {
		return nil, fmt.Errorf("apply header style: %w", err)
	}
	if err := f.SetCellStyle(summarySheet, "A1", "B1", headerStyleID); err != nil {
		return nil, fmt.Errorf("apply summary header style: %w", err)
	}

	_ = f.SetColWidth(pesertaSheet, "A", "A", 28)
	_ = f.SetColWidth(pesertaSheet, "B", "B", 20)
	_ = f.SetColWidth(pesertaSheet, "C", "C", 16)
	_ = f.SetColWidth(pesertaSheet, "D", "F", 22)
	_ = f.SetColWidth(pesertaSheet, "G", "G", 28)
	_ = f.SetColWidth(pesertaSheet, "H", "L", 30)
	_ = f.SetColWidth(pesertaSheet, "M", "M", 18)
	_ = f.SetColVisible(pesertaSheet, "N", false)
	_ = f.SetColWidth(summarySheet, "A", "A", 24)
	_ = f.SetColWidth(summarySheet, "B", "B", 18)

	if err := f.SetPanes(pesertaSheet, &excelize.Panes{
		Freeze:      true,
		Split:       false,
		XSplit:      0,
		YSplit:      1,
		TopLeftCell: "A2",
		ActivePane:  "bottomLeft",
	}); err != nil {
		return nil, fmt.Errorf("set frozen pane: %w", err)
	}

	if err := f.SetSheetVisible(referensiSheet, false); err != nil {
		return nil, fmt.Errorf("hide referensi sheet: %w", err)
	}

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, fmt.Errorf("write excel file: %w", err)
	}

	return buf.Bytes(), nil
}

type kelasTandingPriceLookupItem struct {
	Nama  string
	Harga int64
}

func buildKelasTandingPriceLookup(items []models.EventKelasTandingItem) []kelasTandingPriceLookupItem {
	lookupByName := make(map[string]kelasTandingPriceLookupItem, len(items))
	for _, item := range items {
		if !item.IsAssigned {
			continue
		}

		nama := strings.TrimSpace(item.Nama)
		if nama == "" {
			continue
		}

		lookupByName[strings.ToLower(nama)] = kelasTandingPriceLookupItem{
			Nama:  nama,
			Harga: item.Harga,
		}
	}

	keys := make([]string, 0, len(lookupByName))
	for key := range lookupByName {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	result := make([]kelasTandingPriceLookupItem, 0, len(keys))
	for _, key := range keys {
		result = append(result, lookupByName[key])
	}

	return result
}

func buildTotalHargaFormula(row int, referenceSheet, priceNameColName, priceValueColName string, lastRow int) string {
	if lastRow < 2 {
		return fmt.Sprintf(`=IF(COUNTA(A%d:L%d)=0,"",0)`, row, row)
	}

	priceNameRange := fmt.Sprintf(`%s!$%s$2:$%s$%d`, referenceSheet, priceNameColName, priceNameColName, lastRow)
	priceValueRange := fmt.Sprintf(`%s!$%s$2:$%s$%d`, referenceSheet, priceValueColName, priceValueColName, lastRow)

	return fmt.Sprintf(`=IF(COUNTA(A%d:L%d)=0,"",SUM(SUMIF(%s,H%d,%s),SUMIF(%s,I%d,%s),SUMIF(%s,J%d,%s),SUMIF(%s,K%d,%s),SUMIF(%s,L%d,%s)))`, row, row, priceNameRange, row, priceValueRange, priceNameRange, row, priceValueRange, priceNameRange, row, priceValueRange, priceNameRange, row, priceValueRange, priceNameRange, row, priceValueRange)
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
	visibleColumnIndices := make([]int, 0, len(firstRow))
	tanggalColumnIndex := -1
	for idx, value := range firstRow {
		trimmed := strings.TrimSpace(value)
		if strings.HasPrefix(trimmed, "__") {
			continue
		}
		visibleColumnIndices = append(visibleColumnIndices, idx)
		if trimmed == "" {
			headers[idx] = fmt.Sprintf("Kolom %d", idx+1)
			continue
		}
		headers[idx] = trimmed
		if strings.Contains(strings.ToLower(trimmed), "tanggal") {
			tanggalColumnIndex = idx
		}
	}

	visibleHeaders := make([]string, 0, len(visibleColumnIndices))
	for _, idx := range visibleColumnIndices {
		visibleHeaders = append(visibleHeaders, headers[idx])
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

		normalized := make([]string, len(visibleColumnIndices))
		for outIdx, sourceIdx := range visibleColumnIndices {
			if sourceIdx < len(row) {
				cellValue := row[sourceIdx]
				if sourceIdx == tanggalColumnIndex {
					normalizedDate, normalizeErr := normalizeBirthDate(cellValue)
					if normalizeErr == nil {
						normalized[outIdx] = normalizedDate
						continue
					}
				}
				normalized[outIdx] = cellValue
			}
		}

		previewRows = append(previewRows, normalized)
		if len(previewRows) >= maxRows {
			break
		}
	}

	return visibleHeaders, previewRows, nil
}

type excelColumnIndex struct {
	NamaLengkap     int
	TempatLahir     int
	TanggalLahir    int
	JenisKelamin    int
	BeratBadan      int
	KategoriTanding int
	KategoriUmur    int
	KelasTanding    int
	KelasTanding1   int
	KelasTanding2   int
	KelasTanding3   int
	KelasTanding4   int
	KelasTanding5   int
}

func parseExcelHeaders(headers []string) excelColumnIndex {
	idx := excelColumnIndex{
		NamaLengkap:     -1,
		TempatLahir:     -1,
		TanggalLahir:    -1,
		JenisKelamin:    -1,
		BeratBadan:      -1,
		KategoriTanding: -1,
		KategoriUmur:    -1,
		KelasTanding:    -1,
		KelasTanding1:   -1,
		KelasTanding2:   -1,
		KelasTanding3:   -1,
		KelasTanding4:   -1,
		KelasTanding5:   -1,
	}

	for i, header := range headers {
		h := strings.ToLower(strings.TrimSpace(header))
		if strings.HasPrefix(h, "__") {
			continue
		}
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
		case strings.Contains(h, "kategori") && strings.Contains(h, "umur"):
			idx.KategoriUmur = i
		case strings.Contains(h, "kategori"):
			idx.KategoriTanding = i
		case strings.Contains(h, "kelas") && strings.Contains(h, "tanding") && strings.Contains(h, "1"):
			idx.KelasTanding1 = i
		case strings.Contains(h, "kelas") && strings.Contains(h, "tanding") && strings.Contains(h, "2"):
			idx.KelasTanding2 = i
		case strings.Contains(h, "kelas") && strings.Contains(h, "tanding") && strings.Contains(h, "3"):
			idx.KelasTanding3 = i
		case strings.Contains(h, "kelas") && strings.Contains(h, "tanding") && strings.Contains(h, "4"):
			idx.KelasTanding4 = i
		case strings.Contains(h, "kelas") && strings.Contains(h, "tanding") && strings.Contains(h, "5"):
			idx.KelasTanding5 = i
		case strings.Contains(h, "kelas") && strings.Contains(h, "tanding"):
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
		(idx.KelasTanding >= 0 || idx.KelasTanding1 >= 0 || idx.KelasTanding2 >= 0 || idx.KelasTanding3 >= 0 || idx.KelasTanding4 >= 0 || idx.KelasTanding5 >= 0)
}

func parseExcelRow(row []string, idx excelColumnIndex) (models.ParticipantRow, error) {
	pr := models.ParticipantRow{}

	// Get values with bounds checking
	pr.NamaLengkap = getValue(row, idx.NamaLengkap)
	pr.TempatLahir = getValue(row, idx.TempatLahir)
	pr.TanggalLahir = getValue(row, idx.TanggalLahir)
	pr.JenisKelamin = normalizeJenisKelamin(getValue(row, idx.JenisKelamin))

	// Accept YYYY-MM-DD, DD/MM/YYYY, and Excel serial date formats.
	normalizedDate, dateErr := normalizeBirthDate(pr.TanggalLahir)
	if dateErr != nil {
		return pr, fmt.Errorf("invalid tanggal_lahir format: gunakan YYYY-MM-DD, DD/MM/YYYY, atau nilai tanggal Excel")
	}
	pr.TanggalLahir = normalizedDate

	// Parse berat badan
	beratStr := getValue(row, idx.BeratBadan)
	berat, err := strconv.ParseFloat(beratStr, 64)
	if err != nil {
		return pr, fmt.Errorf("invalid berat_badan")
	}
	pr.BeratBadan = berat

	// Parse kategori tanding
	kategoriStr := getValue(row, idx.KategoriTanding)
	kategoriTanding := normalizeKategoriTandingInput(kategoriStr)
	if len(kategoriTanding) == 0 {
		return pr, fmt.Errorf("kategori_tanding wajib diisi (kata, kumite, atau keduanya)")
	}
	pr.KategoriTanding = kategoriTanding

	// Parse kelas tanding from multiple selector columns.
	kelasCandidates := make([]string, 0)
	if idx.KelasTanding1 >= 0 {
		kelasCandidates = append(kelasCandidates, parseCommaSeparated(getValue(row, idx.KelasTanding1))...)
	}
	if idx.KelasTanding2 >= 0 {
		kelasCandidates = append(kelasCandidates, parseCommaSeparated(getValue(row, idx.KelasTanding2))...)
	}
	if idx.KelasTanding3 >= 0 {
		kelasCandidates = append(kelasCandidates, parseCommaSeparated(getValue(row, idx.KelasTanding3))...)
	}
	if idx.KelasTanding4 >= 0 {
		kelasCandidates = append(kelasCandidates, parseCommaSeparated(getValue(row, idx.KelasTanding4))...)
	}
	if idx.KelasTanding5 >= 0 {
		kelasCandidates = append(kelasCandidates, parseCommaSeparated(getValue(row, idx.KelasTanding5))...)
	}
	if idx.KelasTanding >= 0 {
		kelasCandidates = append(kelasCandidates, parseCommaSeparated(getValue(row, idx.KelasTanding))...)
	}
	pr.KelasTanding = uniqueTrimmedValues(kelasCandidates)

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
		return pr, fmt.Errorf("jenis_kelamin harus Perempuan atau Laki-laki")
	}
	if pr.BeratBadan <= 0 {
		return pr, fmt.Errorf("berat_badan harus lebih dari 0")
	}
	if len(pr.KelasTanding) == 0 {
		return pr, fmt.Errorf("kelas_tanding is required")
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
		if p == "" || p == "-" || p == "—" {
			continue
		}
		if p != "" {
			result = append(result, p)
		}
	}
	return result
}

func uniqueTrimmedValues(values []string) []string {
	result := make([]string, 0, len(values))
	seen := make(map[string]struct{}, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		key := strings.ToLower(trimmed)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		result = append(result, trimmed)
	}
	return result
}

func normalizeJenisKelamin(rawValue string) string {
	v := strings.ToLower(strings.TrimSpace(rawValue))
	switch v {
	case "laki-laki", "laki laki", "pria", "male", "m":
		return models.KelasTandingJenisKelaminLakiLaki
	case "perempuan", "wanita", "female", "f":
		return models.KelasTandingJenisKelaminPerempuan
	default:
		return ""
	}
}

func normalizeKategoriTandingInput(rawValue string) []string {
	v := strings.ToLower(strings.TrimSpace(rawValue))
	switch v {
	case "kata":
		return []string{"kata"}
	case "kumite":
		return []string{"kumite"}
	case "keduanya", "dua-duanya", "kata,kumite", "kumite,kata", "kata dan kumite", "kata & kumite":
		return []string{"kata", "kumite"}
	default:
		// Fallback: support comma separated manual values
		parts := parseCommaSeparated(v)
		result := make([]string, 0, len(parts))
		seen := make(map[string]struct{}, len(parts))
		for _, part := range parts {
			normalized := strings.ToLower(strings.TrimSpace(part))
			if normalized != "kata" && normalized != "kumite" {
				continue
			}
			if _, ok := seen[normalized]; ok {
				continue
			}
			seen[normalized] = struct{}{}
			result = append(result, normalized)
		}
		return result
	}
}

func mapAgeToKelasKategori(age int) string {
	switch {
	case age >= 4 && age <= 5:
		return models.KelasTandingKategoriPraUsiaDini
	case age >= 6 && age <= 7:
		return models.KelasTandingKategoriUsiaDini
	case age >= 8 && age <= 9:
		return models.KelasTandingKategoriPraPemula
	case age >= 10 && age <= 11:
		return models.KelasTandingKategoriPemula
	case age >= 12 && age <= 13:
		return models.KelasTandingKategoriKadet
	case age >= 14 && age <= 15:
		return models.KelasTandingKategoriJunior
	case age >= 16 && age <= 20:
		return models.KelasTandingKategoriUnder21
	case age >= 21:
		return models.KelasTandingKategoriSenior
	default:
		return ""
	}
}

func calculateAgeAtReferenceDate(birthDate time.Time, referenceDate time.Time) int {
	age := referenceDate.Year() - birthDate.Year()
	if referenceDate.Month() < birthDate.Month() || (referenceDate.Month() == birthDate.Month() && referenceDate.Day() < birthDate.Day()) {
		age--
	}
	return age
}

func buildDependentKelasTandingOptions(items []models.EventKelasTandingItem) map[string][]string {
	kategoriKeys := []string{
		models.KelasTandingKategoriPraUsiaDini,
		models.KelasTandingKategoriUsiaDini,
		models.KelasTandingKategoriPraPemula,
		models.KelasTandingKategoriPemula,
		models.KelasTandingKategoriKadet,
		models.KelasTandingKategoriJunior,
		models.KelasTandingKategoriUnder21,
		models.KelasTandingKategoriSenior,
	}
	jenisKelaminKeys := []string{
		models.KelasTandingJenisKelaminLakiLaki,
		models.KelasTandingJenisKelaminPerempuan,
	}
	kategoriTandingKeys := []string{"kata", "kumite", "kata_dan_kumite"}

	result := make(map[string][]string)
	for _, kategori := range kategoriKeys {
		for _, jenisKelamin := range jenisKelaminKeys {
			for _, kategoriTanding := range kategoriTandingKeys {
				rangeName := kelasRangeName(kategori, jenisKelamin, kategoriTanding)
				labels := collectDependentKelasLabels(items, kategori, jenisKelamin, kategoriTanding)
				result[rangeName] = labels
			}

			weightRanges := extractWeightRanges(items, kategori, jenisKelamin)
			for _, wr := range weightRanges {
				kumiteRangeName := kelasRangeNameWithWeight(kategori, jenisKelamin, wr.lower, wr.upper)
				kumiteLabels := collectDependentKelasLabelsWithWeight(items, kategori, jenisKelamin, wr.lower, wr.upper)
				result[kumiteRangeName] = kumiteLabels

				combinedRangeName := kelasRangeNameCombinedWithWeight(kategori, jenisKelamin, wr.lower, wr.upper)
				kataLabels := collectDependentKelasLabels(items, kategori, jenisKelamin, "kata")
				result[combinedRangeName] = mergeUniqueSortedLabels(kataLabels, kumiteLabels)
			}
		}
	}

	return result
}

func collectDependentKelasLabels(items []models.EventKelasTandingItem, kategori string, jenisKelamin string, kategoriTanding string) []string {
	labels := make([]string, 0)
	seen := make(map[string]struct{})

	for _, item := range items {
		if item.Kategori != kategori {
			continue
		}
		if item.JenisKelamin != jenisKelamin {
			continue
		}

		itemJenis := strings.ToLower(strings.TrimSpace(item.Jenis))
		if kategoriTanding == "kata" && itemJenis != "kata" {
			continue
		}
		if kategoriTanding == "kumite" && itemJenis != "kumite" {
			continue
		}
		if kategoriTanding == "kata_dan_kumite" && itemJenis != "kata" && itemJenis != "kumite" {
			continue
		}

		label := strings.TrimSpace(item.Nama)
		if label == "" {
			continue
		}

		normalizedLabel := strings.ToLower(label)
		if _, ok := seen[normalizedLabel]; ok {
			continue
		}
		seen[normalizedLabel] = struct{}{}
		labels = append(labels, label)
	}

	sort.Strings(labels)
	return labels
}

func kelasRangeName(kategori string, jenisKelamin string, kategoriTanding string) string {
	return fmt.Sprintf("kelas_%s_%s_%s", kategori, sanitizeRangeToken(jenisKelamin), sanitizeRangeToken(kategoriTanding))
}

// kelasRangeNameWithWeight builds a weight-filtered named range name for kumite kelas.
func kelasRangeNameWithWeight(kategori string, jenisKelamin string, weightLower, weightUpper float64) string {
	return fmt.Sprintf("kelas_%s_%s_kumite_%s_%s", sanitizeRangeToken(kategori), sanitizeRangeToken(jenisKelamin), weightToken(weightLower), weightToken(weightUpper))
}

func kelasRangeNameCombinedWithWeight(kategori string, jenisKelamin string, weightLower, weightUpper float64) string {
	return fmt.Sprintf("kelas_%s_%s_kata_dan_kumite_%s_%s", sanitizeRangeToken(kategori), sanitizeRangeToken(jenisKelamin), weightToken(weightLower), weightToken(weightUpper))
}

func weightToken(value float64) string {
	token := strconv.FormatFloat(value, 'f', -1, 64)
	token = strings.ReplaceAll(token, "-", "n")
	token = strings.ReplaceAll(token, ".", "_")
	return token
}

type weightRange struct {
	lower float64
	upper float64
}

// extractWeightRanges collects all unique weight ranges from kumite kelas for a given kategori and jenis kelamin.
func extractWeightRanges(items []models.EventKelasTandingItem, kategori string, jenisKelamin string) []weightRange {
	seen := make(map[string]struct{})
	var ranges []weightRange

	for _, item := range items {
		if item.Kategori != kategori {
			continue
		}
		if item.JenisKelamin != jenisKelamin {
			continue
		}
		if strings.ToLower(strings.TrimSpace(item.Jenis)) != "kumite" {
			continue
		}
		if item.BatasBerat == nil {
			continue
		}

		key := fmt.Sprintf("%.1f_%.1f", item.BatasBerat.Bawah, item.BatasBerat.Atas)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		ranges = append(ranges, weightRange{lower: item.BatasBerat.Bawah, upper: item.BatasBerat.Atas})
	}

	// Sort by lower bound then upper bound
	sort.Slice(ranges, func(i, j int) bool {
		if ranges[i].lower != ranges[j].lower {
			return ranges[i].lower < ranges[j].lower
		}
		return ranges[i].upper < ranges[j].upper
	})

	return ranges
}

// collectDependentKelasLabelsWithWeight filters kumite kelas by weight range.
func collectDependentKelasLabelsWithWeight(items []models.EventKelasTandingItem, kategori string, jenisKelamin string, weightLower, weightUpper float64) []string {
	labels := make([]string, 0)
	seen := make(map[string]struct{})

	for _, item := range items {
		if item.Kategori != kategori {
			continue
		}
		if item.JenisKelamin != jenisKelamin {
			continue
		}
		if strings.ToLower(strings.TrimSpace(item.Jenis)) != "kumite" {
			continue
		}
		if item.BatasBerat == nil {
			continue
		}
		// Only include if weight range matches exactly
		if item.BatasBerat.Bawah != weightLower || item.BatasBerat.Atas != weightUpper {
			continue
		}

		label := strings.TrimSpace(item.Nama)
		if label == "" {
			continue
		}

		normalizedLabel := strings.ToLower(label)
		if _, ok := seen[normalizedLabel]; ok {
			continue
		}
		seen[normalizedLabel] = struct{}{}
		labels = append(labels, label)
	}

	sort.Strings(labels)
	return labels
}

func mergeUniqueSortedLabels(base []string, extras []string) []string {
	result := make([]string, 0, len(base)+len(extras))
	seen := make(map[string]struct{}, len(base)+len(extras))
	for _, label := range append(base, extras...) {
		trimmed := strings.TrimSpace(label)
		if trimmed == "" {
			continue
		}
		key := strings.ToLower(trimmed)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		result = append(result, trimmed)
	}
	sort.Strings(result)
	return result
}

// buildHelperFormulaWithWeightFiltering creates the formula for column K.
// For kumite: selects weight-specific named range (e.g., kelas_kadet_laki_kumite_50_55)
// For kata/kata_dan_kumite: selects standard named range
func buildHelperFormulaWithWeightFiltering(row int, referensiSheet string, weightRangesByKombinasi map[string][]weightRange) string {
	// Collect all unique weight ranges (sorted)
	allWeights := make([]weightRange, 0)
	seenWeights := make(map[string]struct{})
	for _, ranges := range weightRangesByKombinasi {
		for _, wr := range ranges {
			key := fmt.Sprintf("%s_%s", weightToken(wr.lower), weightToken(wr.upper))
			if _, ok := seenWeights[key]; ok {
				continue
			}
			seenWeights[key] = struct{}{}
			allWeights = append(allWeights, wr)
		}
	}

	sort.Slice(allWeights, func(i, j int) bool {
		if allWeights[i].lower != allWeights[j].lower {
			return allWeights[i].lower < allWeights[j].lower
		}
		return allWeights[i].upper < allWeights[j].upper
	})

	// Base checks: if empty, return empty
	checkEmpty := fmt.Sprintf(`OR(G%d="",G%d="Tidak Masuk Kategori",D%d="",F%d="")`, row, row, row, row)

	// Kategori key
	kategoriPart := fmt.Sprintf(`IF(G%d="Pra Usia Dini","pra_usia_dini",IF(G%d="Usia Dini","usia_dini",IF(G%d="Pra-Pemula","pra_pemula",IF(G%d="Pemula","pemula",IF(G%d="Kadet","kadet",IF(G%d="Junior","junior",IF(G%d="U-21","under_21",IF(G%d="Senior","senior",""))))))))`,
		row, row, row, row, row, row, row, row)

	// Gender key
	genderPart := fmt.Sprintf(`IF(LOWER(D%d)="laki-laki","laki_laki",IF(LOWER(D%d)="perempuan","perempuan",""))`, row, row)

	// Weight-aware range selector for kumite and kata_dan_kumite.
	weightedSuffixForKumite := ""
	weightedSuffixForCombined := ""
	for i, wr := range allWeights {
		kumiteSuffix := fmt.Sprintf("_kumite_%s_%s", weightToken(wr.lower), weightToken(wr.upper))
		combinedSuffix := fmt.Sprintf("_kata_dan_kumite_%s_%s", weightToken(wr.lower), weightToken(wr.upper))
		if i == 0 {
			weightedSuffixForKumite += fmt.Sprintf(`IF(AND(E%d>=%g,E%d<=%g),"%s",`, row, wr.lower, row, wr.upper, kumiteSuffix)
			weightedSuffixForCombined += fmt.Sprintf(`IF(AND(E%d>=%g,E%d<=%g),"%s",`, row, wr.lower, row, wr.upper, combinedSuffix)
		} else {
			weightedSuffixForKumite += fmt.Sprintf(`IF(AND(E%d>=%g,E%d<=%g),"%s",`, row, wr.lower, row, wr.upper, kumiteSuffix)
			weightedSuffixForCombined += fmt.Sprintf(`IF(AND(E%d>=%g,E%d<=%g),"%s",`, row, wr.lower, row, wr.upper, combinedSuffix)
		}
	}
	weightedSuffixForKumite += `""`
	weightedSuffixForCombined += `"_kata"`
	for range allWeights {
		weightedSuffixForKumite += `)`
		weightedSuffixForCombined += `)`
	}

	kumitePart := fmt.Sprintf(`"kelas_"&%s&"_"&%s&%s`, kategoriPart, genderPart, weightedSuffixForKumite)
	combinedPart := fmt.Sprintf(`"kelas_"&%s&"_"&%s&%s`, kategoriPart, genderPart, weightedSuffixForCombined)
	kataPart := fmt.Sprintf(`"kelas_"&%s&"_"&%s&"_kata"`, kategoriPart, genderPart)

	formula := fmt.Sprintf(`=IF(%s,"",IF(LOWER(F%d)="kumite",%s,IF(LOWER(F%d)="kata dan kumite",%s,%s)))`,
		checkEmpty, row, kumitePart, row, combinedPart, kataPart)

	return formula
}

func sanitizeRangeToken(value string) string {
	token := strings.ToLower(strings.TrimSpace(value))
	token = strings.ReplaceAll(token, "-", "_")
	token = strings.ReplaceAll(token, " ", "_")
	token = strings.ReplaceAll(token, "/", "_")
	return token
}

func firstNonEmptyDependentOption(options map[string][]string) string {
	rangeNames := make([]string, 0, len(options))
	for rangeName := range options {
		rangeNames = append(rangeNames, rangeName)
	}
	sort.Strings(rangeNames)

	for _, rangeName := range rangeNames {
		labels := options[rangeName]
		if len(labels) == 0 {
			continue
		}
		for _, label := range labels {
			label = strings.TrimSpace(label)
			if label != "" {
				return label
			}
		}
	}

	return ""
}

func (s *ParticipantService) getEventAndAssignedKelasTanding(ctx context.Context, eventID uuid.UUID) (*models.Event, []models.EventKelasTandingItem, error) {
	event, err := s.eventDB.GetByID(ctx, eventID)
	if err != nil {
		if err == models.ErrNotFound {
			return nil, nil, fmt.Errorf("event not found")
		}
		return nil, nil, err
	}

	kelasItems, err := s.eventKelasTandingDB.ListByEvent(ctx, eventID)
	if err != nil {
		return nil, nil, err
	}

	assigned := make([]models.EventKelasTandingItem, 0)
	for _, item := range kelasItems {
		if item.IsAssigned {
			assigned = append(assigned, item)
		}
	}

	return event, assigned, nil
}

func (s *ParticipantService) validateParticipantRowsAgainstEventKelasTanding(ctx context.Context, eventID uuid.UUID, rows []models.ParticipantRow) error {
	event, assignedKelasTanding, err := s.getEventAndAssignedKelasTanding(ctx, eventID)
	if err != nil {
		return err
	}

	if len(assignedKelasTanding) == 0 {
		return fmt.Errorf("event belum memiliki kelas tanding yang di-assign")
	}

	referenceDate := event.Time.StartAt
	if referenceDate.IsZero() {
		referenceDate = time.Now().UTC()
	}

	for idx, row := range rows {
		birthDate, err := time.Parse("2006-01-02", row.TanggalLahir)
		if err != nil {
			return fmt.Errorf("baris %d: tanggal_lahir tidak valid", idx+2)
		}

		age := calculateAgeAtReferenceDate(birthDate, referenceDate)
		kategoriUmur := mapAgeToKelasKategori(age)
		if kategoriUmur == "" {
			return fmt.Errorf("baris %d: usia %d tahun tidak masuk kategori umur yang didukung", idx+2, age)
		}

		jenisKelamin := normalizeJenisKelamin(row.JenisKelamin)
		if jenisKelamin == "" {
			return fmt.Errorf("baris %d: jenis_kelamin harus Perempuan atau Laki-laki", idx+2)
		}

		allowedJenis := make(map[string]struct{}, len(row.KategoriTanding))
		for _, jenis := range row.KategoriTanding {
			allowedJenis[strings.ToLower(strings.TrimSpace(jenis))] = struct{}{}
		}

		// allowedKelas maps lowercase kelas name → its BatasBerat config (nil for kata)
		allowedKelas := make(map[string]*models.BatasBerat)
		for _, kelas := range assignedKelasTanding {
			if kelas.Kategori != kategoriUmur {
				continue
			}
			if kelas.JenisKelamin != jenisKelamin {
				continue
			}
			if _, ok := allowedJenis[strings.ToLower(strings.TrimSpace(kelas.Jenis))]; !ok {
				continue
			}

			allowedKelas[strings.ToLower(strings.TrimSpace(kelas.Nama))] = kelas.BatasBerat
		}

		if len(allowedKelas) == 0 {
			if len(row.KelasTanding) > 0 {
				return fmt.Errorf("baris %d: tidak ada kelas tanding tersedia untuk kombinasi kategori umur, jenis kelamin, dan kategori tanding", idx+2)
			}
			continue
		}

		if len(row.KelasTanding) == 0 {
			return fmt.Errorf("baris %d: kelas_tanding wajib dipilih", idx+2)
		}

		for _, selectedKelas := range row.KelasTanding {
			key := strings.ToLower(strings.TrimSpace(selectedKelas))
			if key == "" {
				continue
			}
			batasBerat, ok := allowedKelas[key]
			if !ok {
				return fmt.Errorf("baris %d: kelas_tanding '%s' tidak sesuai dengan konfigurasi event", idx+2, selectedKelas)
			}
			// For kumite kelas that have a weight range, validate berat badan
			if batasBerat != nil {
				if row.BeratBadan < batasBerat.Bawah || row.BeratBadan > batasBerat.Atas {
					return fmt.Errorf("baris %d: berat badan %.1f kg tidak sesuai untuk kelas tanding '%s' (%.1f–%.1f kg)", idx+2, row.BeratBadan, selectedKelas, batasBerat.Bawah, batasBerat.Atas)
				}
			}
		}
	}

	return nil
}

func parseParticipantJSONList(raw json.RawMessage) []string {
	if len(raw) == 0 {
		return []string{}
	}

	var asStrings []string
	if err := json.Unmarshal(raw, &asStrings); err == nil {
		clean := make([]string, 0, len(asStrings))
		for _, value := range asStrings {
			value = strings.TrimSpace(value)
			if value != "" {
				clean = append(clean, value)
			}
		}
		if len(clean) > 0 {
			return clean
		}
	}

	var asObjects []map[string]any
	if err := json.Unmarshal(raw, &asObjects); err == nil {
		clean := make([]string, 0, len(asObjects))
		for _, obj := range asObjects {
			if label, ok := obj["label"].(string); ok && strings.TrimSpace(label) != "" {
				clean = append(clean, strings.TrimSpace(label))
				continue
			}
			if id, ok := obj["id"].(string); ok && strings.TrimSpace(id) != "" {
				clean = append(clean, strings.TrimSpace(id))
			}
		}
		if len(clean) > 0 {
			return clean
		}
	}

	trimmed := strings.TrimSpace(string(raw))
	if trimmed == "" {
		return []string{}
	}

	return []string{trimmed}
}

func formatParticipantJSONList(raw json.RawMessage) string {
	items := parseParticipantJSONList(raw)
	if len(items) == 0 {
		return "-"
	}

	return strings.Join(items, ", ")
}

func kategoriUmurLabelFromBirthDate(birthDateRaw string, referenceDate time.Time) string {
	normalizedBirthDate, err := normalizeBirthDate(birthDateRaw)
	if err != nil {
		return "-"
	}

	birthDate, err := time.Parse("2006-01-02", normalizedBirthDate)
	if err != nil {
		return "-"
	}

	age := calculateAgeAtReferenceDate(birthDate, referenceDate)
	switch mapAgeToKelasKategori(age) {
	case models.KelasTandingKategoriPraUsiaDini:
		return "Pra Usia Dini"
	case models.KelasTandingKategoriUsiaDini:
		return "Usia Dini"
	case models.KelasTandingKategoriPraPemula:
		return "Pra-Pemula"
	case models.KelasTandingKategoriPemula:
		return "Pemula"
	case models.KelasTandingKategoriKadet:
		return "Kadet"
	case models.KelasTandingKategoriJunior:
		return "Junior"
	case models.KelasTandingKategoriUnder21:
		return "U-21"
	case models.KelasTandingKategoriSenior:
		return "Senior"
	default:
		return "-"
	}
}

func humanizeRecommendationLetterStatus(status string) string {
	switch strings.TrimSpace(strings.ToLower(status)) {
	case models.DocumentStatusApproved:
		return "Disetujui"
	case models.DocumentStatusPending:
		return "Menunggu Persetujuan"
	case models.DocumentStatusNotUploaded, "":
		return "Belum Upload"
	default:
		return status
	}
}

func formatExcelDateTime(value time.Time) string {
	if value.IsZero() {
		return "-"
	}

	return formatIndonesianDate(value, true)
}

func formatExcelDate(raw string) string {
	normalized, err := normalizeBirthDate(raw)
	if err != nil {
		trimmed := strings.TrimSpace(raw)
		if trimmed == "" {
			return "-"
		}
		return trimmed
	}

	parsed, err := time.Parse("2006-01-02", normalized)
	if err != nil {
		return normalized
	}

	return formatIndonesianDate(parsed, false)
}

func formatIndonesianDate(value time.Time, includeTime bool) string {
	months := []string{
		"Januari",
		"Februari",
		"Maret",
		"April",
		"Mei",
		"Juni",
		"Juli",
		"Agustus",
		"September",
		"Oktober",
		"November",
		"Desember",
	}

	monthName := months[int(value.Month())-1]
	if includeTime {
		return fmt.Sprintf("%02d %s %d %02d:%02d", value.Day(), monthName, value.Year(), value.Hour(), value.Minute())
	}

	return fmt.Sprintf("%02d %s %d", value.Day(), monthName, value.Year())
}

func formatDojoDocumentCompletionPercentage(totalAthletes int, suratKesehatanUploaded int, aktaKelahiranUploaded int) string {
	if totalAthletes <= 0 {
		return "0%"
	}

	totalRequiredDocuments := totalAthletes * 2
	completedDocuments := suratKesehatanUploaded + aktaKelahiranUploaded
	percentage := (float64(completedDocuments) / float64(totalRequiredDocuments)) * 100

	return fmt.Sprintf("%.0f%%", percentage)
}

func normalizeBirthDate(rawValue string) (string, error) {
	value := strings.TrimSpace(rawValue)
	if value == "" {
		return "", fmt.Errorf("empty date")
	}

	// Remove common time suffixes emitted by spreadsheet/date formatting.
	if strings.Contains(value, "T") {
		if parsed, err := time.Parse(time.RFC3339, value); err == nil {
			return parsed.Format("2006-01-02"), nil
		}
	}
	value = strings.TrimSpace(strings.Split(value, " ")[0])

	layouts := []string{
		"2006-01-02",
		"2006/01/02",
		"2006-1-2",
		"2006/1/2",
		"02/01/2006",
		"2/1/2006",
		"01/02/2006", // MM/DD/YYYY
		"1/2/2006",   // M/D/YYYY
		"02-01-2006",
		"2-1-2006",
		"01-02-2006", // MM-DD-YYYY
		"1-2-2006",   // M-D-YYYY
		"02.01.2006",
		"2.1.2006",
		"02/01/06",
		"2/1/06",
		"01/02/06",
		"1/2/06",
		"02-01-06",
		"2-1-06",
		"01-02-06",
		"1-2-06",
		"2006-01-02T15:04:05",
		"2006-01-02T15:04",
		"2006-01-02 15:04:05",
		"2006-01-02 15:04",
		"02/01/2006 15:04:05",
		"02/01/2006 15:04",
		"01/02/2006 15:04:05",
		"01/02/2006 15:04",
	}

	for _, layout := range layouts {
		parsed, err := time.Parse(layout, value)
		if err == nil {
			return parsed.Format("2006-01-02"), nil
		}
	}

	if serial, err := strconv.ParseFloat(value, 64); err == nil && serial > 0 {
		parsed, convertErr := excelize.ExcelDateToTime(serial, false)
		if convertErr == nil {
			return parsed.Format("2006-01-02"), nil
		}
	}

	return "", fmt.Errorf("unsupported date format")
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
