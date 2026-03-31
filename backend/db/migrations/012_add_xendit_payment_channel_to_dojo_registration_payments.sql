-- Add xendit_payment_channel column to store the specific payment channel
-- used by dojo admin when paying via Xendit (e.g., BCA, MANDIRI, OVO, QRIS, etc.)
ALTER TABLE dojo_registration_payments
    ADD COLUMN IF NOT EXISTS xendit_payment_channel VARCHAR(100);
