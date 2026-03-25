package models

import "errors"

// Common errors
var (
	ErrNotFound         = errors.New("resource not found")
	ErrConflict         = errors.New("resource already exists")
	ErrInvalidCursor    = errors.New("invalid cursor")
	ErrInvalidDirection = errors.New("invalid pagination direction")
	ErrUnauthorized     = errors.New("unauthorized")
)
