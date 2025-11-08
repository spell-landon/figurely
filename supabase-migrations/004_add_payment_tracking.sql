-- Add payment tracking fields to invoices table
-- Run this in your Supabase SQL Editor

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_date DATE,
ADD COLUMN IF NOT EXISTS payment_reference TEXT;

-- Add comment for documentation
COMMENT ON COLUMN invoices.payment_method IS 'How the invoice was paid: check, cash, direct_deposit, paypal, venmo, zelle, wire_transfer, other';
COMMENT ON COLUMN invoices.payment_date IS 'Date when payment was received';
COMMENT ON COLUMN invoices.payment_reference IS 'Check number, transaction ID, or other payment reference';

-- Create index for faster queries by payment method
CREATE INDEX IF NOT EXISTS idx_invoices_payment_method ON invoices(payment_method);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_date ON invoices(payment_date);
