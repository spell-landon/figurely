-- Create household settings table for tracking business use percentages
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS household_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Business use percentages
  rent_business_percentage DECIMAL(5, 2) DEFAULT 0,
  utilities_business_percentage DECIMAL(5, 2) DEFAULT 0,
  internet_business_percentage DECIMAL(5, 2) DEFAULT 0,

  -- Monthly amounts (optional presets)
  monthly_rent DECIMAL(10, 2),
  monthly_utilities DECIMAL(10, 2),
  monthly_internet DECIMAL(10, 2),

  -- Home office details
  total_home_square_feet INTEGER,
  office_square_feet INTEGER,

  CONSTRAINT valid_percentages CHECK (
    rent_business_percentage >= 0 AND rent_business_percentage <= 100 AND
    utilities_business_percentage >= 0 AND utilities_business_percentage <= 100 AND
    internet_business_percentage >= 0 AND internet_business_percentage <= 100
  )
);

-- Add RLS policies
ALTER TABLE household_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own household settings"
  ON household_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own household settings"
  ON household_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own household settings"
  ON household_settings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own household settings"
  ON household_settings FOR DELETE
  USING (auth.uid() = user_id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_household_settings_user_id ON household_settings(user_id);

-- Add tax-related fields to expenses table
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS is_tax_deductible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS business_use_percentage DECIMAL(5, 2) DEFAULT 100,
ADD COLUMN IF NOT EXISTS tax_category TEXT,
ADD COLUMN IF NOT EXISTS deductible_amount DECIMAL(10, 2) GENERATED ALWAYS AS (total * (business_use_percentage / 100)) STORED;

-- Add index for tax queries
CREATE INDEX IF NOT EXISTS idx_expenses_tax_deductible ON expenses(is_tax_deductible);
CREATE INDEX IF NOT EXISTS idx_expenses_tax_category ON expenses(tax_category);

-- Add comments
COMMENT ON TABLE household_settings IS 'Settings for household expenses and business use percentages';
COMMENT ON COLUMN expenses.is_tax_deductible IS 'Whether this expense is tax deductible';
COMMENT ON COLUMN expenses.business_use_percentage IS 'Percentage of expense used for business (0-100)';
COMMENT ON COLUMN expenses.tax_category IS 'Tax category: rent, utilities, internet, supplies, equipment, meals, travel, etc.';
COMMENT ON COLUMN expenses.deductible_amount IS 'Calculated deductible amount based on business use percentage';
