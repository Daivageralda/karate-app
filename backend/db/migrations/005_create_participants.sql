CREATE TABLE IF NOT EXISTS participants (
	id UUID PRIMARY KEY,
	event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
	dojo_id UUID NOT NULL REFERENCES dojos(id) ON DELETE CASCADE,
	nama_lengkap VARCHAR(255) NOT NULL,
	tempat_lahir VARCHAR(255) NOT NULL,
	tanggal_lahir DATE NOT NULL,
	jenis_kelamin VARCHAR(20) NOT NULL,
	berat_badan DECIMAL(5, 2) NOT NULL,
	kategori_tanding JSONB NOT NULL,
	kelas_tanding JSONB NOT NULL,
	status VARCHAR(32) NOT NULL DEFAULT 'pending',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT participants_status_check CHECK (status IN ('pending', 'approved'))
);

CREATE TABLE IF NOT EXISTS participant_documents (
	id UUID PRIMARY KEY,
	participant_id UUID NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
	document_type VARCHAR(50) NOT NULL,
	file_path TEXT NOT NULL,
	uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	status VARCHAR(32) NOT NULL DEFAULT 'pending',
	CONSTRAINT participant_documents_document_type_check CHECK (document_type IN ('surat_kesehatan', 'akta_kelahiran')),
	CONSTRAINT participant_documents_status_check CHECK (status IN ('pending', 'approved'))
);

CREATE TABLE IF NOT EXISTS dojo_recommendation_letters (
	id UUID PRIMARY KEY,
	dojo_id UUID NOT NULL REFERENCES dojos(id) ON DELETE CASCADE,
	event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
	file_path TEXT NOT NULL,
	uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	status VARCHAR(32) NOT NULL DEFAULT 'pending',
	CONSTRAINT dojo_recommendation_letters_status_check CHECK (status IN ('pending', 'approved')),
	CONSTRAINT dojo_recommendation_letters_unique_dojo_event UNIQUE (dojo_id, event_id)
);

CREATE INDEX IF NOT EXISTS participants_event_id_idx ON participants(event_id);
CREATE INDEX IF NOT EXISTS participants_dojo_id_idx ON participants(dojo_id);
CREATE INDEX IF NOT EXISTS participants_event_dojo_idx ON participants(event_id, dojo_id);
CREATE INDEX IF NOT EXISTS participants_status_idx ON participants(status);
CREATE INDEX IF NOT EXISTS participant_documents_participant_id_idx ON participant_documents(participant_id);
CREATE INDEX IF NOT EXISTS participant_documents_document_type_idx ON participant_documents(document_type);
CREATE INDEX IF NOT EXISTS dojo_recommendation_letters_event_id_idx ON dojo_recommendation_letters(event_id);
CREATE INDEX IF NOT EXISTS dojo_recommendation_letters_dojo_id_idx ON dojo_recommendation_letters(dojo_id);
