CREATE TABLE IF NOT EXISTS dojo_registration_payments (
	id UUID PRIMARY KEY,
	dojo_id UUID NOT NULL REFERENCES dojos(id) ON DELETE CASCADE,
	event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
	file_path TEXT NOT NULL,
	uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	status VARCHAR(32) NOT NULL DEFAULT 'pending',
	CONSTRAINT dojo_registration_payments_status_check CHECK (status IN ('pending', 'approved')),
	CONSTRAINT dojo_registration_payments_unique_dojo_event UNIQUE (dojo_id, event_id)
);

CREATE INDEX IF NOT EXISTS dojo_registration_payments_event_id_idx ON dojo_registration_payments(event_id);
CREATE INDEX IF NOT EXISTS dojo_registration_payments_dojo_id_idx ON dojo_registration_payments(dojo_id);