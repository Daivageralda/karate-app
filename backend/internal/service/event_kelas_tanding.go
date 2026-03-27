package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"

	"eo-karate/internal/db"
	"eo-karate/internal/models"
)

// EventKelasTandingService contains business logic for event-kelas_tanding assignment.
type EventKelasTandingService struct {
	eventKelasTandingDB *db.EventKelasTandingDB
}

// NewEventKelasTandingService creates a new EventKelasTandingService instance.
func NewEventKelasTandingService(eventKelasTandingDB *db.EventKelasTandingDB) *EventKelasTandingService {
	return &EventKelasTandingService{eventKelasTandingDB: eventKelasTandingDB}
}

// GetAssignments returns assigned and unassigned kelas tanding for one event.
func (s *EventKelasTandingService) GetAssignments(ctx context.Context, eventID uuid.UUID) (*models.EventKelasTandingAssignments, error) {
	if eventID == uuid.Nil {
		return nil, fmt.Errorf("event_id is required")
	}

	exists, err := s.eventKelasTandingDB.EventExists(ctx, eventID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, models.ErrNotFound
	}

	items, err := s.eventKelasTandingDB.ListByEvent(ctx, eventID)
	if err != nil {
		return nil, err
	}

	result := &models.EventKelasTandingAssignments{
		AssignedItems:   make([]models.EventKelasTandingItem, 0),
		UnassignedItems: make([]models.EventKelasTandingItem, 0),
	}

	for _, item := range items {
		if item.IsAssigned {
			result.AssignedItems = append(result.AssignedItems, item)
			continue
		}

		result.UnassignedItems = append(result.UnassignedItems, item)
	}

	return result, nil
}

// AssignOne assigns one kelas tanding to an event with a harga.
func (s *EventKelasTandingService) AssignOne(ctx context.Context, eventID, kelasTandingID uuid.UUID, harga int64) (*models.EventKelasTandingAssignments, error) {
	if eventID == uuid.Nil {
		return nil, fmt.Errorf("event_id is required")
	}
	if kelasTandingID == uuid.Nil {
		return nil, fmt.Errorf("kelas_tanding_id is required")
	}
	if harga < 0 {
		return nil, fmt.Errorf("harga cannot be negative")
	}

	exists, err := s.eventKelasTandingDB.EventExists(ctx, eventID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, models.ErrNotFound
	}

	kelasTandingExists, err := s.eventKelasTandingDB.KelasTandingExists(ctx, kelasTandingID)
	if err != nil {
		return nil, err
	}
	if !kelasTandingExists {
		return nil, fmt.Errorf("kelas_tanding_id is invalid")
	}

	if err := s.eventKelasTandingDB.AssignOne(ctx, eventID, kelasTandingID, harga); err != nil {
		return nil, err
	}

	return s.GetAssignments(ctx, eventID)
}

// UnassignOne removes one kelas tanding assignment from an event.
func (s *EventKelasTandingService) UnassignOne(ctx context.Context, eventID, kelasTandingID uuid.UUID) (*models.EventKelasTandingAssignments, error) {
	if eventID == uuid.Nil {
		return nil, fmt.Errorf("event_id is required")
	}
	if kelasTandingID == uuid.Nil {
		return nil, fmt.Errorf("kelas_tanding_id is required")
	}

	exists, err := s.eventKelasTandingDB.EventExists(ctx, eventID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, models.ErrNotFound
	}

	if err := s.eventKelasTandingDB.Unassign(ctx, eventID, kelasTandingID); err != nil {
		return nil, err
	}

	return s.GetAssignments(ctx, eventID)
}
