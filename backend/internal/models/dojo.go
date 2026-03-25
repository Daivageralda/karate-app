package models

import (
	"mime/multipart"
	"time"

	"github.com/google/uuid"
)

// Dojo represents a dojo/perguruan master data item
type Dojo struct {
	ID        uuid.UUID `json:"uuid"`
	Name      string    `json:"name"`
	LogoURL   string    `json:"logo_url"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// CreateDojoInput is the input for creating a dojo
type CreateDojoInput struct {
	Name     string                `json:"name"`
	LogoFile *multipart.FileHeader `json:"-"`
}

// UpdateDojoInput is the input for updating a dojo
type UpdateDojoInput struct {
	Name     string                `json:"name"`
	LogoFile *multipart.FileHeader `json:"-"`
}

// DojoListResult is the result of listing dojos
type DojoListResult struct {
	Items []*Dojo        `json:"items"`
	Meta  PaginationMeta `json:"meta"`
}
