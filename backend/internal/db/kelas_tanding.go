package db

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"eo-karate/internal/models"
	"eo-karate/internal/utils"
)

// KelasTandingDB handles kelas_tanding-related database operations
type KelasTandingDB struct {
	db *pgxpool.Pool
}

// NewKelasTandingDB creates a new KelasTandingDB instance
func NewKelasTandingDB(db *pgxpool.Pool) *KelasTandingDB {
	return &KelasTandingDB{db: db}
}

// Create creates a kelas_tanding record
func (d *KelasTandingDB) Create(ctx context.Context, input models.CreateKelasTandingInput) (*models.KelasTanding, error) {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var batasBeratJSON []byte
	if input.BatasBerat != nil {
		var err error
		batasBeratJSON, err = json.Marshal(input.BatasBerat)
		if err != nil {
			return nil, fmt.Errorf("marshal batas_berat: %w", err)
		}
	}

	query := `
		INSERT INTO kelas_tanding (id, nama, jenis, kategori, batas_berat, jenis_kelamin)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, nama, jenis, kategori, batas_berat, jenis_kelamin, created_at, updated_at
	`

	item := &models.KelasTanding{}
	var scannedBatasBerat []byte

	err := d.db.QueryRow(queryCtx, query,
		uuid.New(),
		input.Nama,
		input.Jenis,
		input.Kategori,
		batasBeratJSON,
		input.JenisKelamin,
	).Scan(
		&item.ID,
		&item.Nama,
		&item.Jenis,
		&item.Kategori,
		&scannedBatasBerat,
		&item.JenisKelamin,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert kelas_tanding: %w", err)
	}

	if scannedBatasBerat != nil {
		item.BatasBerat = &models.BatasBerat{}
		if err := json.Unmarshal(scannedBatasBerat, item.BatasBerat); err != nil {
			return nil, fmt.Errorf("unmarshal batas_berat: %w", err)
		}
	}

	return item, nil
}

// GetByID retrieves kelas_tanding by ID
func (d *KelasTandingDB) GetByID(ctx context.Context, id uuid.UUID) (*models.KelasTanding, error) {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	item := &models.KelasTanding{}
	var scannedBatasBerat []byte

	query := `
		SELECT id, nama, jenis, kategori, batas_berat, jenis_kelamin, created_at, updated_at
		FROM kelas_tanding
		WHERE id = $1
	`

	err := d.db.QueryRow(queryCtx, query, id).Scan(
		&item.ID,
		&item.Nama,
		&item.Jenis,
		&item.Kategori,
		&scannedBatasBerat,
		&item.JenisKelamin,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, models.ErrNotFound
		}

		return nil, fmt.Errorf("get kelas_tanding by id: %w", err)
	}

	if scannedBatasBerat != nil {
		item.BatasBerat = &models.BatasBerat{}
		if err := json.Unmarshal(scannedBatasBerat, item.BatasBerat); err != nil {
			return nil, fmt.Errorf("unmarshal batas_berat: %w", err)
		}
	}

	return item, nil
}

// Update updates a kelas_tanding record
func (d *KelasTandingDB) Update(ctx context.Context, id uuid.UUID, input models.UpdateKelasTandingInput) (*models.KelasTanding, error) {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	var batasBeratJSON []byte
	if input.BatasBerat != nil {
		var err error
		batasBeratJSON, err = json.Marshal(input.BatasBerat)
		if err != nil {
			return nil, fmt.Errorf("marshal batas_berat: %w", err)
		}
	}

	query := `
		UPDATE kelas_tanding
		SET
			nama = $2,
			jenis = $3,
			kategori = $4,
			batas_berat = $5,
			jenis_kelamin = $6,
			updated_at = NOW()
		WHERE id = $1
		RETURNING id, nama, jenis, kategori, batas_berat, jenis_kelamin, created_at, updated_at
	`

	item := &models.KelasTanding{}
	var scannedBatasBerat []byte

	err := d.db.QueryRow(queryCtx, query,
		id,
		input.Nama,
		input.Jenis,
		input.Kategori,
		batasBeratJSON,
		input.JenisKelamin,
	).Scan(
		&item.ID,
		&item.Nama,
		&item.Jenis,
		&item.Kategori,
		&scannedBatasBerat,
		&item.JenisKelamin,
		&item.CreatedAt,
		&item.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, models.ErrNotFound
		}

		return nil, fmt.Errorf("update kelas_tanding: %w", err)
	}

	if scannedBatasBerat != nil {
		item.BatasBerat = &models.BatasBerat{}
		if err := json.Unmarshal(scannedBatasBerat, item.BatasBerat); err != nil {
			return nil, fmt.Errorf("unmarshal batas_berat: %w", err)
		}
	}

	return item, nil
}

// Delete deletes a kelas_tanding by ID
func (d *KelasTandingDB) Delete(ctx context.Context, id uuid.UUID) error {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	commandTag, err := d.db.Exec(queryCtx, `DELETE FROM kelas_tanding WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete kelas_tanding: %w", err)
	}

	if commandTag.RowsAffected() == 0 {
		return models.ErrNotFound
	}

	return nil
}

// List retrieves kelas_tanding with cursor pagination
func (d *KelasTandingDB) List(ctx context.Context, query models.PaginationQuery) (*models.KelasTandingListResult, error) {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	queryLimit := query.Limit + 1
	cols := `id, nama, jenis, kategori, batas_berat, jenis_kelamin, created_at, updated_at`

	statement := fmt.Sprintf(`
		SELECT %s
		FROM kelas_tanding
		ORDER BY created_at DESC, id DESC
		LIMIT $1
	`, cols)

	args := []any{queryLimit}

	if query.Cursor != "" {
		cursorCreatedAt, cursorID, err := utils.DecodeKelasTandingCursor(query.Cursor)
		if err != nil {
			return nil, err
		}

		switch query.Direction {
		case models.CursorDirectionNext:
			statement = fmt.Sprintf(`
				SELECT %s
				FROM kelas_tanding
				WHERE created_at < $1 OR (created_at = $1 AND id < $2)
				ORDER BY created_at DESC, id DESC
				LIMIT $3
			`, cols)
			args = []any{cursorCreatedAt, cursorID, queryLimit}
		case models.CursorDirectionPrev:
			statement = fmt.Sprintf(`
				SELECT %s
				FROM kelas_tanding
				WHERE created_at > $1 OR (created_at = $1 AND id > $2)
				ORDER BY created_at ASC, id ASC
				LIMIT $3
			`, cols)
			args = []any{cursorCreatedAt, cursorID, queryLimit}
		}
	}

	rows, err := d.db.Query(queryCtx, statement, args...)
	if err != nil {
		return nil, fmt.Errorf("list kelas_tanding: %w", err)
	}
	defer rows.Close()

	items := make([]*models.KelasTanding, 0)
	for rows.Next() {
		item := &models.KelasTanding{}
		var scannedBatasBerat []byte

		if err := rows.Scan(
			&item.ID,
			&item.Nama,
			&item.Jenis,
			&item.Kategori,
			&scannedBatasBerat,
			&item.JenisKelamin,
			&item.CreatedAt,
			&item.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan kelas_tanding row: %w", err)
		}

		if scannedBatasBerat != nil {
			item.BatasBerat = &models.BatasBerat{}
			if err := json.Unmarshal(scannedBatasBerat, item.BatasBerat); err != nil {
				return nil, fmt.Errorf("unmarshal batas_berat: %w", err)
			}
		}

		items = append(items, item)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate kelas_tanding rows: %w", err)
	}

	reverseFetchedOrder := query.Direction == models.CursorDirectionPrev && query.Cursor != ""
	items, meta := utils.FinalizeCursorPagination(items, query, func(item *models.KelasTanding) string {
		return utils.EncodeKelasTandingCursor(item.CreatedAt, item.ID)
	}, reverseFetchedOrder)

	if query.Direction == models.CursorDirectionPrev && query.Cursor == "" {
		meta.HasPrev = false
		meta.PrevCursor = ""
	}

	return &models.KelasTandingListResult{
		Items: items,
		Meta:  meta,
	}, nil
}
