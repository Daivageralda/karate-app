package db

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"eo-karate/internal/models"
)

// ParticipantDB handles all participant-related database operations
type ParticipantDB struct {
	db *pgxpool.Pool
}

// NewParticipantDB creates a new ParticipantDB instance
func NewParticipantDB(db *pgxpool.Pool) *ParticipantDB {
	return &ParticipantDB{db: db}
}

// CreateBulk creates multiple participants from Excel data
func (p *ParticipantDB) CreateBulk(
	ctx context.Context,
	eventID, dojoID uuid.UUID,
	rows []models.ParticipantRow,
) ([]models.Participant, error) {
	queryCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	var results []models.Participant

	// Use a transaction for bulk insert
	tx, err := p.db.Begin(queryCtx)
	if err != nil {
		return nil, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(queryCtx)

	for _, row := range rows {
		kategoriJSON, err := json.Marshal(row.KategoriTanding)
		if err != nil {
			return nil, fmt.Errorf("marshal kategori_tanding: %w", err)
		}

		kelasJSON, err := json.Marshal(row.KelasTanding)
		if err != nil {
			return nil, fmt.Errorf("marshal kelas_tanding: %w", err)
		}

		id := uuid.New()
		query := `
			INSERT INTO participants (
				id, event_id, dojo_id, nama_lengkap, tempat_lahir,
				tanggal_lahir, jenis_kelamin, berat_badan, kategori_tanding, kelas_tanding, status
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
			RETURNING id, event_id, dojo_id, nama_lengkap, tempat_lahir, tanggal_lahir::text,
					jenis_kelamin, berat_badan, kategori_tanding, kelas_tanding, status, created_at, updated_at
		`

		var participant models.Participant
		err = tx.QueryRow(queryCtx, query,
			id, eventID, dojoID, row.NamaLengkap, row.TempatLahir,
			row.TanggalLahir, row.JenisKelamin, row.BeratBadan,
			kategoriJSON, kelasJSON, models.ParticipantStatusPending,
		).Scan(
			&participant.ID, &participant.EventID, &participant.DojoID,
			&participant.NamaLengkap, &participant.TempatLahir, &participant.TanggalLahir,
			&participant.JenisKelamin, &participant.BeratBadan,
			&participant.KategoriTanding, &participant.KelasTanding,
			&participant.Status, &participant.CreatedAt, &participant.UpdatedAt,
		)

		if err != nil {
			return nil, fmt.Errorf("insert participant: %w", err)
		}

		results = append(results, participant)
	}

	if err := tx.Commit(queryCtx); err != nil {
		return nil, fmt.Errorf("commit transaction: %w", err)
	}

	return results, nil
}

// GetByEventAndDojo returns all participants for a specific event and dojo
func (p *ParticipantDB) GetByEventAndDojo(
	ctx context.Context,
	eventID, dojoID uuid.UUID,
) ([]models.Participant, error) {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	query := `
		SELECT id, event_id, dojo_id, nama_lengkap, tempat_lahir, tanggal_lahir::text,
		       jenis_kelamin, berat_badan, kategori_tanding, kelas_tanding, status, created_at, updated_at
		FROM participants
		WHERE event_id = $1 AND dojo_id = $2
		ORDER BY created_at DESC
	`

	rows, err := p.db.Query(queryCtx, query, eventID, dojoID)
	if err != nil {
		return nil, fmt.Errorf("query participants: %w", err)
	}
	defer rows.Close()

	var participants []models.Participant
	for rows.Next() {
		var participant models.Participant
		err := rows.Scan(
			&participant.ID, &participant.EventID, &participant.DojoID,
			&participant.NamaLengkap, &participant.TempatLahir, &participant.TanggalLahir,
			&participant.JenisKelamin, &participant.BeratBadan,
			&participant.KategoriTanding, &participant.KelasTanding,
			&participant.Status, &participant.CreatedAt, &participant.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan participant: %w", err)
		}

		docs, err := p.ListDocuments(queryCtx, participant.ID)
		if err != nil {
			return nil, fmt.Errorf("load participant documents: %w", err)
		}
		participant.Documents = docs

		participants = append(participants, participant)
	}

	return participants, nil
}

// GetByID returns a single participant by ID with their documents
func (p *ParticipantDB) GetByID(
	ctx context.Context,
	participantID uuid.UUID,
) (*models.Participant, error) {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	query := `
		SELECT id, event_id, dojo_id, nama_lengkap, tempat_lahir, tanggal_lahir::text,
		       jenis_kelamin, berat_badan, kategori_tanding, kelas_tanding, status, created_at, updated_at
		FROM participants
		WHERE id = $1
	`

	var participant models.Participant
	err := p.db.QueryRow(queryCtx, query, participantID).Scan(
		&participant.ID, &participant.EventID, &participant.DojoID,
		&participant.NamaLengkap, &participant.TempatLahir, &participant.TanggalLahir,
		&participant.JenisKelamin, &participant.BeratBadan,
		&participant.KategoriTanding, &participant.KelasTanding,
		&participant.Status, &participant.CreatedAt, &participant.UpdatedAt,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("query participant: %w", err)
	}

	// Load documents
	docs, err := p.ListDocuments(queryCtx, participantID)
	if err != nil {
		return nil, err
	}
	participant.Documents = docs

	return &participant, nil
}

// CreateDocument creates a new participant document
func (p *ParticipantDB) CreateDocument(
	ctx context.Context,
	input models.UploadParticipantDocumentInput,
) (*models.ParticipantDocument, error) {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	id := uuid.New()
	query := `
		INSERT INTO participant_documents (id, participant_id, document_type, file_path, status)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, participant_id, document_type, file_path, uploaded_at, status
	`

	var doc models.ParticipantDocument
	err := p.db.QueryRow(queryCtx, query,
		id, input.ParticipantID, input.DocumentType, input.FilePath, models.DocumentStatusPending,
	).Scan(
		&doc.ID, &doc.ParticipantID, &doc.DocumentType, &doc.FilePath, &doc.UploadedAt, &doc.Status,
	)

	if err != nil {
		return nil, fmt.Errorf("insert document: %w", err)
	}

	return &doc, nil
}

// ListDocuments returns all documents for a participant
func (p *ParticipantDB) ListDocuments(
	ctx context.Context,
	participantID uuid.UUID,
) ([]models.ParticipantDocument, error) {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	query := `
		SELECT id, participant_id, document_type, file_path, uploaded_at, status
		FROM participant_documents
		WHERE participant_id = $1
		ORDER BY uploaded_at DESC
	`

	rows, err := p.db.Query(queryCtx, query, participantID)
	if err != nil {
		return nil, fmt.Errorf("query documents: %w", err)
	}
	defer rows.Close()

	var docs []models.ParticipantDocument
	for rows.Next() {
		var doc models.ParticipantDocument
		err := rows.Scan(
			&doc.ID, &doc.ParticipantID, &doc.DocumentType, &doc.FilePath, &doc.UploadedAt, &doc.Status,
		)
		if err != nil {
			return nil, fmt.Errorf("scan document: %w", err)
		}
		docs = append(docs, doc)
	}

	return docs, nil
}

// CreateRecommendationLetter creates a new recommendation letter
func (p *ParticipantDB) CreateRecommendationLetter(
	ctx context.Context,
	input models.UploadRecommendationLetterInput,
) (*models.DojoRecommendationLetter, error) {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	id := uuid.New()
	query := `
		INSERT INTO dojo_recommendation_letters (id, dojo_id, event_id, file_path, status)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (dojo_id, event_id) DO UPDATE SET file_path = $4, uploaded_at = NOW(), status = $5
		RETURNING id, dojo_id, event_id, file_path, uploaded_at, status
	`

	var letter models.DojoRecommendationLetter
	err := p.db.QueryRow(queryCtx, query,
		id, input.DojoID, input.EventID, input.FilePath, models.DocumentStatusPending,
	).Scan(
		&letter.ID, &letter.DojoID, &letter.EventID, &letter.FilePath, &letter.UploadedAt, &letter.Status,
	)

	if err != nil {
		return nil, fmt.Errorf("insert recommendation letter: %w", err)
	}

	return &letter, nil
}

// GetRecommendationLetter returns recommendation letter for a dojo and event
func (p *ParticipantDB) GetRecommendationLetter(
	ctx context.Context,
	dojoID, eventID uuid.UUID,
) (*models.DojoRecommendationLetter, error) {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	query := `
		SELECT id, dojo_id, event_id, file_path, uploaded_at, status
		FROM dojo_recommendation_letters
		WHERE dojo_id = $1 AND event_id = $2
	`

	var letter models.DojoRecommendationLetter
	err := p.db.QueryRow(queryCtx, query, dojoID, eventID).Scan(
		&letter.ID, &letter.DojoID, &letter.EventID, &letter.FilePath, &letter.UploadedAt, &letter.Status,
	)

	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("query recommendation letter: %w", err)
	}

	return &letter, nil
}

// GetStatusSummary returns the status summary for participants in an event
func (p *ParticipantDB) GetStatusSummary(
	ctx context.Context,
	eventID, dojoID uuid.UUID,
) (*models.ParticipantStatusSummary, error) {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	summary := &models.ParticipantStatusSummary{}

	// Get total participants
	query := `SELECT COUNT(*) FROM participants WHERE event_id = $1 AND dojo_id = $2`
	err := p.db.QueryRow(queryCtx, query, eventID, dojoID).Scan(&summary.TotalParticipants)
	if err != nil {
		return nil, fmt.Errorf("count participants: %w", err)
	}

	// Get approved participants
	query = `SELECT COUNT(*) FROM participants WHERE event_id = $1 AND dojo_id = $2 AND status = $3`
	err = p.db.QueryRow(queryCtx, query, eventID, dojoID, models.ParticipantStatusApproved).Scan(&summary.ApprovedParticipants)
	if err != nil {
		return nil, fmt.Errorf("count approved: %w", err)
	}

	// Get health data documents uploaded
	query = `
		SELECT COUNT(DISTINCT pd.participant_id) FROM participant_documents pd
		JOIN participants p ON pd.participant_id = p.id
		WHERE p.event_id = $1 AND p.dojo_id = $2 AND pd.document_type = $3
	`
	_ = p.db.QueryRow(queryCtx, query, eventID, dojoID, models.DocumentTypeSuratKesehatan).
		Scan(&summary.SuratKesehatan)

	// Get birth certificate documents uploaded
	_ = p.db.QueryRow(queryCtx, query, eventID, dojoID, models.DocumentTypeAktaKelahiran).
		Scan(&summary.AktaKelahiran)

	// Get recommendation letter status
	letterQuery := `
		SELECT status FROM dojo_recommendation_letters
		WHERE event_id = $1 AND dojo_id = $2
	`
	var letterStatus *string
	err = p.db.QueryRow(queryCtx, letterQuery, eventID, dojoID).Scan(&letterStatus)
	if err != nil && err != pgx.ErrNoRows {
		return nil, fmt.Errorf("query letter status: %w", err)
	}

	if letterStatus != nil {
		summary.RecommendationLetterStatus = *letterStatus
	} else {
		summary.RecommendationLetterStatus = models.DocumentStatusNotUploaded
	}

	return summary, nil
}

// DeleteDojoRegistration deletes participant registration data for a dojo in an event.
// It is blocked when recommendation letter status is approved (overall dojo registration approved).
func (p *ParticipantDB) DeleteDojoRegistration(
	ctx context.Context,
	eventID, dojoID uuid.UUID,
) (*models.DeleteDojoRegistrationResult, error) {
	queryCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	tx, err := p.db.Begin(queryCtx)
	if err != nil {
		return nil, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(queryCtx)

	letterQuery := `
		SELECT status
		FROM dojo_recommendation_letters
		WHERE event_id = $1 AND dojo_id = $2
	`

	var recommendationStatus string
	err = tx.QueryRow(queryCtx, letterQuery, eventID, dojoID).Scan(&recommendationStatus)
	if err != nil && err != pgx.ErrNoRows {
		return nil, fmt.Errorf("query recommendation letter status: %w", err)
	}

	if err == nil && recommendationStatus == models.DocumentStatusApproved {
		return nil, fmt.Errorf("registration already approved and cannot be deleted")
	}

	countDocsQuery := `
		SELECT COUNT(*)
		FROM participant_documents pd
		JOIN participants p ON p.id = pd.participant_id
		WHERE p.event_id = $1 AND p.dojo_id = $2
	`

	var deletedDocuments int
	if err := tx.QueryRow(queryCtx, countDocsQuery, eventID, dojoID).Scan(&deletedDocuments); err != nil {
		return nil, fmt.Errorf("count participant documents: %w", err)
	}

	deleteParticipantsQuery := `
		DELETE FROM participants
		WHERE event_id = $1 AND dojo_id = $2
	`

	deletedParticipantsTag, err := tx.Exec(queryCtx, deleteParticipantsQuery, eventID, dojoID)
	if err != nil {
		return nil, fmt.Errorf("delete participants: %w", err)
	}

	deleteRecommendationQuery := `
		DELETE FROM dojo_recommendation_letters
		WHERE event_id = $1 AND dojo_id = $2
	`

	deletedRecommendationTag, err := tx.Exec(queryCtx, deleteRecommendationQuery, eventID, dojoID)
	if err != nil {
		return nil, fmt.Errorf("delete recommendation letter: %w", err)
	}

	if err := tx.Commit(queryCtx); err != nil {
		return nil, fmt.Errorf("commit transaction: %w", err)
	}

	result := &models.DeleteDojoRegistrationResult{
		DeletedParticipants:         int(deletedParticipantsTag.RowsAffected()),
		DeletedDocuments:            deletedDocuments,
		DeletedRecommendationLetter: deletedRecommendationTag.RowsAffected() > 0,
	}

	return result, nil
}

// DeleteParticipantByDojo deletes one participant from a dojo registration in an event.
// It is blocked when overall dojo registration is already approved.
func (p *ParticipantDB) DeleteParticipantByDojo(
	ctx context.Context,
	eventID, dojoID, participantID uuid.UUID,
) error {
	queryCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	tx, err := p.db.Begin(queryCtx)
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback(queryCtx)

	letterQuery := `
		SELECT status
		FROM dojo_recommendation_letters
		WHERE event_id = $1 AND dojo_id = $2
	`

	var recommendationStatus string
	err = tx.QueryRow(queryCtx, letterQuery, eventID, dojoID).Scan(&recommendationStatus)
	if err != nil && err != pgx.ErrNoRows {
		return fmt.Errorf("query recommendation letter status: %w", err)
	}

	if err == nil && recommendationStatus == models.DocumentStatusApproved {
		return fmt.Errorf("registration already approved and participant cannot be deleted")
	}

	deleteParticipantQuery := `
		DELETE FROM participants
		WHERE id = $1 AND event_id = $2 AND dojo_id = $3
	`

	deleteTag, err := tx.Exec(queryCtx, deleteParticipantQuery, participantID, eventID, dojoID)
	if err != nil {
		return fmt.Errorf("delete participant: %w", err)
	}

	if deleteTag.RowsAffected() == 0 {
		return fmt.Errorf("participant not found")
	}

	if err := tx.Commit(queryCtx); err != nil {
		return fmt.Errorf("commit transaction: %w", err)
	}

	return nil
}
