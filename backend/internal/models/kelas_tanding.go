package models

import (
	"time"

	"github.com/google/uuid"
)

// Valid values for KelasTanding fields
const (
	KelasTandingJenisKata   = "kata"
	KelasTandingJenisKumite = "kumite"

	KelasTandingKategoriPraUsiaDini = "pra_usia_dini"
	KelasTandingKategoriUsiaDini    = "usia_dini"
	KelasTandingKategoriPraPemula   = "pra_pemula"
	KelasTandingKategoriPemula      = "pemula"
	KelasTandingKategoriKadet       = "kadet"
	KelasTandingKategoriJunior      = "junior"
	KelasTandingKategoriUnder21     = "under_21"
	KelasTandingKategoriSenior      = "senior"
	KelasTandingKategoriVeteran     = "veteran"

	KelasTandingJenisKelaminLakiLaki  = "laki-laki"
	KelasTandingJenisKelaminPerempuan = "perempuan"
)

var ValidKelasTandingJenis = map[string]bool{
	KelasTandingJenisKata:   true,
	KelasTandingJenisKumite: true,
}

var ValidKelasTandingKategori = map[string]bool{
	KelasTandingKategoriPraUsiaDini: true,
	KelasTandingKategoriUsiaDini:    true,
	KelasTandingKategoriPraPemula:   true,
	KelasTandingKategoriPemula:      true,
	KelasTandingKategoriKadet:       true,
	KelasTandingKategoriJunior:      true,
	KelasTandingKategoriUnder21:     true,
	KelasTandingKategoriSenior:      true,
	KelasTandingKategoriVeteran:     true,
}

var ValidKelasTandingJenisKelamin = map[string]bool{
	KelasTandingJenisKelaminLakiLaki:  true,
	KelasTandingJenisKelaminPerempuan: true,
}

// BatasBerat represents the weight range for kumite classes
type BatasBerat struct {
	Bawah float64 `json:"bawah"`
	Atas  float64 `json:"atas"`
}

// KelasTanding represents a fighting class master data item
type KelasTanding struct {
	ID           uuid.UUID   `json:"uuid"`
	Nama         string      `json:"nama"`
	Jenis        string      `json:"jenis"`
	Kategori     string      `json:"kategori"`
	BatasBerat   *BatasBerat `json:"batas_berat"`
	JenisKelamin string      `json:"jenis_kelamin"`
	CreatedAt    time.Time   `json:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at"`
}

// CreateKelasTandingInput is the input for creating a kelas tanding
type CreateKelasTandingInput struct {
	Nama         string      `json:"nama"`
	Jenis        string      `json:"jenis"`
	Kategori     string      `json:"kategori"`
	BatasBerat   *BatasBerat `json:"batas_berat"`
	JenisKelamin string      `json:"jenis_kelamin"`
}

// UpdateKelasTandingInput is the input for updating a kelas tanding
type UpdateKelasTandingInput struct {
	Nama         string      `json:"nama"`
	Jenis        string      `json:"jenis"`
	Kategori     string      `json:"kategori"`
	BatasBerat   *BatasBerat `json:"batas_berat"`
	JenisKelamin string      `json:"jenis_kelamin"`
}

// KelasTandingListResult is the result of listing kelas tanding
type KelasTandingListResult struct {
	Items []*KelasTanding `json:"items"`
	Meta  PaginationMeta  `json:"meta"`
}
