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

// EventKelasTandingDB handles event-kelas_tanding assignment operations.
type EventKelasTandingDB struct {
	db *pgxpool.Pool
}

// NewEventKelasTandingDB creates a new EventKelasTandingDB instance.
func NewEventKelasTandingDB(db *pgxpool.Pool) *EventKelasTandingDB {
	return &EventKelasTandingDB{db: db}
}

// EventExists checks whether an event exists.
func (e *EventKelasTandingDB) EventExists(ctx context.Context, eventID uuid.UUID) (bool, error) {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var exists bool
	err := e.db.QueryRow(queryCtx, `SELECT EXISTS(SELECT 1 FROM events WHERE id = $1)`, eventID).Scan(&exists)
	if err != nil {
		return false, fmt.Errorf("check event existence: %w", err)
	}

	return exists, nil
}

// CountKelasTandingIDs returns the number of existing kelas tanding IDs from the provided list.
func (e *EventKelasTandingDB) CountKelasTandingIDs(ctx context.Context, ids []uuid.UUID) (int, error) {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var count int
	err := e.db.QueryRow(queryCtx, `SELECT COUNT(*) FROM kelas_tanding WHERE id = ANY($1::uuid[])`, ids).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count kelas_tanding ids: %w", err)
	}

	return count, nil
}

// ListByEvent returns all kelas tanding options with assignment flag for an event.
func (e *EventKelasTandingDB) ListByEvent(ctx context.Context, eventID uuid.UUID) ([]models.EventKelasTandingItem, error) {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	query := `
		SELECT
			kt.id,
			kt.nama,
			kt.jenis,
			kt.kategori,
			kt.batas_berat,
			kt.jenis_kelamin,
			(ekt.id IS NOT NULL) AS is_assigned,
			kt.created_at,
			kt.updated_at
		FROM kelas_tanding kt
		LEFT JOIN event_kelas_tanding ekt
			ON ekt.kelas_tanding_id = kt.id AND ekt.event_id = $1
		ORDER BY kt.kategori ASC, kt.jenis ASC, kt.jenis_kelamin ASC, kt.nama ASC
	`

	rows, err := e.db.Query(queryCtx, query, eventID)
	if err != nil {
		return nil, fmt.Errorf("list kelas_tanding by event: %w", err)
	}
	defer rows.Close()

	items := make([]models.EventKelasTandingItem, 0)
	for rows.Next() {
		item := models.EventKelasTandingItem{}
		var batasBeratRaw []byte

		err := rows.Scan(
			&item.ID,
			&item.Nama,
			&item.Jenis,
			&item.Kategori,
			&batasBeratRaw,
			&item.JenisKelamin,
			&item.IsAssigned,
			&item.CreatedAt,
			&item.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan kelas_tanding assignment row: %w", err)
		}

		if len(batasBeratRaw) > 0 && string(batasBeratRaw) != "null" {
			var batasBerat models.BatasBerat
			if err := json.Unmarshal(batasBeratRaw, &batasBerat); err != nil {
				return nil, fmt.Errorf("unmarshal batas_berat: %w", err)
			}
			item.BatasBerat = &batasBerat
		}

		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate kelas_tanding assignment rows: %w", err)
	}

	return items, nil
}

// AssignMany assigns many kelas tanding IDs to an event.
func (e *EventKelasTandingDB) AssignMany(ctx context.Context, eventID uuid.UUID, kelasTandingIDs []uuid.UUID) error {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if len(kelasTandingIDs) == 0 {
		return nil
	}

	tx, err := e.db.Begin(queryCtx)
	if err != nil {
		return fmt.Errorf("begin event_kelas_tanding assignment tx: %w", err)
	}
	defer tx.Rollback(queryCtx)

	query := `
		INSERT INTO event_kelas_tanding (id, event_id, kelas_tanding_id)
		VALUES ($1, $2, $3)
		ON CONFLICT (event_id, kelas_tanding_id) DO UPDATE SET updated_at = NOW()
	`

	batch := &pgx.Batch{}
	for _, kelasTandingID := range kelasTandingIDs {
		batch.Queue(query, uuid.New(), eventID, kelasTandingID)
	}

	br := tx.SendBatch(queryCtx, batch)
	if err := br.Close(); err != nil {
		return fmt.Errorf("assign kelas_tanding to event: %w", err)
	}

	if err := tx.Commit(queryCtx); err != nil {
		return fmt.Errorf("commit event_kelas_tanding assignment tx: %w", err)
	}

	return nil
}

// Unassign removes one kelas tanding assignment from an event.
func (e *EventKelasTandingDB) Unassign(ctx context.Context, eventID, kelasTandingID uuid.UUID) error {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if _, err := e.db.Exec(queryCtx, `DELETE FROM event_kelas_tanding WHERE event_id = $1 AND kelas_tanding_id = $2`, eventID, kelasTandingID); err != nil {
		return fmt.Errorf("unassign kelas_tanding from event: %w", err)
	}

	return nil
}
