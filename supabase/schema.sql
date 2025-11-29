-- ===========================================
-- FIGURELY DATABASE SCHEMA
-- ===========================================
-- Complete database schema for Figurely
-- Run this in your Supabase SQL Editor to set up all tables
-- ===========================================

-- ===========================================
-- 1. FUNCTIONS
-- ===========================================

-- Function to automatically create a profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );

  -- Also create default business_settings
  INSERT INTO public.business_settings (user_id)
  VALUES (new.id);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 2. TABLES
-- ===========================================

-- -----------------------------------------
-- profiles
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT
);

-- -----------------------------------------
-- business_settings
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS public.business_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Business info
  business_name TEXT,
  business_number TEXT,
  business_owner TEXT,
  business_address TEXT,
  business_email TEXT,
  business_phone TEXT,
  business_mobile TEXT,
  business_website TEXT,
  logo_url TEXT,
  default_invoice_note TEXT,

  -- Email settings
  default_email_subject TEXT DEFAULT 'Invoice {invoice_number}',
  default_email_message TEXT DEFAULT 'Please find attached your invoice. If you have any questions, feel free to reach out.',
  email_signature TEXT
);

COMMENT ON COLUMN public.business_settings.default_email_subject IS 'Default subject line for invoice emails. Use {invoice_number} as placeholder.';
COMMENT ON COLUMN public.business_settings.default_email_message IS 'Default message body for invoice emails.';
COMMENT ON COLUMN public.business_settings.email_signature IS 'Email signature to append to invoice emails.';

-- -----------------------------------------
-- clients
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Client information
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  mobile TEXT,
  fax TEXT,
  website TEXT,

  -- Address information
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,

  -- Additional details
  contact_person TEXT,
  tax_id TEXT,
  notes TEXT,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  status TEXT DEFAULT 'active',

  CONSTRAINT clients_status_check CHECK (status IN ('lead', 'prospect', 'active', 'on_hold', 'inactive', 'archived'))
);

COMMENT ON TABLE public.clients IS 'Stores client information for users';
COMMENT ON COLUMN public.clients.name IS 'Client name or business name';
COMMENT ON COLUMN public.clients.contact_person IS 'Primary contact person at the client';
COMMENT ON COLUMN public.clients.tax_id IS 'Tax ID or business registration number';
COMMENT ON COLUMN public.clients.status IS 'Client lifecycle status: lead, prospect, active, on_hold, inactive, archived';

-- -----------------------------------------
-- invoices
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Invoice details
  invoice_name TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  date DATE NOT NULL,
  terms TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue')),

  -- From (business) info
  from_name TEXT,
  from_email TEXT,
  from_address TEXT,
  from_phone TEXT,
  from_business_number TEXT,
  from_website TEXT,
  from_owner TEXT,

  -- Bill to (client) info
  bill_to_name TEXT,
  bill_to_email TEXT,
  bill_to_address TEXT,
  bill_to_phone TEXT,
  bill_to_mobile TEXT,
  bill_to_fax TEXT,

  -- Line items and totals
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
  total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(10, 2) NOT NULL DEFAULT 0,
  notes TEXT,

  -- Sharing
  share_token TEXT UNIQUE,

  -- Payment tracking
  payment_method TEXT,
  payment_date DATE,
  payment_reference TEXT
);

COMMENT ON COLUMN invoices.payment_method IS 'How the invoice was paid: check, cash, direct_deposit, paypal, venmo, zelle, wire_transfer, other';
COMMENT ON COLUMN invoices.payment_date IS 'Date when payment was received';
COMMENT ON COLUMN invoices.payment_reference IS 'Check number, transaction ID, or other payment reference';

-- -----------------------------------------
-- expenses
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Basic info
  merchant TEXT NOT NULL,
  category TEXT,
  date DATE NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  tax NUMERIC(10, 2),
  description TEXT,
  receipt_url TEXT,
  notes TEXT,

  -- Tax fields
  is_tax_deductible BOOLEAN DEFAULT true,
  business_use_percentage NUMERIC(5, 2) DEFAULT 100,
  tax_category TEXT,
  deductible_amount NUMERIC(10, 2) GENERATED ALWAYS AS (total * (business_use_percentage / 100)) STORED,

  -- Return/refund tracking
  is_return BOOLEAN DEFAULT FALSE,
  original_expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL
);

COMMENT ON COLUMN expenses.is_tax_deductible IS 'Whether this expense is tax deductible';
COMMENT ON COLUMN expenses.business_use_percentage IS 'Percentage of expense used for business (0-100)';
COMMENT ON COLUMN expenses.tax_category IS 'Tax category: rent, utilities, internet, supplies, equipment, meals, travel, etc.';
COMMENT ON COLUMN expenses.deductible_amount IS 'Calculated deductible amount based on business use percentage';
COMMENT ON COLUMN expenses.is_return IS 'Whether this expense is a return/refund';
COMMENT ON COLUMN expenses.original_expense_id IS 'Links to the original expense if this is a return';
COMMENT ON COLUMN expenses.notes IS 'Additional notes about the expense';

-- -----------------------------------------
-- line_item_templates
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS public.line_item_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  rate NUMERIC(10, 2) NOT NULL,
  quantity NUMERIC(10, 2) DEFAULT 1
);

-- -----------------------------------------
-- mileage
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS public.mileage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  date DATE NOT NULL,
  purpose TEXT NOT NULL,
  miles DECIMAL(10, 2) NOT NULL,
  rate_per_mile DECIMAL(10, 2) DEFAULT 0.67,
  total DECIMAL(10, 2) GENERATED ALWAYS AS (miles * rate_per_mile) STORED,
  notes TEXT
);

COMMENT ON TABLE mileage IS 'Track business miles driven for tax deductions';
COMMENT ON COLUMN mileage.purpose IS 'Business purpose of the trip';
COMMENT ON COLUMN mileage.miles IS 'Number of miles driven';
COMMENT ON COLUMN mileage.rate_per_mile IS 'Rate per mile (default: IRS standard rate)';
COMMENT ON COLUMN mileage.total IS 'Calculated total deduction (miles * rate)';

-- -----------------------------------------
-- household_settings
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS public.household_settings (
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

COMMENT ON TABLE household_settings IS 'Settings for household expenses and business use percentages';

-- -----------------------------------------
-- saved_views
-- -----------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  table_name TEXT NOT NULL,
  view_state JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT saved_views_unique_name UNIQUE (user_id, table_name, name),
  CONSTRAINT saved_views_table_check CHECK (table_name IN ('invoices', 'expenses', 'clients', 'mileage', 'line_item_templates'))
);

COMMENT ON TABLE saved_views IS 'Stores user-defined table views with filter and sort configurations';
COMMENT ON COLUMN saved_views.view_state IS 'JSONB containing filters, sort parameters, and other view configuration';

-- ===========================================
-- 3. INDEXES
-- ===========================================

-- Profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Business settings
CREATE INDEX IF NOT EXISTS idx_business_settings_user_id ON public.business_settings(user_id);

-- Clients
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_email ON public.clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_is_active ON public.clients(is_active);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);

-- Invoices
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON public.invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.invoices(date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_share_token ON public.invoices(share_token) WHERE share_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_payment_method ON invoices(payment_method);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_date ON invoices(payment_date);

-- Expenses
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);
CREATE INDEX IF NOT EXISTS idx_expenses_tax_deductible ON expenses(is_tax_deductible);
CREATE INDEX IF NOT EXISTS idx_expenses_tax_category ON expenses(tax_category);
CREATE INDEX IF NOT EXISTS idx_expenses_original_expense_id ON expenses(original_expense_id);
CREATE INDEX IF NOT EXISTS idx_expenses_is_return ON expenses(is_return);

-- Line item templates
CREATE INDEX IF NOT EXISTS idx_line_item_templates_user_id ON public.line_item_templates(user_id);

-- Mileage
CREATE INDEX IF NOT EXISTS idx_mileage_user_id ON mileage(user_id);
CREATE INDEX IF NOT EXISTS idx_mileage_date ON mileage(date);

-- Household settings
CREATE INDEX IF NOT EXISTS idx_household_settings_user_id ON household_settings(user_id);

-- Saved views
CREATE INDEX IF NOT EXISTS idx_saved_views_user_id ON saved_views(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_views_table_name ON saved_views(table_name);
CREATE INDEX IF NOT EXISTS idx_saved_views_user_table ON saved_views(user_id, table_name);

-- ===========================================
-- 4. ROW LEVEL SECURITY
-- ===========================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE line_item_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE mileage ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------
-- Profiles policies
-- -----------------------------------------
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- -----------------------------------------
-- Business settings policies
-- -----------------------------------------
CREATE POLICY "Users can view their own business settings"
  ON business_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own business settings"
  ON business_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own business settings"
  ON business_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- -----------------------------------------
-- Clients policies
-- -----------------------------------------
CREATE POLICY "Users can view their own clients"
  ON clients FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clients"
  ON clients FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients"
  ON clients FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients"
  ON clients FOR DELETE
  USING (auth.uid() = user_id);

-- -----------------------------------------
-- Invoices policies
-- -----------------------------------------
CREATE POLICY "Users can view their own invoices"
  ON invoices FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view invoices with share_token"
  ON invoices FOR SELECT
  USING (share_token IS NOT NULL);

CREATE POLICY "Users can insert their own invoices"
  ON invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own invoices"
  ON invoices FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own invoices"
  ON invoices FOR DELETE
  USING (auth.uid() = user_id);

-- -----------------------------------------
-- Expenses policies
-- -----------------------------------------
CREATE POLICY "Users can view their own expenses"
  ON expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expenses"
  ON expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses"
  ON expenses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses"
  ON expenses FOR DELETE
  USING (auth.uid() = user_id);

-- -----------------------------------------
-- Line item templates policies
-- -----------------------------------------
CREATE POLICY "Users can view their own templates"
  ON line_item_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own templates"
  ON line_item_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON line_item_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON line_item_templates FOR DELETE
  USING (auth.uid() = user_id);

-- -----------------------------------------
-- Mileage policies
-- -----------------------------------------
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

-- -----------------------------------------
-- Household settings policies
-- -----------------------------------------
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

-- -----------------------------------------
-- Saved views policies
-- -----------------------------------------
CREATE POLICY "Users can view their own saved views"
  ON saved_views FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved views"
  ON saved_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved views"
  ON saved_views FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved views"
  ON saved_views FOR DELETE
  USING (auth.uid() = user_id);

-- ===========================================
-- 5. TRIGGERS
-- ===========================================

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at triggers for all tables
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.business_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.line_item_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.mileage
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.household_settings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.saved_views
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ===========================================
-- 6. STORAGE BUCKETS
-- ===========================================
-- Note: Create these buckets manually in Supabase Dashboard > Storage
-- Or run these if using SQL (requires storage schema access):

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('receipts', 'receipts', false);

-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('logos', 'logos', true);

-- ===========================================
-- 7. STORAGE POLICIES
-- ===========================================

-- Receipts bucket policies (private)
CREATE POLICY "Users can upload their own receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Logos bucket policies (public read)
CREATE POLICY "Users can upload their own logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'logos');

CREATE POLICY "Users can delete their own logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'logos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
