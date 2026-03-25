package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// Participant represents a participant/athlete in an event
type Participant struct {
	ID              uuid.UUID             `json:"uuid"`
	EventID         uuid.UUID             `json:"event_id"`
	DojoID          uuid.UUID             `json:"dojo_id"`
	NamaLengkap     string                `json:"nama_lengkap"`
	TempatLahir     string                `json:"tempat_lahir"`
	TanggalLahir    string                `json:"tanggal_lahir"` // YYYY-MM-DD format
	JenisKelamin    string                `json:"jenis_kelamin"`
	BeratBadan      float64               `json:"berat_badan"`
	KategoriTanding json.RawMessage       `json:"kategori_tanding"` // JSON array
	KelasTanding    json.RawMessage       `json:"kelas_tanding"`    // JSON array
	Status          string                `json:"status"`
	CreatedAt       time.Time             `json:"created_at"`
	UpdatedAt       time.Time             `json:"updated_at"`
	Documents       []ParticipantDocument `json:"documents,omitempty"`
}

// ParticipantDocument represents uploaded documents for a participant
type ParticipantDocument struct {
	ID            uuid.UUID `json:"uuid"`
	ParticipantID uuid.UUID `json:"participant_id"`
	DocumentType  string    `json:"document_type"` // surat_kesehatan, akta_kelahiran
	FilePath      string    `json:"file_path"`
	UploadedAt    time.Time `json:"uploaded_at"`
	Status        string    `json:"status"`
}

// DojoRecommendationLetter represents a recommendation letter from a dojo for an event
type DojoRecommendationLetter struct {
	ID         uuid.UUID `json:"uuid"`
	DojoID     uuid.UUID `json:"dojo_id"`
	EventID    uuid.UUID `json:"event_id"`
	FilePath   string    `json:"file_path"`
	UploadedAt time.Time `json:"uploaded_at"`
	Status     string    `json:"status"`
}

// ParticipantStatus constants
const (
	ParticipantStatusPending  = "pending"
	ParticipantStatusApproved = "approved"
)

// DocumentType constants
const (
	DocumentTypeSuratKesehatan = "surat_kesehatan"
	DocumentTypeAktaKelahiran  = "akta_kelahiran"
)

// DocumentStatus constants
const (
	DocumentStatusPending     = "pending"
	DocumentStatusApproved    = "approved"
	DocumentStatusNotUploaded = "not_uploaded"
)

// DeleteDojoRegistrationResult contains summary of deleted dojo registration data.
type DeleteDojoRegistrationResult struct {
	DeletedParticipants         int  `json:"deleted_participants"`
	DeletedDocuments            int  `json:"deleted_documents"`
	DeletedRecommendationLetter bool `json:"deleted_recommendation_letter"`
}

// DummyKategoriTanding returns dummy kategori tanding options as JSON
func DummyKategoriTanding() []map[string]string {
	return []map[string]string{
		{"id": "kata", "label": "Kata"},
		{"id": "kumite", "label": "Kumite"},
	}
}

// DummyKelasTanding returns dummy kelas tanding options as JSON
func DummyKelasTanding() []map[string]string {
	return []map[string]string{
		{"id": "class_u8", "label": "U-8"},
		{"id": "class_u10", "label": "U-10"},
		{"id": "class_u12", "label": "U-12"},
		{"id": "class_u14", "label": "U-14"},
		{"id": "class_u16", "label": "U-16"},
		{"id": "class_u18", "label": "U-18"},
		{"id": "class_adult", "label": "Adult"},
	}
}

// BulkCreateParticipantsInput represents input for bulk creating participants from Excel
type BulkCreateParticipantsInput struct {
	EventID      uuid.UUID
	DojoID       uuid.UUID
	Participants []ParticipantRow
}

// ParticipantRow represents a single row from Excel
type ParticipantRow struct {
	NamaLengkap     string
	TempatLahir     string
	TanggalLahir    string
	JenisKelamin    string
	BeratBadan      float64
	KategoriTanding []string // as array
	KelasTanding    []string // as array
}

// UploadParticipantDocumentInput represents input for uploading a participant document
type UploadParticipantDocumentInput struct {
	ParticipantID uuid.UUID
	DocumentType  string
	FilePath      string
}

// UploadRecommendationLetterInput represents input for uploading a recommendation letter
type UploadRecommendationLetterInput struct {
	DojoID   uuid.UUID
	EventID  uuid.UUID
	FilePath string
}

// ParticipantStatusSummary represents the status summary for participants in an event
type ParticipantStatusSummary struct {
	TotalParticipants          int    `json:"total_participants"`
	ApprovedParticipants       int    `json:"approved_participants"`
	SuratKesehatan             int    `json:"surat_kesehatan_uploaded"`
	SuratKesehatanApproved     int    `json:"surat_kesehatan_approved"`
	AktaKelahiran              int    `json:"akta_kelahiran_uploaded"`
	AktaKelahiranApproved      int    `json:"akta_kelahiran_approved"`
	RecommendationLetterStatus string `json:"recommendation_letter_status"` // pending, approved
}

// UploadedParticipantsExcelPreview represents persisted preview data for the latest uploaded participant Excel file.
type UploadedParticipantsExcelPreview struct {
	FileName   string     `json:"file_name"`
	Headers    []string   `json:"headers"`
	Rows       [][]string `json:"rows"`
	UploadedAt time.Time  `json:"uploaded_at"`
}
