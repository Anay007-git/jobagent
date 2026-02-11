-- Add Job Agent settings to profiles table

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS agent_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS target_location TEXT,
ADD COLUMN IF NOT EXISTS preferred_timezone TEXT DEFAULT 'UTC';

-- Comment check
COMMENT ON COLUMN profiles.agent_enabled IS 'Toggle for automated job search emails';
COMMENT ON COLUMN profiles.target_location IS 'Specific location for job search (overrides city)';
