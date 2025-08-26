-- Enable RLS for job_external_link_clicks table
ALTER TABLE job_external_link_clicks ENABLE ROW LEVEL SECURITY;

-- Enable RLS for notification_queue table  
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Policies for job_external_link_clicks table

-- Policy 1: Allow anonymous inserts (for tracking clicks from non-authenticated users)
CREATE POLICY "Allow anonymous click tracking inserts"
  ON job_external_link_clicks
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy 2: Job posters can view clicks for their own jobs
CREATE POLICY "Job posters can view their job clicks"
  ON job_external_link_clicks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM jobs 
      WHERE jobs.id = job_external_link_clicks.job_id 
      AND jobs.poster_id = auth.uid()
    )
  );

-- Policy 3: Admins can view all clicks
CREATE POLICY "Admins can view all clicks"
  ON job_external_link_clicks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Policy 4: Service role can manage all clicks (for automated processes)
CREATE POLICY "Service role full access to clicks"
  ON job_external_link_clicks
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policies for notification_queue table

-- Policy 1: Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notification_queue
  FOR SELECT
  TO authenticated
  USING (recipient_id = auth.uid());

-- Policy 2: Users can update their own notifications (mark as read, etc.)
CREATE POLICY "Users can update own notifications"
  ON notification_queue
  FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Policy 3: System can insert notifications for any user (using service role)
CREATE POLICY "Service role can insert notifications"
  ON notification_queue
  FOR INSERT
  TO service_role, authenticated
  WITH CHECK (true);

-- Policy 4: Service role full access for automated processes
CREATE POLICY "Service role full access to notifications"
  ON notification_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy 5: Authenticated users can delete their own processed notifications
CREATE POLICY "Users can delete own processed notifications"
  ON notification_queue
  FOR DELETE
  TO authenticated
  USING (
    recipient_id = auth.uid() 
    AND status IN ('sent', 'failed', 'cancelled')
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_clicks_job_id ON job_external_link_clicks(job_id);
CREATE INDEX IF NOT EXISTS idx_clicks_clicked_at ON job_external_link_clicks(clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_clicks_user_id ON job_external_link_clicks(user_id) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notification_queue(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notification_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notification_queue(notification_type);

-- Add comment documentation
COMMENT ON POLICY "Allow anonymous click tracking inserts" ON job_external_link_clicks IS 
  'Allows both anonymous and authenticated users to track clicks on external job links';

COMMENT ON POLICY "Job posters can view their job clicks" ON job_external_link_clicks IS 
  'Recruiters can view click analytics for jobs they posted';

COMMENT ON POLICY "Users can view own notifications" ON notification_queue IS 
  'Users can only see notifications intended for them';

COMMENT ON POLICY "Service role can insert notifications" ON notification_queue IS 
  'System processes can queue notifications for users';