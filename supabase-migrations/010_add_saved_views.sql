-- Create saved_views table for storing user-defined table views (filters, sorting, etc.)
-- This enables users to save frequently used filter/sort combinations for quick access

-- Create saved_views table
CREATE TABLE IF NOT EXISTS saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  table_name TEXT NOT NULL,
  view_state JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure unique view names per user per table
  CONSTRAINT saved_views_unique_name UNIQUE (user_id, table_name, name)
);

-- Add check constraint for valid table names
ALTER TABLE saved_views
ADD CONSTRAINT saved_views_table_check
CHECK (table_name IN ('invoices', 'expenses', 'clients', 'mileage', 'line_item_templates'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_views_user_id ON saved_views(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_views_table_name ON saved_views(table_name);
CREATE INDEX IF NOT EXISTS idx_saved_views_user_table ON saved_views(user_id, table_name);

-- Enable Row Level Security
ALTER TABLE saved_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own saved views
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

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_saved_views_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER saved_views_updated_at
  BEFORE UPDATE ON saved_views
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_views_updated_at();

-- Add helpful comment
COMMENT ON TABLE saved_views IS 'Stores user-defined table views with filter and sort configurations';
COMMENT ON COLUMN saved_views.view_state IS 'JSONB containing filters, sort parameters, and other view configuration';
