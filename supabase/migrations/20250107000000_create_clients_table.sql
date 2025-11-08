-- Create clients table
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
  is_active boolean NOT NULL DEFAULT true,

  CONSTRAINT clients_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);

-- Create index on name for search
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(name);

-- Create index on email for search
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);

-- Create index on active status
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

-- Create policy for users to view their own clients
CREATE POLICY "Users can view their own clients"
  ON public.clients
  FOR SELECT
  USING (auth.uid() = user_id);

-- Create policy for users to insert their own clients
CREATE POLICY "Users can insert their own clients"
  ON public.clients
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to update their own clients
CREATE POLICY "Users can update their own clients"
  ON public.clients
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to delete their own clients
CREATE POLICY "Users can delete their own clients"
  ON public.clients
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment to table
COMMENT ON TABLE public.clients IS 'Stores client information for users';

-- Add comments to columns
COMMENT ON COLUMN public.clients.id IS 'Unique identifier for the client';
COMMENT ON COLUMN public.clients.user_id IS 'The user who owns this client';
COMMENT ON COLUMN public.clients.name IS 'Client name or business name';
COMMENT ON COLUMN public.clients.email IS 'Client email address';
COMMENT ON COLUMN public.clients.contact_person IS 'Primary contact person at the client';
COMMENT ON COLUMN public.clients.tax_id IS 'Tax ID or business registration number';
COMMENT ON COLUMN public.clients.is_active IS 'Whether the client is active or archived';
