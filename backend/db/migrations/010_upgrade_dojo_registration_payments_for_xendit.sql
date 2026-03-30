ALTER TABLE dojo_registration_payments
  ALTER COLUMN file_path DROP NOT NULL;

ALTER TABLE dojo_registration_payments
  ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(32) NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS xendit_invoice_id VARCHAR(128),
  ADD COLUMN IF NOT EXISTS xendit_external_id VARCHAR(128),
  ADD COLUMN IF NOT EXISTS xendit_invoice_url TEXT,
  ADD COLUMN IF NOT EXISTS xendit_status VARCHAR(32),
  ADD COLUMN IF NOT EXISTS xendit_expiry_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS xendit_paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS xendit_raw_payload JSONB,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS dojo_registration_payments_xendit_invoice_id_uq
  ON dojo_registration_payments (xendit_invoice_id)
  WHERE xendit_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS dojo_registration_payments_xendit_external_id_idx
  ON dojo_registration_payments (xendit_external_id)
  WHERE xendit_external_id IS NOT NULL;