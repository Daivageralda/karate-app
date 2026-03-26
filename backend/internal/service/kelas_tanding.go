package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"eo-karate/internal/db"
	"eo-karate/internal/models"
	"eo-karate/internal/utils"
)

// KelasTandingService contains business logic for kelas tanding operations
type KelasTandingService struct {
	kelasTandingDB *db.KelasTandingDB
}

// NewKelasTandingService creates a new KelasTandingService instance
func NewKelasTandingService(kelasTandingDB *db.KelasTandingDB) *KelasTandingService {
	return &KelasTandingService{kelasTandingDB: kelasTandingDB}
}

// Create creates a kelas tanding record
func (s *KelasTandingService) Create(ctx context.Context, input models.CreateKelasTandingInput) (*models.KelasTanding, error) {
	if err := validateKelasTandingInput(input.Nama, input.Jenis, input.Kategori, input.JenisKelamin, input.BatasBerat); err != nil {
		return nil, err
	}

	return s.kelasTandingDB.Create(ctx, input)
}

// GetByID retrieves a kelas tanding by ID
func (s *KelasTandingService) GetByID(ctx context.Context, id uuid.UUID) (*models.KelasTanding, error) {
	return s.kelasTandingDB.GetByID(ctx, id)
}

// Update updates a kelas tanding record
func (s *KelasTandingService) Update(ctx context.Context, id uuid.UUID, input models.UpdateKelasTandingInput) (*models.KelasTanding, error) {
	if err := validateKelasTandingInput(input.Nama, input.Jenis, input.Kategori, input.JenisKelamin, input.BatasBerat); err != nil {
		return nil, err
	}

	return s.kelasTandingDB.Update(ctx, id, input)
}

// Delete deletes a kelas tanding by ID
func (s *KelasTandingService) Delete(ctx context.Context, id uuid.UUID) error {
	return s.kelasTandingDB.Delete(ctx, id)
}

// List retrieves kelas tanding with cursor pagination
func (s *KelasTandingService) List(ctx context.Context, query models.PaginationQuery) (*models.KelasTandingListResult, error) {
	query = utils.NormalizePageRequest(query)
	if !utils.IsValidDirection(query.Direction) {
		return nil, models.ErrInvalidDirection
	}

	return s.kelasTandingDB.List(ctx, query)
}

func validateKelasTandingInput(nama, jenis, kategori, jenisKelamin string, batasBerat *models.BatasBerat) error {
	nama = strings.TrimSpace(nama)
	if nama == "" {
		return fmt.Errorf("nama is required")
	}

	if !models.ValidKelasTandingJenis[jenis] {
		return fmt.Errorf("jenis must be one of: kata, kumite")
	}

	if !models.ValidKelasTandingKategori[kategori] {
		return fmt.Errorf("kategori must be one of: pra_usia_dini, usia_dini, pra_pemula, pemula, kadet, junior, under_21, senior, veteran")
	}

	if !models.ValidKelasTandingJenisKelamin[jenisKelamin] {
		return fmt.Errorf("jenis_kelamin must be one of: laki-laki, perempuan")
	}

	if jenis == models.KelasTandingJenisKumite {
		if batasBerat == nil {
			return fmt.Errorf("batas_berat is required for kumite")
		}
		if batasBerat.Bawah < 0 || batasBerat.Atas <= 0 {
			return fmt.Errorf("batas_berat.bawah must be >= 0 and batas_berat.atas must be > 0")
		}
		if batasBerat.Atas <= batasBerat.Bawah {
			return fmt.Errorf("batas_berat.atas must be greater than batas_berat.bawah")
		}
	}

	return nil
}
