package models

// Pagination constants
const (
	CursorDirectionNext = "next"
	CursorDirectionPrev = "prev"
)

// PaginationQuery holds pagination parameters
type PaginationQuery struct {
	Cursor    string
	Limit     int
	Direction string
}

// PaginationMeta holds pagination metadata for response
type PaginationMeta struct {
	Limit      int    `json:"limit"`
	Direction  string `json:"direction"`
	NextCursor string `json:"next_cursor,omitempty"`
	PrevCursor string `json:"prev_cursor,omitempty"`
	HasNext    bool   `json:"has_next"`
	HasPrev    bool   `json:"has_prev"`
}
