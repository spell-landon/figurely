-- Add status field to clients table to replace is_active boolean
-- Status represents the full client lifecycle: lead → prospect → active → on_hold/inactive → archived

-- Add status column
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

-- Migrate existing data: convert is_active boolean to status
UPDATE clients
SET status = CASE
  WHEN is_active = true THEN 'active'
  WHEN is_active = false THEN 'inactive'
  ELSE 'active'
END
WHERE status = 'active'; -- Only update rows that still have the default

-- Add check constraint to ensure valid status values
ALTER TABLE clients
ADD CONSTRAINT clients_status_check
CHECK (status IN ('lead', 'prospect', 'active', 'on_hold', 'inactive', 'archived'));

-- Create index for status filtering
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

-- Note: Keeping is_active column for backwards compatibility
-- You can optionally drop it later: ALTER TABLE clients DROP COLUMN is_active;
