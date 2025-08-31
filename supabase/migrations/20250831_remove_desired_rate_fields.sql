-- Remove deprecated desired rate fields from users table
-- These fields were identified as no longer needed per contractor profile requirements

-- Drop the deprecated desired rate columns
ALTER TABLE users DROP COLUMN IF EXISTS desired_rate_min;
ALTER TABLE users DROP COLUMN IF EXISTS desired_rate_max;

-- Add comment for documentation
COMMENT ON TABLE users IS 'Users table - removed deprecated desired_rate_min and desired_rate_max fields as per contractor profile enhancement requirements';

-- Note: This completes the database schema cleanup for contractor profile enhancements
-- The users table now contains only the required fields without the deprecated rate columns