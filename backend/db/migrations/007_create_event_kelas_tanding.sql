CREATE TABLE IF NOT EXISTS event_kelas_tanding (
	id UUID PRIMARY KEY,
	event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
	kelas_tanding_id UUID NOT NULL REFERENCES kelas_tanding(id) ON DELETE CASCADE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	UNIQUE (event_id, kelas_tanding_id)
);

CREATE INDEX IF NOT EXISTS event_kelas_tanding_event_id_idx ON event_kelas_tanding(event_id);
CREATE INDEX IF NOT EXISTS event_kelas_tanding_kelas_tanding_id_idx ON event_kelas_tanding(kelas_tanding_id);
