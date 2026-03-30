package service

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const defaultXenditBaseURL = "https://api.xendit.co"

type XenditInvoiceClient struct {
	secretKey string
	baseURL   string
	http      *http.Client
}

type XenditCreateInvoiceInput struct {
	ExternalID          string
	Amount              int64
	PayerEmail          string
	Description         string
	InvoiceDurationHour int
	SuccessRedirectURL  string
	FailureRedirectURL  string
}

type xenditCreateInvoiceRequest struct {
	ExternalID         string `json:"external_id"`
	Amount             int64  `json:"amount"`
	PayerEmail         string `json:"payer_email,omitempty"`
	Description        string `json:"description,omitempty"`
	InvoiceDuration    int    `json:"invoice_duration"`
	Currency           string `json:"currency"`
	SuccessRedirectURL string `json:"success_redirect_url,omitempty"`
	FailureRedirectURL string `json:"failure_redirect_url,omitempty"`
}

type xenditCreateInvoiceResponse struct {
	ID         string `json:"id"`
	ExternalID string `json:"external_id"`
	Status     string `json:"status"`
	InvoiceURL string `json:"invoice_url"`
	ExpiryDate string `json:"expiry_date"`
}

type XenditInvoiceResponse struct {
	ID         string
	ExternalID string
	Status     string
	InvoiceURL string
	ExpiryDate *time.Time
	PaidAt     *time.Time
}

func NewXenditInvoiceClient(secretKey, baseURL string) *XenditInvoiceClient {
	secretKey = strings.TrimSpace(secretKey)
	if secretKey == "" {
		return nil
	}

	baseURL = strings.TrimRight(strings.TrimSpace(baseURL), "/")
	if baseURL == "" {
		baseURL = defaultXenditBaseURL
	}

	return &XenditInvoiceClient{
		secretKey: secretKey,
		baseURL:   baseURL,
		http: &http.Client{
			Timeout: 20 * time.Second,
		},
	}
}

func (c *XenditInvoiceClient) CreateInvoice(ctx context.Context, input XenditCreateInvoiceInput) (*XenditInvoiceResponse, error) {
	if c == nil {
		return nil, fmt.Errorf("xendit client is not configured")
	}

	if strings.TrimSpace(input.ExternalID) == "" {
		return nil, fmt.Errorf("xendit external id is required")
	}

	if input.Amount <= 0 {
		return nil, fmt.Errorf("xendit amount must be greater than zero")
	}

	invoiceDuration := input.InvoiceDurationHour
	if invoiceDuration <= 0 {
		invoiceDuration = 24
	}

	requestBody := xenditCreateInvoiceRequest{
		ExternalID:         strings.TrimSpace(input.ExternalID),
		Amount:             input.Amount,
		PayerEmail:         strings.TrimSpace(input.PayerEmail),
		Description:        strings.TrimSpace(input.Description),
		InvoiceDuration:    invoiceDuration * 3600,
		Currency:           "IDR",
		SuccessRedirectURL: strings.TrimSpace(input.SuccessRedirectURL),
		FailureRedirectURL: strings.TrimSpace(input.FailureRedirectURL),
	}

	payload, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("marshal xendit create invoice request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/v2/invoices", bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("build xendit request: %w", err)
	}

	authValue := base64.StdEncoding.EncodeToString([]byte(c.secretKey + ":"))
	req.Header.Set("Authorization", "Basic "+authValue)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("send xendit request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read xendit response body: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("xendit create invoice failed (%d): %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var rawResponse xenditCreateInvoiceResponse
	if err := json.Unmarshal(body, &rawResponse); err != nil {
		return nil, fmt.Errorf("decode xendit create invoice response: %w", err)
	}

	var expiryDate *time.Time
	if strings.TrimSpace(rawResponse.ExpiryDate) != "" {
		parsedDate, err := time.Parse(time.RFC3339, rawResponse.ExpiryDate)
		if err == nil {
			expiryDate = &parsedDate
		}
	}

	return &XenditInvoiceResponse{
		ID:         rawResponse.ID,
		ExternalID: rawResponse.ExternalID,
		Status:     rawResponse.Status,
		InvoiceURL: rawResponse.InvoiceURL,
		ExpiryDate: expiryDate,
	}, nil
}

func (c *XenditInvoiceClient) GetInvoice(ctx context.Context, invoiceID string) (*XenditInvoiceResponse, error) {
	if c == nil {
		return nil, fmt.Errorf("xendit client is not configured")
	}

	invoiceID = strings.TrimSpace(invoiceID)
	if invoiceID == "" {
		return nil, fmt.Errorf("xendit invoice id is required")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, c.baseURL+"/v2/invoices/"+invoiceID, nil)
	if err != nil {
		return nil, fmt.Errorf("build xendit get invoice request: %w", err)
	}

	authValue := base64.StdEncoding.EncodeToString([]byte(c.secretKey + ":"))
	req.Header.Set("Authorization", "Basic "+authValue)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("send xendit get invoice request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read xendit get invoice response body: %w", err)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("xendit get invoice failed (%d): %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}

	var rawResponse struct {
		ID         string `json:"id"`
		ExternalID string `json:"external_id"`
		Status     string `json:"status"`
		InvoiceURL string `json:"invoice_url"`
		ExpiryDate string `json:"expiry_date"`
		PaidAt     string `json:"paid_at"`
	}
	if err := json.Unmarshal(body, &rawResponse); err != nil {
		return nil, fmt.Errorf("decode xendit get invoice response: %w", err)
	}

	var expiryDate *time.Time
	if strings.TrimSpace(rawResponse.ExpiryDate) != "" {
		parsedDate, err := time.Parse(time.RFC3339, rawResponse.ExpiryDate)
		if err == nil {
			expiryDate = &parsedDate
		}
	}

	var paidAt *time.Time
	if strings.TrimSpace(rawResponse.PaidAt) != "" {
		parsedDate, err := time.Parse(time.RFC3339, rawResponse.PaidAt)
		if err == nil {
			paidAt = &parsedDate
		}
	}

	return &XenditInvoiceResponse{
		ID:         rawResponse.ID,
		ExternalID: rawResponse.ExternalID,
		Status:     rawResponse.Status,
		InvoiceURL: rawResponse.InvoiceURL,
		ExpiryDate: expiryDate,
		PaidAt:     paidAt,
	}, nil
}
