package db

import (
	"context"
	"encoding/json"
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

// EventDB handles all event-related database operations
type EventDB struct {
	db *pgxpool.Pool
}

// NewEventDB creates a new EventDB instance
func NewEventDB(db *pgxpool.Pool) *EventDB {
	return &EventDB{db: db}
}

// Create creates a new event
func (e *EventDB) Create(
	ctx context.Context,
	input models.CreateEventInput,
	bannerURL string,
	attachments []models.EventAttachment,
) (*models.Event, error) {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	timeJSON, err := json.Marshal(input.Time)
	if err != nil {
		return nil, fmt.Errorf("marshal time window: %w", err)
	}

	organizerJSON, err := json.Marshal(input.Organizer)
	if err != nil {
		return nil, fmt.Errorf("marshal organizer: %w", err)
	}

	locationJSON, err := json.Marshal(input.Location)
	if err != nil {
		return nil, fmt.Errorf("marshal location: %w", err)
	}

	attachmentsJSON, err := json.Marshal(attachments)
	if err != nil {
		return nil, fmt.Errorf("marshal attachments: %w", err)
	}

	configJSON, err := json.Marshal(input.Config)
	if err != nil {
		return nil, fmt.Errorf("marshal config: %w", err)
	}

	bankTransferJSON, err := json.Marshal(input.BankTransfer)
	if err != nil {
		return nil, fmt.Errorf("marshal bank transfer: %w", err)
	}

	id := uuid.New()
	query := `
		INSERT INTO events (
			id,
			name,
			slug,
			description,
			start_at,
			time_window,
			organizer,
			location,
			banner_url,
			attachments,
			event_config,
			bank_transfer
		)
		VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9, $10::jsonb, $11::jsonb, $12::jsonb)
		RETURNING id, name, slug, description, start_at, time_window, organizer, location, banner_url, attachments, event_config, bank_transfer, created_at, updated_at
	`

	event, err := scanEvent(
		e.db.QueryRow(
			queryCtx,
			query,
			id,
			input.Name,
			input.Slug,
			input.Description,
			input.Time.StartAt,
			string(timeJSON),
			string(organizerJSON),
			string(locationJSON),
			bannerURL,
			string(attachmentsJSON),
			string(configJSON),
			string(bankTransferJSON),
		),
	)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, models.ErrConflict
		}

		return nil, fmt.Errorf("insert event: %w", err)
	}

	return event, nil
}

// Update updates an existing event
func (e *EventDB) Update(
	ctx context.Context,
	id uuid.UUID,
	input models.UpdateEventInput,
	bannerURL string,
	attachments []models.EventAttachment,
) (*models.Event, error) {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	timeJSON, err := json.Marshal(input.Time)
	if err != nil {
		return nil, fmt.Errorf("marshal time window: %w", err)
	}

	organizerJSON, err := json.Marshal(input.Organizer)
	if err != nil {
		return nil, fmt.Errorf("marshal organizer: %w", err)
	}

	locationJSON, err := json.Marshal(input.Location)
	if err != nil {
		return nil, fmt.Errorf("marshal location: %w", err)
	}

	attachmentsJSON, err := json.Marshal(attachments)
	if err != nil {
		return nil, fmt.Errorf("marshal attachments: %w", err)
	}

	configJSON, err := json.Marshal(input.Config)
	if err != nil {
		return nil, fmt.Errorf("marshal config: %w", err)
	}

	bankTransferJSON, err := json.Marshal(input.BankTransfer)
	if err != nil {
		return nil, fmt.Errorf("marshal bank transfer: %w", err)
	}

	query := `
		UPDATE events
		SET
			name = $2,
			slug = $3,
			description = $4,
			start_at = $5,
			time_window = $6::jsonb,
			organizer = $7::jsonb,
			location = $8::jsonb,
			banner_url = $9,
			attachments = $10::jsonb,
			event_config = $11::jsonb,
			bank_transfer = $12::jsonb,
			updated_at = NOW()
		WHERE id = $1
		RETURNING id, name, slug, description, start_at, time_window, organizer, location, banner_url, attachments, event_config, bank_transfer, created_at, updated_at
	`

	event, err := scanEvent(
		e.db.QueryRow(
			queryCtx,
			query,
			id,
			input.Name,
			input.Slug,
			input.Description,
			input.Time.StartAt,
			string(timeJSON),
			string(organizerJSON),
			string(locationJSON),
			bannerURL,
			string(attachmentsJSON),
			string(configJSON),
			string(bankTransferJSON),
		),
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, models.ErrNotFound
		}

		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, models.ErrConflict
		}

		return nil, fmt.Errorf("update event: %w", err)
	}

	return event, nil
}

// Delete deletes an event by ID
func (e *EventDB) Delete(ctx context.Context, id uuid.UUID) error {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	commandTag, err := e.db.Exec(queryCtx, `DELETE FROM events WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete event: %w", err)
	}

	if commandTag.RowsAffected() == 0 {
		return models.ErrNotFound
	}

	return nil
}

// GetByID retrieves an event by ID
func (e *EventDB) GetByID(ctx context.Context, id uuid.UUID) (*models.Event, error) {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	query := `
		SELECT id, name, slug, description, start_at, time_window, organizer, location, banner_url, attachments, event_config, bank_transfer, created_at, updated_at
		FROM events
		WHERE id = $1
	`

	event, err := scanEvent(e.db.QueryRow(queryCtx, query, id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, models.ErrNotFound
		}

		return nil, fmt.Errorf("get event by id: %w", err)
	}

	return event, nil
}

// List retrieves events with pagination
func (e *EventDB) List(ctx context.Context, query models.PaginationQuery) (*models.EventListResult, error) {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	queryLimit := query.Limit + 1

	statement := `
		SELECT id, name, slug, description, start_at, time_window, organizer, location, banner_url, attachments, event_config, bank_transfer, created_at, updated_at
		FROM events
		ORDER BY start_at ASC, id ASC
		LIMIT $1
	`

	args := []any{queryLimit}
	if query.Cursor != "" {
		cursorStartAt, cursorID, err := utils.DecodeEventCursor(query.Cursor)
		if err != nil {
			return nil, err
		}

		switch query.Direction {
		case models.CursorDirectionNext:
			statement = `
				SELECT id, name, slug, description, start_at, time_window, organizer, location, banner_url, attachments, event_config, bank_transfer, created_at, updated_at
				FROM events
				WHERE start_at > $1 OR (start_at = $1 AND id > $2)
				ORDER BY start_at ASC, id ASC
				LIMIT $3
			`
			args = []any{cursorStartAt, cursorID, queryLimit}
		case models.CursorDirectionPrev:
			statement = `
				SELECT id, name, slug, description, start_at, time_window, organizer, location, banner_url, attachments, event_config, bank_transfer, created_at, updated_at
				FROM events
				WHERE start_at < $1 OR (start_at = $1 AND id < $2)
				ORDER BY start_at DESC, id DESC
				LIMIT $3
			`
			args = []any{cursorStartAt, cursorID, queryLimit}
		}
	}

	rows, err := e.db.Query(queryCtx, statement, args...)
	if err != nil {
		return nil, fmt.Errorf("list events: %w", err)
	}
	defer rows.Close()

	events := make([]*models.Event, 0)
	for rows.Next() {
		event, err := scanEvent(rows)
		if err != nil {
			return nil, fmt.Errorf("scan event row: %w", err)
		}

		events = append(events, event)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate event rows: %w", err)
	}

	reverseFetchedOrder := query.Direction == models.CursorDirectionPrev && query.Cursor != ""
	events, meta := utils.FinalizeCursorPagination(events, query, func(item *models.Event) string {
		return utils.EncodeEventCursor(item.Time.StartAt, item.ID)
	}, reverseFetchedOrder)

	if query.Direction == models.CursorDirectionPrev && query.Cursor == "" {
		meta.HasPrev = false
		meta.PrevCursor = ""
	}

	return &models.EventListResult{
		Items: events,
		Meta:  meta,
	}, nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanEvent(scanner rowScanner) (*models.Event, error) {
	event := &models.Event{}
	var startAt time.Time
	var timeJSON []byte
	var organizerJSON []byte
	var locationJSON []byte
	var attachmentsJSON []byte
	var configJSON []byte
	var bankTransferJSON []byte

	err := scanner.Scan(
		&event.ID,
		&event.Name,
		&event.Slug,
		&event.Description,
		&startAt,
		&timeJSON,
		&organizerJSON,
		&locationJSON,
		&event.BannerURL,
		&attachmentsJSON,
		&configJSON,
		&bankTransferJSON,
		&event.CreatedAt,
		&event.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if err := json.Unmarshal(timeJSON, &event.Time); err != nil {
		return nil, fmt.Errorf("unmarshal time window: %w", err)
	}

	if event.Time.StartAt.IsZero() {
		event.Time.StartAt = startAt
	}

	if err := json.Unmarshal(organizerJSON, &event.Organizer); err != nil {
		return nil, fmt.Errorf("unmarshal organizer: %w", err)
	}

	if err := json.Unmarshal(locationJSON, &event.Location); err != nil {
		return nil, fmt.Errorf("unmarshal location: %w", err)
	}

	if err := json.Unmarshal(attachmentsJSON, &event.Attachments); err != nil {
		return nil, fmt.Errorf("unmarshal attachments: %w", err)
	}

	if err := json.Unmarshal(configJSON, &event.Config); err != nil {
		return nil, fmt.Errorf("unmarshal config: %w", err)
	}

	if len(bankTransferJSON) > 0 {
		if err := json.Unmarshal(bankTransferJSON, &event.BankTransfer); err != nil {
			return nil, fmt.Errorf("unmarshal bank transfer: %w", err)
		}
	}

	return event, nil
}
