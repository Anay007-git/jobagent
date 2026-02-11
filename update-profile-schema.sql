-- Separate statements for better error handling/compatibility
-- Run this whole script in Supabase Dashboard -> SQL Editor

-- 1. Phone
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;

-- 2. Location
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city text;

-- 3. Professional Info
-- Note: "current_role" is a reserved keyword, so we quote it or use separate statement
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS "current_role" text; 
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_ctc text;

-- 4. Social Links
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS github_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS portfolio_url text;

-- Comments
COMMENT ON COLUMN profiles."current_role" IS 'Current job title';
