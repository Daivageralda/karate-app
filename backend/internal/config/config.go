package config

import (
	"errors"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv      string
	Port        string
	DatabaseURL string
	UploadDir   string
}

func Load() (Config, error) {
	if os.Getenv("APP_ENV") != "production" {
		_ = godotenv.Load()
	}

	cfg := Config{
		AppEnv:      getEnv("APP_ENV", "development"),
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/eo_karate?sslmode=disable"),
		UploadDir:   getEnv("UPLOAD_DIR", "uploads"),
	}

	if strings.TrimSpace(cfg.Port) == "" {
		return Config{}, errors.New("PORT is required")
	}

	if strings.TrimSpace(cfg.DatabaseURL) == "" {
		return Config{}, errors.New("DATABASE_URL is required")
	}

	if strings.TrimSpace(cfg.UploadDir) == "" {
		return Config{}, errors.New("UPLOAD_DIR is required")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return fallback
	}

	return value
}
