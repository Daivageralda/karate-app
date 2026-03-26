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

// AssignOne assigns one kelas tanding to an event.
func (s *EventKelasTandingService) AssignOne(ctx context.Context, eventID, kelasTandingID uuid.UUID) (*models.EventKelasTandingAssignments, error) {
	return s.AssignBulk(ctx, eventID, []uuid.UUID{kelasTandingID})
}

// AssignBulk assigns multiple kelas tanding to an event.
func (s *EventKelasTandingService) AssignBulk(ctx context.Context, eventID uuid.UUID, kelasTandingIDs []uuid.UUID) (*models.EventKelasTandingAssignments, error) {
	if eventID == uuid.Nil {
		return nil, fmt.Errorf("event_id is required")
	}

	uniqueIDs := make([]uuid.UUID, 0, len(kelasTandingIDs))
	seen := make(map[uuid.UUID]struct{}, len(kelasTandingIDs))

	for _, id := range kelasTandingIDs {
		if id == uuid.Nil {
			continue
		}
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		uniqueIDs = append(uniqueIDs, id)
	}

	if len(uniqueIDs) == 0 {
		return nil, fmt.Errorf("kelas_tanding_ids is required")
	}

	exists, err := s.eventKelasTandingDB.EventExists(ctx, eventID)
	if err != nil {
		return nil, err
	}
	if !exists {
		return nil, models.ErrNotFound
	}

	count, err := s.eventKelasTandingDB.CountKelasTandingIDs(ctx, uniqueIDs)
	if err != nil {
		return nil, err
	}
	if count != len(uniqueIDs) {
		return nil, fmt.Errorf("one or more kelas_tanding_ids are invalid")
	}

	if err := s.eventKelasTandingDB.AssignMany(ctx, eventID, uniqueIDs); err != nil {
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
