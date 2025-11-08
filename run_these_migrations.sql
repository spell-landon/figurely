-- ============================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- ============================================
-- This file fixes the missing columns and tables

-- 1. Add missing columns to expenses table
-- ============================================
ALTER TABLE public.expenses
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS is_tax_deductible BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS tax_category TEXT,
ADD COLUMN IF NOT EXISTS business_use_percentage NUMERIC(5, 2) DEFAULT 100.00;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_is_tax_deductible ON public.expenses(is_tax_deductible);
CREATE INDEX IF NOT EXISTS idx_expenses_tax_category ON public.expenses(tax_category);

-- Add comments
COMMENT ON COLUMN public.expenses.notes IS 'Additional notes about the expense';
COMMENT ON COLUMN public.expenses.is_tax_deductible IS 'Whether this expense is tax deductible';
COMMENT ON COLUMN public.expenses.tax_category IS 'Tax category for this expense';
COMMENT ON COLUMN public.expenses.business_use_percentage IS 'Percentage of expense used for business (0-100)';


-- 2. Create clients table (if it doesn't exist)
-- ============================================
CREATE TABLE IF NOT EXISTS public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Client information
  name text NOT NULL,
  email text,
  phone text,
  mobile text,
  fax text,
  website text,

  -- Address information
  address text,
  city text,
  state text,
  postal_code text,
  country text,

  -- Additional details
  contact_person text,
  tax_id text,
  notes text,

  -- Status
  is_active boolean NOT NULL DEFAULT true
);

-- Create indexes on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON public.clients(is_active);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS set_clients_updated_at ON public.clients;
CREATE TRIGGER set_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;

-- Create policies for users to manage their own clients
CREATE POLICY "Users can view their own clients"
  ON public.clients
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clients"
  ON public.clients
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients"
  ON public.clients
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients"
  ON public.clients
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add comments to table and columns
COMMENT ON TABLE public.clients IS 'Stores client information for users';
COMMENT ON COLUMN public.clients.id IS 'Unique identifier for the client';
COMMENT ON COLUMN public.clients.user_id IS 'The user who owns this client';
COMMENT ON COLUMN public.clients.name IS 'Client name or business name';
COMMENT ON COLUMN public.clients.email IS 'Client email address';
COMMENT ON COLUMN public.clients.contact_person IS 'Primary contact person at the client';
COMMENT ON COLUMN public.clients.tax_id IS 'Tax ID or business registration number';
COMMENT ON COLUMN public.clients.is_active IS 'Whether the client is active or archived';
