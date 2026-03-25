ALTER TABLE events
	RENAME COLUMN title TO name;

ALTER TABLE events
	ADD COLUMN slug VARCHAR(255);

UPDATE events
SET slug = CONCAT('event-', SUBSTRING(id::text, 1, 8))
WHERE slug IS NULL OR slug = '';

ALTER TABLE events
	ALTER COLUMN slug SET NOT NULL;

ALTER TABLE events
	ADD CONSTRAINT events_slug_key UNIQUE (slug);

ALTER TABLE events
	ALTER COLUMN location TYPE JSONB
	USING jsonb_build_object(
		'name', COALESCE(location, ''),
		'address', '',
		'city', ''
	);

ALTER TABLE events
	ADD COLUMN time_window JSONB;

UPDATE events
SET time_window = jsonb_build_object(
	'start_at', to_char(start_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
	'end_at', to_char(start_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
	'registration_deadline', to_char(start_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
)
WHERE time_window IS NULL;

ALTER TABLE events
	ALTER COLUMN time_window SET NOT NULL;

ALTER TABLE events
	ADD COLUMN organizer JSONB NOT NULL DEFAULT '{"name":"","email":""}'::jsonb;

ALTER TABLE events
	ADD COLUMN banner_url TEXT NOT NULL DEFAULT '';

ALTER TABLE events
	ADD COLUMN attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE events
	ADD COLUMN event_config JSONB NOT NULL DEFAULT '{"status":"draft","is_registration_open":false,"max_participants":0}'::jsonb;

CREATE INDEX events_start_at_id_idx ON events(start_at, id);
