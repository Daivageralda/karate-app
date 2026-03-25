package db

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"eo-karate/internal/models"
	"eo-karate/internal/utils"
)

// DojoDB handles dojo-related database operations
type DojoDB struct {
	db *pgxpool.Pool
}

// NewDojoDB creates a new DojoDB instance
func NewDojoDB(db *pgxpool.Pool) *DojoDB {
	return &DojoDB{db: db}
}

// Create creates a dojo record
func (d *DojoDB) Create(ctx context.Context, input models.CreateDojoInput, logoURL string) (*models.Dojo, error) {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	dojo := &models.Dojo{}
	query := `
		INSERT INTO dojos (id, name, logo_url)
		VALUES ($1, $2, $3)
		RETURNING id, name, logo_url, created_at, updated_at
	`

	err := d.db.QueryRow(queryCtx, query, uuid.New(), input.Name, logoURL).Scan(
		&dojo.ID,
		&dojo.Name,
		&dojo.LogoURL,
		&dojo.CreatedAt,
		&dojo.UpdatedAt,
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, models.ErrConflict
		}

		return nil, fmt.Errorf("insert dojo: %w", err)
	}

	return dojo, nil
}

// GetByID retrieves dojo by ID
func (d *DojoDB) GetByID(ctx context.Context, id uuid.UUID) (*models.Dojo, error) {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	dojo := &models.Dojo{}
	query := `
		SELECT id, name, logo_url, created_at, updated_at
		FROM dojos
		WHERE id = $1
	`

	err := d.db.QueryRow(queryCtx, query, id).Scan(
		&dojo.ID,
		&dojo.Name,
		&dojo.LogoURL,
		&dojo.CreatedAt,
		&dojo.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, models.ErrNotFound
		}

		return nil, fmt.Errorf("get dojo by id: %w", err)
	}

	return dojo, nil
}

// Update updates dojo record
func (d *DojoDB) Update(ctx context.Context, id uuid.UUID, input models.UpdateDojoInput, logoURL string) (*models.Dojo, error) {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	dojo := &models.Dojo{}
	query := `
		UPDATE dojos
		SET
			name = $2,
			logo_url = $3,
			updated_at = NOW()
		WHERE id = $1
		RETURNING id, name, logo_url, created_at, updated_at
	`

	err := d.db.QueryRow(queryCtx, query, id, input.Name, logoURL).Scan(
		&dojo.ID,
		&dojo.Name,
		&dojo.LogoURL,
		&dojo.CreatedAt,
		&dojo.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, models.ErrNotFound
		}

		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, models.ErrConflict
		}

		return nil, fmt.Errorf("update dojo: %w", err)
	}

	return dojo, nil
}

// Delete deletes dojo by ID
func (d *DojoDB) Delete(ctx context.Context, id uuid.UUID) error {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	commandTag, err := d.db.Exec(queryCtx, `DELETE FROM dojos WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete dojo: %w", err)
	}

	if commandTag.RowsAffected() == 0 {
		return models.ErrNotFound
	}

	return nil
}

// List retrieves dojos with cursor pagination
func (d *DojoDB) List(ctx context.Context, query models.PaginationQuery) (*models.DojoListResult, error) {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	queryLimit := query.Limit + 1

	statement := `
		SELECT id, name, logo_url, created_at, updated_at
		FROM dojos
		ORDER BY created_at DESC, id DESC
		LIMIT $1
	`

	args := []any{queryLimit}
	if query.Cursor != "" {
		cursorCreatedAt, cursorID, err := utils.DecodeDojoCursor(query.Cursor)
		if err != nil {
			return nil, err
		}

		switch query.Direction {
		case models.CursorDirectionNext:
			statement = `
				SELECT id, name, logo_url, created_at, updated_at
				FROM dojos
				WHERE created_at < $1 OR (created_at = $1 AND id < $2)
				ORDER BY created_at DESC, id DESC
				LIMIT $3
			`
			args = []any{cursorCreatedAt, cursorID, queryLimit}
		case models.CursorDirectionPrev:
			statement = `
				SELECT id, name, logo_url, created_at, updated_at
				FROM dojos
				WHERE created_at > $1 OR (created_at = $1 AND id > $2)
				ORDER BY created_at ASC, id ASC
				LIMIT $3
			`
			args = []any{cursorCreatedAt, cursorID, queryLimit}
		}
	}

	rows, err := d.db.Query(queryCtx, statement, args...)
	if err != nil {
		return nil, fmt.Errorf("list dojos: %w", err)
	}
	defer rows.Close()

	dojos := make([]*models.Dojo, 0)
	for rows.Next() {
		dojo := &models.Dojo{}
		if err := rows.Scan(
			&dojo.ID,
			&dojo.Name,
			&dojo.LogoURL,
			&dojo.CreatedAt,
			&dojo.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan dojo row: %w", err)
		}

		dojos = append(dojos, dojo)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate dojo rows: %w", err)
	}

	reverseFetchedOrder := query.Direction == models.CursorDirectionPrev && query.Cursor != ""
	dojos, meta := utils.FinalizeCursorPagination(dojos, query, func(item *models.Dojo) string {
		return utils.EncodeDojoCursor(item.CreatedAt, item.ID)
	}, reverseFetchedOrder)

	if query.Direction == models.CursorDirectionPrev && query.Cursor == "" {
		meta.HasPrev = false
		meta.PrevCursor = ""
	}

	return &models.DojoListResult{
		Items: dojos,
		Meta:  meta,
	}, nil
}
