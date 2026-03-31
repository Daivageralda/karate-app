package models

import (
	"mime/multipart"
	"time"

	"github.com/google/uuid"
)

// Event represents an event in the system
type Event struct {
	ID           uuid.UUID         `json:"uuid"`
	Name         string            `json:"name"`
	Slug         string            `json:"slug"`
	Description  string            `json:"description"`
	Time         EventTimeWindow   `json:"time"`
	Organizer    EventOrganizer    `json:"organizer"`
	Location     EventLocation     `json:"location"`
	BannerURL    string            `json:"banner_url"`
	Attachments  []EventAttachment `json:"attachments"`
	Config       EventConfig       `json:"config"`
	BankTransfer EventBankTransfer `json:"bank_transfer"`
	CreatedAt    time.Time         `json:"created_at"`
	UpdatedAt    time.Time         `json:"updated_at"`
}

// EventTimeWindow stores start/end times and registration deadline
type EventTimeWindow struct {
	StartAt              time.Time `json:"start_at"`
	EndAt                time.Time `json:"end_at"`
	RegistrationDeadline time.Time `json:"registration_deadline"`
}

// EventOrganizer stores organizer details
type EventOrganizer struct {
	Name  string `json:"name"`
	Email string `json:"email"`
}

// EventLocation stores event location details
type EventLocation struct {
	Name    string `json:"name"`
	Address string `json:"address"`
	City    string `json:"city"`
}

// EventAttachment stores uploaded attachment metadata
type EventAttachment struct {
	FileName    string `json:"file_name"`
	FileURL     string `json:"file_url"`
	ContentType string `json:"content_type"`
	Size        int64  `json:"size"`
}

// EventConfig stores event runtime config
type EventConfig struct {
	Status             string `json:"status"`
	IsRegistrationOpen bool   `json:"is_registration_open"`
	MaxParticipants    int    `json:"max_participants"`
}

// EventBankTransfer stores manual payment bank account details for an event
type EventBankTransfer struct {
	BankName      string `json:"bank_name"`
	AccountName   string `json:"account_name"`
	AccountNumber string `json:"account_number"`
}

// CreateEventInput is the input for creating an event
type CreateEventInput struct {
	Name         string                  `json:"name"`
	Slug         string                  `json:"slug"`
	Description  string                  `json:"description"`
	Time         EventTimeWindow         `json:"time"`
	Organizer    EventOrganizer          `json:"organizer"`
	Location     EventLocation           `json:"location"`
	Config       EventConfig             `json:"config"`
	BankTransfer EventBankTransfer       `json:"bank_transfer"`
	BannerFile   *multipart.FileHeader   `json:"-"`
	Attachments  []*multipart.FileHeader `json:"-"`
}

// UpdateEventInput is the input for updating an event
type UpdateEventInput struct {
	Name         string                  `json:"name"`
	Slug         string                  `json:"slug"`
	Description  string                  `json:"description"`
	Time         EventTimeWindow         `json:"time"`
	Organizer    EventOrganizer          `json:"organizer"`
	Location     EventLocation           `json:"location"`
	Config       EventConfig             `json:"config"`
	BankTransfer EventBankTransfer       `json:"bank_transfer"`
	BannerFile   *multipart.FileHeader   `json:"-"`
	Attachments  []*multipart.FileHeader `json:"-"`
}

// EventListResult is the result of listing events
type EventListResult struct {
	Items []*Event       `json:"items"`
	Meta  PaginationMeta `json:"meta"`
}
