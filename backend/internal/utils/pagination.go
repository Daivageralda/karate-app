package utils

import (
	"encoding/base64"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"

	"eo-karate/internal/models"
)

// EncodeUserCursor encodes user pagination cursor
func EncodeUserCursor(createdAt time.Time, id uuid.UUID) string {
	return encodeTimeUUID(createdAt, id)
}

// DecodeUserCursor decodes user pagination cursor
func DecodeUserCursor(cursor string) (time.Time, uuid.UUID, error) {
	return decodeTimeUUID(cursor)
}

// EncodeEventCursor encodes event pagination cursor
func EncodeEventCursor(startAt time.Time, id uuid.UUID) string {
	return encodeTimeUUID(startAt, id)
}

// DecodeEventCursor decodes event pagination cursor
func DecodeEventCursor(cursor string) (time.Time, uuid.UUID, error) {
	return decodeTimeUUID(cursor)
}

// EncodeDojoCursor encodes dojo pagination cursor
func EncodeDojoCursor(createdAt time.Time, id uuid.UUID) string {
	return encodeTimeUUID(createdAt, id)
}

// DecodeDojoCursor decodes dojo pagination cursor
func DecodeDojoCursor(cursor string) (time.Time, uuid.UUID, error) {
	return decodeTimeUUID(cursor)
}

// EncodeKelasTandingCursor encodes kelas_tanding pagination cursor
func EncodeKelasTandingCursor(createdAt time.Time, id uuid.UUID) string {
	return encodeTimeUUID(createdAt, id)
}

// DecodeKelasTandingCursor decodes kelas_tanding pagination cursor
func DecodeKelasTandingCursor(cursor string) (time.Time, uuid.UUID, error) {
	return decodeTimeUUID(cursor)
}

func encodeTimeUUID(ts time.Time, id uuid.UUID) string {
	payload := ts.UTC().Format(time.RFC3339Nano) + "|" + id.String()
	return base64.RawURLEncoding.EncodeToString([]byte(payload))
}

func decodeTimeUUID(cursor string) (time.Time, uuid.UUID, error) {
	raw, err := base64.RawURLEncoding.DecodeString(cursor)
	if err != nil {
		return time.Time{}, uuid.Nil, fmt.Errorf("%w: malformed base64", models.ErrInvalidCursor)
	}

	parts := strings.SplitN(string(raw), "|", 2)
	if len(parts) != 2 {
		return time.Time{}, uuid.Nil, fmt.Errorf("%w: malformed payload", models.ErrInvalidCursor)
	}

	ts, err := time.Parse(time.RFC3339Nano, parts[0])
	if err != nil {
		return time.Time{}, uuid.Nil, fmt.Errorf("%w: invalid timestamp", models.ErrInvalidCursor)
	}

	id, err := uuid.Parse(parts[1])
	if err != nil {
		return time.Time{}, uuid.Nil, fmt.Errorf("%w: invalid id", models.ErrInvalidCursor)
	}

	return ts, id, nil
}

// FinalizeCursorPagination finalizes pagination metadata
func FinalizeCursorPagination[T any](
	items []T,
	query models.PaginationQuery,
	encodeCursor func(item T) string,
	reverseFetchedOrder bool,
) ([]T, models.PaginationMeta) {
	hasMoreInDirection := len(items) > query.Limit
	if hasMoreInDirection {
		items = items[:query.Limit]
	}

	if reverseFetchedOrder {
		reverseInPlace(items)
	}

	hasCursor := strings.TrimSpace(query.Cursor) != ""
	meta := models.PaginationMeta{
		Limit:     query.Limit,
		Direction: query.Direction,
	}

	if len(items) > 0 {
		meta.PrevCursor = encodeCursor(items[0])
		meta.NextCursor = encodeCursor(items[len(items)-1])
	}

	switch query.Direction {
	case models.CursorDirectionNext:
		meta.HasNext = hasMoreInDirection
		meta.HasPrev = hasCursor
	case models.CursorDirectionPrev:
		meta.HasPrev = hasMoreInDirection
		meta.HasNext = hasCursor
	}

	if !meta.HasPrev {
		meta.PrevCursor = ""
	}

	if !meta.HasNext {
		meta.NextCursor = ""
	}

	return items, meta
}

func reverseInPlace[T any](items []T) {
	for left, right := 0, len(items)-1; left < right; left, right = left+1, right-1 {
		items[left], items[right] = items[right], items[left]
	}
}

// NormalizePageRequest normalizes pagination query parameters
func NormalizePageRequest(query models.PaginationQuery) models.PaginationQuery {
	const (
		defaultListLimit = 20
		maxListLimit     = 100
	)

	query.Cursor = strings.TrimSpace(query.Cursor)

	if query.Limit <= 0 {
		query.Limit = defaultListLimit
	}

	if query.Limit > maxListLimit {
		query.Limit = maxListLimit
	}

	query.Direction = strings.ToLower(strings.TrimSpace(query.Direction))
	if query.Direction == "" {
		query.Direction = models.CursorDirectionNext
	}

	return query
}

// IsValidDirection validates pagination direction
func IsValidDirection(direction string) bool {
	return direction == models.CursorDirectionNext || direction == models.CursorDirectionPrev
}
