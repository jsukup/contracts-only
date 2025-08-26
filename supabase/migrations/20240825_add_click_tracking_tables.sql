-- Add click tracking and notification system tables
-- These tables support the external link click tracking and weekly reporting features

-- Add new fields to jobs table for external URL and click tracking
ALTER TABLE jobs ADD COLUMN external_url TEXT;
ALTER TABLE jobs ADD COLUMN click_tracking_enabled BOOLEAN DEFAULT FALSE NOT NULL;

-- Add new field to users table for recruiter notifications
ALTER TABLE users ADD COLUMN recruiter_notifications JSONB;

-- Create table for tracking external link clicks
CREATE TABLE job_external_link_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL for anonymous clicks
  external_url TEXT NOT NULL,
  referrer_url TEXT,
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT, -- For tracking anonymous users
  clicked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create table for notification queue (async email processing)
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'weekly_report', 'external_link_click', etc.
  data JSONB, -- Flexible data storage for different notification types
  status TEXT DEFAULT 'pending' NOT NULL, -- 'pending', 'sent', 'failed', 'cancelled'
  scheduled_for TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  attempts INTEGER DEFAULT 0 NOT NULL,
  max_attempts INTEGER DEFAULT 3 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_clicks_job_id ON job_external_link_clicks(job_id);
CREATE INDEX idx_clicks_clicked_at ON job_external_link_clicks(clicked_at DESC);
CREATE INDEX idx_clicks_user_id ON job_external_link_clicks(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX idx_notifications_recipient ON notification_queue(recipient_id);
CREATE INDEX idx_notifications_status ON notification_queue(status);
CREATE INDEX idx_notifications_created ON notification_queue(created_at DESC);
CREATE INDEX idx_notifications_type ON notification_queue(notification_type);

-- Update the updated_at trigger for notification_queue
CREATE TRIGGER update_notification_queue_updated_at 
  BEFORE UPDATE ON notification_queue 
  FOR EACH ROW 
  EXECUTE PROCEDURE update_updated_at_column();