CREATE TABLE IF NOT EXISTS kelas_tanding (
	id UUID PRIMARY KEY,
	nama VARCHAR(255) NOT NULL,
	jenis VARCHAR(20) NOT NULL,
	kategori VARCHAR(50) NOT NULL,
	batas_berat JSONB,
	jenis_kelamin VARCHAR(20) NOT NULL,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	CONSTRAINT kelas_tanding_jenis_check CHECK (jenis IN ('kata', 'kumite')),
	CONSTRAINT kelas_tanding_kategori_check CHECK (kategori IN (
		'pra_usia_dini', 'usia_dini', 'pra_pemula', 'pemula',
		'kadet', 'junior', 'under_21', 'senior', 'veteran'
	)),
	CONSTRAINT kelas_tanding_jenis_kelamin_check CHECK (jenis_kelamin IN ('laki-laki', 'perempuan'))
);

CREATE INDEX IF NOT EXISTS kelas_tanding_jenis_idx ON kelas_tanding(jenis);
CREATE INDEX IF NOT EXISTS kelas_tanding_kategori_idx ON kelas_tanding(kategori);
CREATE INDEX IF NOT EXISTS kelas_tanding_jenis_kelamin_idx ON kelas_tanding(jenis_kelamin);
