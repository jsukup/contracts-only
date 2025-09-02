-- Add contractor notification preferences to users table
-- This migration consolidates notification preferences and ensures consistency

-- Add the contractor_notifications JSONB column
ALTER TABLE users ADD COLUMN contractor_notifications JSONB;

-- Migrate existing job_alerts_enabled data into the new structure
UPDATE users SET contractor_notifications = jsonb_build_object(
  'job_alerts_enabled', COALESCE(job_alerts_enabled, true),
  'application_updates', true,
  'weekly_digest', true,
  'marketing_emails', false
) WHERE contractor_notifications IS NULL;

-- Set default values for new users
ALTER TABLE users ALTER COLUMN contractor_notifications SET DEFAULT jsonb_build_object(
  'job_alerts_enabled', true,
  'application_updates', true,
  'weekly_digest', true,
  'marketing_emails', false
);

-- Create index for JSONB queries on contractor notifications
CREATE INDEX idx_users_contractor_notifications ON users USING GIN (contractor_notifications);

-- Add comments for documentation
COMMENT ON COLUMN users.contractor_notifications IS 'JSONB object containing contractor notification preferences: job_alerts_enabled, application_updates, weekly_digest, marketing_emails';
COMMENT ON COLUMN users.recruiter_notifications IS 'JSONB object containing recruiter notification preferences: weekly_click_reports, job_performance_summaries, marketing_emails';

-- Note: We keep the job_alerts_enabled column for backward compatibility
-- but the source of truth is now contractor_notifications.job_alerts_enabled