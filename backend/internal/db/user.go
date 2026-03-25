package db

import (
	"context"
	"database/sql"
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

// UserDB handles all user-related database operations
type UserDB struct {
	db *pgxpool.Pool
}

// NewUserDB creates a new UserDB instance
func NewUserDB(db *pgxpool.Pool) *UserDB {
	return &UserDB{db: db}
}

// Create creates a new user
func (u *UserDB) Create(ctx context.Context, input models.CreateUserInput, passwordHash string) (*models.User, error) {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	id := uuid.New()
	query := `
		INSERT INTO users (
			id,
			name,
			email,
			password_hash,
			role,
			dojo_id,
			is_active,
			last_login,
			is_verified,
			verified_at,
			reset_token,
			reset_token_expiry,
			created_by,
			updated_by
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULLIF($11, ''), $12, $13, $14)
		RETURNING id
	`

	err := u.db.QueryRow(
		queryCtx,
		query,
		id,
		input.Name,
		input.Email,
		passwordHash,
		input.Role,
		input.DojoID,
		input.IsActive,
		input.LastLogin,
		input.IsVerified,
		input.VerifiedAt,
		input.ResetToken,
		input.ResetTokenExpiry,
		input.CreatedBy,
		input.UpdatedBy,
	).Scan(&id)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, models.ErrConflict
		}

		return nil, fmt.Errorf("insert user: %w", err)
	}

	return u.GetByID(ctx, id)
}

// GetByID retrieves a user by ID
func (u *UserDB) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	query := `
		SELECT
			u.id,
			u.name,
			u.email,
			u.password_hash,
			u.role,
			u.dojo_id::text,
			COALESCE(d.name, ''),
			u.is_active,
			u.last_login,
			u.is_verified,
			u.verified_at,
			COALESCE(u.reset_token, ''),
			u.reset_token_expiry,
			u.created_by::text,
			u.updated_by::text,
			u.created_at,
			u.updated_at
		FROM users u
		LEFT JOIN dojos d ON d.id = u.dojo_id
		WHERE u.id = $1
	`

	user, err := scanUser(u.db.QueryRow(queryCtx, query, id))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, models.ErrNotFound
		}

		return nil, fmt.Errorf("get user by id: %w", err)
	}

	return user, nil
}

// GetByEmail retrieves a user by email
func (u *UserDB) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	query := `
		SELECT
			u.id,
			u.name,
			u.email,
			u.password_hash,
			u.role,
			u.dojo_id::text,
			COALESCE(d.name, ''),
			u.is_active,
			u.last_login,
			u.is_verified,
			u.verified_at,
			COALESCE(u.reset_token, ''),
			u.reset_token_expiry,
			u.created_by::text,
			u.updated_by::text,
			u.created_at,
			u.updated_at
		FROM users u
		LEFT JOIN dojos d ON d.id = u.dojo_id
		WHERE LOWER(u.email) = LOWER($1)
	`

	user, err := scanUser(u.db.QueryRow(queryCtx, query, email))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, models.ErrNotFound
		}

		return nil, fmt.Errorf("get user by email: %w", err)
	}

	return user, nil
}

// Update updates an existing user
func (u *UserDB) Update(
	ctx context.Context,
	id uuid.UUID,
	input models.UpdateUserInput,
	passwordHash *string,
) (*models.User, error) {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	query := `
		UPDATE users
		SET
			name = $2,
			email = $3,
			password_hash = COALESCE($4, password_hash),
			role = $5,
			dojo_id = $6,
			is_active = $7,
			last_login = $8,
			is_verified = $9,
			verified_at = $10,
			reset_token = NULLIF($11, ''),
			reset_token_expiry = $12,
			created_by = $13,
			updated_by = $14,
			updated_at = NOW()
		WHERE id = $1
		RETURNING id
	`

	err := u.db.QueryRow(
		queryCtx,
		query,
		id,
		input.Name,
		input.Email,
		passwordHash,
		input.Role,
		input.DojoID,
		input.IsActive,
		input.LastLogin,
		input.IsVerified,
		input.VerifiedAt,
		input.ResetToken,
		input.ResetTokenExpiry,
		input.CreatedBy,
		input.UpdatedBy,
	).Scan(&id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, models.ErrNotFound
		}

		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, models.ErrConflict
		}

		return nil, fmt.Errorf("update user: %w", err)
	}

	return u.GetByID(ctx, id)
}

// UpdateLastLogin updates user last_login timestamp
func (u *UserDB) UpdateLastLogin(ctx context.Context, id uuid.UUID, at time.Time) error {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	commandTag, err := u.db.Exec(
		queryCtx,
		`UPDATE users SET last_login = $2, updated_at = NOW() WHERE id = $1`,
		id,
		at,
	)
	if err != nil {
		return fmt.Errorf("update user last login: %w", err)
	}

	if commandTag.RowsAffected() == 0 {
		return models.ErrNotFound
	}

	return nil
}

// Delete deletes a user by ID
func (u *UserDB) Delete(ctx context.Context, id uuid.UUID) error {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	commandTag, err := u.db.Exec(queryCtx, `DELETE FROM users WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete user: %w", err)
	}

	if commandTag.RowsAffected() == 0 {
		return models.ErrNotFound
	}

	return nil
}

// List retrieves users with pagination
func (u *UserDB) List(ctx context.Context, query models.PaginationQuery) (*models.UserListResult, error) {
	queryCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	queryLimit := query.Limit + 1

	statement := `
		SELECT
			u.id,
			u.name,
			u.email,
			u.password_hash,
			u.role,
			u.dojo_id::text,
			COALESCE(d.name, ''),
			u.is_active,
			u.last_login,
			u.is_verified,
			u.verified_at,
			COALESCE(u.reset_token, ''),
			u.reset_token_expiry,
			u.created_by::text,
			u.updated_by::text,
			u.created_at,
			u.updated_at
		FROM users u
		LEFT JOIN dojos d ON d.id = u.dojo_id
		ORDER BY u.created_at DESC, u.id DESC
		LIMIT $1
	`

	args := []any{queryLimit}
	if query.Cursor != "" {
		cursorCreatedAt, cursorID, err := utils.DecodeUserCursor(query.Cursor)
		if err != nil {
			return nil, err
		}

		switch query.Direction {
		case models.CursorDirectionNext:
			statement = `
				SELECT
					u.id,
					u.name,
					u.email,
					u.password_hash,
					u.role,
					u.dojo_id::text,
					COALESCE(d.name, ''),
					u.is_active,
					u.last_login,
					u.is_verified,
					u.verified_at,
					COALESCE(u.reset_token, ''),
					u.reset_token_expiry,
					u.created_by::text,
					u.updated_by::text,
					u.created_at,
					u.updated_at
				FROM users u
				LEFT JOIN dojos d ON d.id = u.dojo_id
				WHERE u.created_at < $1 OR (u.created_at = $1 AND u.id < $2)
				ORDER BY u.created_at DESC, u.id DESC
				LIMIT $3
			`
			args = []any{cursorCreatedAt, cursorID, queryLimit}
		case models.CursorDirectionPrev:
			statement = `
				SELECT
					u.id,
					u.name,
					u.email,
					u.password_hash,
					u.role,
					u.dojo_id::text,
					COALESCE(d.name, ''),
					u.is_active,
					u.last_login,
					u.is_verified,
					u.verified_at,
					COALESCE(u.reset_token, ''),
					u.reset_token_expiry,
					u.created_by::text,
					u.updated_by::text,
					u.created_at,
					u.updated_at
				FROM users u
				LEFT JOIN dojos d ON d.id = u.dojo_id
				WHERE u.created_at > $1 OR (u.created_at = $1 AND u.id > $2)
				ORDER BY u.created_at ASC, u.id ASC
				LIMIT $3
			`
			args = []any{cursorCreatedAt, cursorID, queryLimit}
		}
	}

	rows, err := u.db.Query(queryCtx, statement, args...)
	if err != nil {
		return nil, fmt.Errorf("list users: %w", err)
	}
	defer rows.Close()

	users := make([]*models.User, 0)
	for rows.Next() {
		user, err := scanUser(rows)
		if err != nil {
			return nil, fmt.Errorf("scan user row: %w", err)
		}

		users = append(users, user)
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate user rows: %w", err)
	}

	reverseFetchedOrder := query.Direction == models.CursorDirectionPrev && query.Cursor != ""
	users, meta := utils.FinalizeCursorPagination(users, query, func(item *models.User) string {
		return utils.EncodeUserCursor(item.CreatedAt, item.ID)
	}, reverseFetchedOrder)

	if query.Direction == models.CursorDirectionPrev && query.Cursor == "" {
		meta.HasPrev = false
		meta.PrevCursor = ""
	}

	return &models.UserListResult{
		Items: users,
		Meta:  meta,
	}, nil
}

type userRowScanner interface {
	Scan(dest ...any) error
}

func scanUser(scanner userRowScanner) (*models.User, error) {
	user := &models.User{}
	var dojoIDText sql.NullString
	var dojoName string
	var lastLogin sql.NullTime
	var verifiedAt sql.NullTime
	var resetToken string
	var resetTokenExpiry sql.NullTime
	var createdByText sql.NullString
	var updatedByText sql.NullString

	err := scanner.Scan(
		&user.ID,
		&user.Name,
		&user.Email,
		&user.PasswordHash,
		&user.Role,
		&dojoIDText,
		&dojoName,
		&user.IsActive,
		&lastLogin,
		&user.IsVerified,
		&verifiedAt,
		&resetToken,
		&resetTokenExpiry,
		&createdByText,
		&updatedByText,
		&user.CreatedAt,
		&user.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	if dojoIDText.Valid {
		dojoID, parseErr := uuid.Parse(dojoIDText.String)
		if parseErr != nil {
			return nil, fmt.Errorf("parse dojo id: %w", parseErr)
		}
		user.DojoID = &dojoID
	}

	user.DojoName = dojoName

	if lastLogin.Valid {
		value := lastLogin.Time
		user.LastLogin = &value
	}

	if verifiedAt.Valid {
		value := verifiedAt.Time
		user.VerifiedAt = &value
	}

	user.ResetToken = resetToken

	if resetTokenExpiry.Valid {
		value := resetTokenExpiry.Time
		user.ResetTokenExpiry = &value
	}

	if createdByText.Valid {
		createdByID, parseErr := uuid.Parse(createdByText.String)
		if parseErr != nil {
			return nil, fmt.Errorf("parse created_by: %w", parseErr)
		}
		user.CreatedBy = &createdByID
	}

	if updatedByText.Valid {
		updatedByID, parseErr := uuid.Parse(updatedByText.String)
		if parseErr != nil {
			return nil, fmt.Errorf("parse updated_by: %w", parseErr)
		}
		user.UpdatedBy = &updatedByID
	}

	return user, nil
}
