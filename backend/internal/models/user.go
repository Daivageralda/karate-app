package models

import (
	"time"

	"github.com/google/uuid"
)

// User represents a user in the system
type User struct {
	ID               uuid.UUID  `json:"uuid"`
	Name             string     `json:"name"`
	Email            string     `json:"email"`
	Role             string     `json:"role"`
	DojoID           *uuid.UUID `json:"dojo_id,omitempty"`
	DojoName         string     `json:"dojo_name,omitempty"`
	IsActive         bool       `json:"is_active"`
	LastLogin        *time.Time `json:"last_login,omitempty"`
	IsVerified       bool       `json:"is_verified"`
	VerifiedAt       *time.Time `json:"verified_at,omitempty"`
	ResetToken       string     `json:"reset_token,omitempty"`
	ResetTokenExpiry *time.Time `json:"reset_token_expiry,omitempty"`
	CreatedBy        *uuid.UUID `json:"created_by,omitempty"`
	UpdatedBy        *uuid.UUID `json:"updated_by,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
	PasswordHash     string     `json:"-"`
}

const (
	UserRoleSuperAdmin = "super_admin"
	UserRoleDojoAdmin  = "dojo_admin"
)

// CreateUserInput is the input for creating a user
type CreateUserInput struct {
	Name             string     `json:"name"`
	Email            string     `json:"email"`
	Password         string     `json:"password"`
	Role             string     `json:"role"`
	DojoID           *uuid.UUID `json:"dojo_id,omitempty"`
	IsActive         bool       `json:"is_active"`
	LastLogin        *time.Time `json:"last_login,omitempty"`
	IsVerified       bool       `json:"is_verified"`
	VerifiedAt       *time.Time `json:"verified_at,omitempty"`
	ResetToken       string     `json:"reset_token,omitempty"`
	ResetTokenExpiry *time.Time `json:"reset_token_expiry,omitempty"`
	CreatedBy        *uuid.UUID `json:"created_by,omitempty"`
	UpdatedBy        *uuid.UUID `json:"updated_by,omitempty"`
}

// UpdateUserInput is the input for updating a user
type UpdateUserInput struct {
	Name             string     `json:"name"`
	Email            string     `json:"email"`
	Password         string     `json:"password"`
	Role             string     `json:"role"`
	DojoID           *uuid.UUID `json:"dojo_id,omitempty"`
	IsActive         bool       `json:"is_active"`
	LastLogin        *time.Time `json:"last_login,omitempty"`
	IsVerified       bool       `json:"is_verified"`
	VerifiedAt       *time.Time `json:"verified_at,omitempty"`
	ResetToken       string     `json:"reset_token,omitempty"`
	ResetTokenExpiry *time.Time `json:"reset_token_expiry,omitempty"`
	CreatedBy        *uuid.UUID `json:"created_by,omitempty"`
	UpdatedBy        *uuid.UUID `json:"updated_by,omitempty"`
}

// UserListResult is the result of listing users
type UserListResult struct {
	Items []*User        `json:"items"`
	Meta  PaginationMeta `json:"meta"`
}

// AuthRegisterInput is the input payload for auth register
type AuthRegisterInput struct {
	Name     string     `json:"name"`
	Email    string     `json:"email"`
	Password string     `json:"password"`
	DojoID   *uuid.UUID `json:"dojo_id,omitempty"`
}

// AuthLoginInput is the input payload for auth login
type AuthLoginInput struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// AuthLoginResult is the result payload for auth login
type AuthLoginResult struct {
	User *User `json:"user"`
}
