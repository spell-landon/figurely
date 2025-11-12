-- Add tax-related fields to expenses table
-- Note: deductible_amount already exists as a generated column and should not be added
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS is_tax_deductible BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tax_category TEXT;

-- Create index for tax deductible expenses (for faster filtering in tax reports)
CREATE INDEX IF NOT EXISTS idx_expenses_is_tax_deductible ON expenses(is_tax_deductible);
CREATE INDEX IF NOT EXISTS idx_expenses_tax_category ON expenses(tax_category);
