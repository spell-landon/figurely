-- Create mileage tracking table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS mileage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  date DATE NOT NULL,
  purpose TEXT NOT NULL,
  miles DECIMAL(10, 2) NOT NULL,
  rate_per_mile DECIMAL(10, 2) DEFAULT 0.67, -- IRS standard mileage rate
  total DECIMAL(10, 2) GENERATED ALWAYS AS (miles * rate_per_mile) STORED,
  notes TEXT
);

-- Add RLS policies
ALTER TABLE mileage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mileage"
  ON mileage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mileage"
  ON mileage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mileage"
  ON mileage FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mileage"
  ON mileage FOR DELETE
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_mileage_user_id ON mileage(user_id);
CREATE INDEX IF NOT EXISTS idx_mileage_date ON mileage(date);

-- Add comment for documentation
COMMENT ON TABLE mileage IS 'Track business miles driven for tax deductions';
COMMENT ON COLUMN mileage.purpose IS 'Business purpose of the trip';
COMMENT ON COLUMN mileage.miles IS 'Number of miles driven';
COMMENT ON COLUMN mileage.rate_per_mile IS 'Rate per mile (default: IRS standard rate)';
COMMENT ON COLUMN mileage.total IS 'Calculated total deduction (miles * rate)';
