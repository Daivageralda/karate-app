package service

import (
	"context"
	"errors"
	"fmt"
	"net/mail"
	"strings"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"eo-karate/internal/db"
	"eo-karate/internal/models"
	"eo-karate/internal/utils"
)

// UserService contains business logic for user operations
type UserService struct {
	userDB *db.UserDB
	dojoDB *db.DojoDB
}

// NewUserService creates a new UserService instance
func NewUserService(userDB *db.UserDB, dojoDB *db.DojoDB) *UserService {
	return &UserService{userDB: userDB, dojoDB: dojoDB}
}

// Create creates a new user with validation
func (s *UserService) Create(ctx context.Context, input models.CreateUserInput) (*models.User, error) {
	normalizedInput, err := s.normalizeAndValidateCreateInput(ctx, input)
	if err != nil {
		return nil, err
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(normalizedInput.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	return s.userDB.Create(ctx, normalizedInput, string(passwordHash))
}

// Update updates user with validation
func (s *UserService) Update(ctx context.Context, id uuid.UUID, input models.UpdateUserInput) (*models.User, error) {
	if _, err := s.userDB.GetByID(ctx, id); err != nil {
		return nil, err
	}

	normalizedInput, err := s.normalizeAndValidateUpdateInput(ctx, input)
	if err != nil {
		return nil, err
	}

	var passwordHash *string
	if normalizedInput.Password != "" {
		hashBytes, hashErr := bcrypt.GenerateFromPassword([]byte(normalizedInput.Password), bcrypt.DefaultCost)
		if hashErr != nil {
			return nil, fmt.Errorf("hash password: %w", hashErr)
		}

		hashValue := string(hashBytes)
		passwordHash = &hashValue
	}

	return s.userDB.Update(ctx, id, normalizedInput, passwordHash)
}

// Delete deletes user by ID
func (s *UserService) Delete(ctx context.Context, id uuid.UUID) error {
	return s.userDB.Delete(ctx, id)
}

// GetByID retrieves a user by ID
func (s *UserService) GetByID(ctx context.Context, id uuid.UUID) (*models.User, error) {
	return s.userDB.GetByID(ctx, id)
}

// List retrieves users with pagination
func (s *UserService) List(ctx context.Context, query models.PaginationQuery) (*models.UserListResult, error) {
	query = utils.NormalizePageRequest(query)
	if !utils.IsValidDirection(query.Direction) {
		return nil, models.ErrInvalidDirection
	}

	return s.userDB.List(ctx, query)
}

// Register registers a new auth user with minimal input
func (s *UserService) Register(ctx context.Context, input models.AuthRegisterInput) (*models.User, error) {
	createInput := models.CreateUserInput{
		Name:       input.Name,
		Email:      input.Email,
		Password:   input.Password,
		Role:       models.UserRoleDojoAdmin,
		DojoID:     input.DojoID,
		IsActive:   true,
		IsVerified: false,
	}

	return s.Create(ctx, createInput)
}

// Login validates user credentials and returns user details
func (s *UserService) Login(ctx context.Context, input models.AuthLoginInput) (*models.AuthLoginResult, error) {
	input.Email = strings.TrimSpace(strings.ToLower(input.Email))
	input.Password = strings.TrimSpace(input.Password)

	if _, err := mail.ParseAddress(input.Email); err != nil {
		return nil, fmt.Errorf("email is invalid")
	}

	if input.Password == "" {
		return nil, fmt.Errorf("password is required")
	}

	user, err := s.userDB.GetByEmail(ctx, input.Email)
	if err != nil {
		if errors.Is(err, models.ErrNotFound) {
			return nil, models.ErrUnauthorized
		}

		return nil, err
	}

	if bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)) != nil {
		return nil, models.ErrUnauthorized
	}

	if !user.IsActive {
		return nil, fmt.Errorf("user is inactive")
	}

	now := time.Now().UTC()
	if err := s.userDB.UpdateLastLogin(ctx, user.ID, now); err != nil {
		return nil, err
	}
	user.LastLogin = &now

	return &models.AuthLoginResult{User: user}, nil
}

func (s *UserService) normalizeAndValidateCreateInput(ctx context.Context, input models.CreateUserInput) (models.CreateUserInput, error) {
	input.Name = strings.TrimSpace(input.Name)
	input.Email = strings.TrimSpace(strings.ToLower(input.Email))
	input.Password = strings.TrimSpace(input.Password)
	input.Role = strings.ToLower(strings.TrimSpace(input.Role))
	input.ResetToken = strings.TrimSpace(input.ResetToken)

	if input.Name == "" {
		return models.CreateUserInput{}, fmt.Errorf("name is required")
	}

	if _, err := mail.ParseAddress(input.Email); err != nil {
		return models.CreateUserInput{}, fmt.Errorf("email is invalid")
	}

	if len(input.Password) < 8 {
		return models.CreateUserInput{}, fmt.Errorf("password must be at least 8 characters")
	}

	if input.Role == "" {
		input.Role = models.UserRoleDojoAdmin
	}

	if err := s.validateRoleAndDojo(ctx, input.Role, input.DojoID); err != nil {
		return models.CreateUserInput{}, err
	}

	if input.IsVerified && input.VerifiedAt == nil {
		now := time.Now().UTC()
		input.VerifiedAt = &now
	}

	if !input.IsVerified {
		input.VerifiedAt = nil
	}

	if input.ResetToken == "" {
		input.ResetTokenExpiry = nil
	}

	return input, nil
}

func (s *UserService) normalizeAndValidateUpdateInput(ctx context.Context, input models.UpdateUserInput) (models.UpdateUserInput, error) {
	input.Name = strings.TrimSpace(input.Name)
	input.Email = strings.TrimSpace(strings.ToLower(input.Email))
	input.Password = strings.TrimSpace(input.Password)
	input.Role = strings.ToLower(strings.TrimSpace(input.Role))
	input.ResetToken = strings.TrimSpace(input.ResetToken)

	if input.Name == "" {
		return models.UpdateUserInput{}, fmt.Errorf("name is required")
	}

	if _, err := mail.ParseAddress(input.Email); err != nil {
		return models.UpdateUserInput{}, fmt.Errorf("email is invalid")
	}

	if input.Role == "" {
		input.Role = models.UserRoleDojoAdmin
	}

	if err := s.validateRoleAndDojo(ctx, input.Role, input.DojoID); err != nil {
		return models.UpdateUserInput{}, err
	}

	if input.IsVerified && input.VerifiedAt == nil {
		now := time.Now().UTC()
		input.VerifiedAt = &now
	}

	if !input.IsVerified {
		input.VerifiedAt = nil
	}

	if input.ResetToken == "" {
		input.ResetTokenExpiry = nil
	}

	if input.Password != "" && len(input.Password) < 8 {
		return models.UpdateUserInput{}, fmt.Errorf("password must be at least 8 characters")
	}

	return input, nil
}

func (s *UserService) validateRoleAndDojo(ctx context.Context, role string, dojoID *uuid.UUID) error {
	switch role {
	case models.UserRoleSuperAdmin:
		return nil
	case models.UserRoleDojoAdmin:
		if dojoID == nil || *dojoID == uuid.Nil {
			return fmt.Errorf("dojo_id is required for dojo_admin role")
		}

		if _, err := s.dojoDB.GetByID(ctx, *dojoID); err != nil {
			if errors.Is(err, models.ErrNotFound) {
				return fmt.Errorf("dojo not found")
			}
			return err
		}

		return nil
	default:
		return fmt.Errorf("role must be super_admin or dojo_admin")
	}
}
