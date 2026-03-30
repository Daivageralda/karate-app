package config

import (
	"errors"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv                    string
	Port                      string
	DatabaseURL               string
	UploadDir                 string
	XenditSecretKey           string
	XenditWebhookToken        string
	XenditBaseURL             string
	XenditInvoiceDurationHour int
}

func Load() (Config, error) {
	if os.Getenv("APP_ENV") != "production" {
		_ = godotenv.Load()
	}

	cfg := Config{
		AppEnv:                    getEnv("APP_ENV", "development"),
		Port:                      getEnv("PORT", "8080"),
		DatabaseURL:               getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/eo_karate?sslmode=disable"),
		UploadDir:                 getEnv("UPLOAD_DIR", "uploads"),
		XenditSecretKey:           getEnv("XENDIT_SECRET_KEY", ""),
		XenditWebhookToken:        getEnv("XENDIT_WEBHOOK_TOKEN", ""),
		XenditBaseURL:             getEnv("XENDIT_BASE_URL", "https://api.xendit.co"),
		XenditInvoiceDurationHour: 24,
	}

	if rawInvoiceHour := getEnv("XENDIT_INVOICE_DURATION_HOUR", "24"); rawInvoiceHour != "" {
		parsedHour, err := strconv.Atoi(rawInvoiceHour)
		if err != nil || parsedHour <= 0 {
			return Config{}, errors.New("XENDIT_INVOICE_DURATION_HOUR must be a positive integer")
		}
		cfg.XenditInvoiceDurationHour = parsedHour
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

	if strings.TrimSpace(cfg.XenditBaseURL) == "" {
		return Config{}, errors.New("XENDIT_BASE_URL is required")
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
