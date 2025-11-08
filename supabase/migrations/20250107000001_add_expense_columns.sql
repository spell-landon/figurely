-- Add missing columns to expenses table
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
