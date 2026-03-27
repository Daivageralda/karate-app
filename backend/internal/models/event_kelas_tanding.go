package models

import (
	"time"

	"github.com/google/uuid"
)

// EventKelasTandingItem represents a kelas tanding option for event assignment.
type EventKelasTandingItem struct {
	ID           uuid.UUID   `json:"uuid"`
	Nama         string      `json:"nama"`
	Jenis        string      `json:"jenis"`
	Kategori     string      `json:"kategori"`
	BatasBerat   *BatasBerat `json:"batas_berat,omitempty"`
	JenisKelamin string      `json:"jenis_kelamin"`
	Harga        int64       `json:"harga"`
	IsAssigned   bool        `json:"is_assigned"`
	CreatedAt    time.Time   `json:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at"`
}

// EventKelasTandingAssignments groups assigned and unassigned kelas tanding.
type EventKelasTandingAssignments struct {
	AssignedItems   []EventKelasTandingItem `json:"assigned_items"`
	UnassignedItems []EventKelasTandingItem `json:"unassigned_items"`
}

// AssignEventKelasTandingInput represents single assignment payload.
type AssignEventKelasTandingInput struct {
	KelasTandingID uuid.UUID `json:"kelas_tanding_id"`
	Harga          *int64    `json:"harga"`
}
