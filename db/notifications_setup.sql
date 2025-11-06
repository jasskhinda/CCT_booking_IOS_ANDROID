-- =============================================
-- BOOKING MOBILE APP - NOTIFICATIONS SETUP
-- =============================================
-- Run this SQL in your Supabase SQL Editor
-- This creates the tables needed for push notifications

-- 1. Create push tokens table for booking mobile clients
CREATE TABLE IF NOT EXISTS client_push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  platform TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. Create notification history table for booking mobile clients
CREATE TABLE IF NOT EXISTS client_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_notifications_user_id ON client_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_client_notifications_read ON client_notifications(read);
CREATE INDEX IF NOT EXISTS idx_client_notifications_created_at ON client_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_push_tokens_user_id ON client_push_tokens(user_id);

-- 4. Enable Row Level Security
ALTER TABLE client_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notifications ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for client_push_tokens
-- Users can only view/update their own push token
CREATE POLICY "Users can view own push token"
  ON client_push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push token"
  ON client_push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push token"
  ON client_push_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own push token"
  ON client_push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- 6. RLS Policies for client_notifications
-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
  ON client_notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Allow system to insert notifications for any user
CREATE POLICY "System can insert notifications"
  ON client_notifications FOR INSERT
  WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON client_notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON client_notifications FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_client_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Add trigger to client_push_tokens
DROP TRIGGER IF EXISTS update_client_push_tokens_updated_at ON client_push_tokens;
CREATE TRIGGER update_client_push_tokens_updated_at
  BEFORE UPDATE ON client_push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_client_push_tokens_updated_at();

-- 9. Enable real-time for client_notifications table
-- This allows the mobile app to receive notifications in real-time via Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE client_notifications;

-- =============================================
-- TRIP STATUS NOTIFICATIONS FUNCTION
-- =============================================
-- This function automatically sends notifications when trip status changes

CREATE OR REPLACE FUNCTION notify_client_trip_status_change()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_body TEXT;
  user_push_token TEXT;
BEGIN
  -- Only send notification if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    
    -- Get the client's user_id (assuming trips table has a user_id or client_id column)
    -- Adjust this based on your trips table structure
    
    -- Determine notification message based on status
    CASE NEW.status
      WHEN 'pending' THEN
        notification_title := '🚗 Trip Booked!';
        notification_body := 'Your trip has been submitted and is pending approval.';
      WHEN 'confirmed', 'approved' THEN
        notification_title := '✅ Trip Confirmed';
        notification_body := 'Your trip has been confirmed and scheduled!';
      WHEN 'assigned' THEN
        notification_title := '🚗 Driver Assigned';
        notification_body := 'A driver has been assigned to your trip.';
      WHEN 'in-progress' THEN
        notification_title := '🛣️ Trip In Progress';
        notification_body := 'Your trip is now in progress. Driver is on the way!';
      WHEN 'completed' THEN
        notification_title := '✅ Trip Completed';
        notification_body := 'Your trip has been completed. Thank you for using our service!';
      WHEN 'cancelled' THEN
        notification_title := '❌ Trip Cancelled';
        notification_body := 'Your trip has been cancelled.';
      WHEN 'rejected' THEN
        notification_title := '❌ Trip Request Denied';
        notification_body := 'Unfortunately, your trip request could not be accommodated at this time.';
      ELSE
        notification_title := 'Trip Update';
        notification_body := 'Your trip status has been updated.';
    END CASE;

    -- Insert notification into client_notifications table
    -- The mobile app is subscribed to this table and will receive it in real-time
    INSERT INTO client_notifications (user_id, title, body, data)
    VALUES (
      NEW.user_id, -- Adjust based on your trips table column name
      notification_title,
      notification_body,
      jsonb_build_object('tripId', NEW.id, 'status', NEW.status)
    );

    RAISE NOTICE 'Notification sent to user % for trip % status change: % -> %', 
      NEW.user_id, NEW.id, OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger on trips table to send notifications
DROP TRIGGER IF EXISTS trigger_notify_client_trip_status ON trips;
CREATE TRIGGER trigger_notify_client_trip_status
AFTER UPDATE ON trips
FOR EACH ROW
EXECUTE FUNCTION notify_client_trip_status_change();

-- =============================================
-- SETUP COMPLETE!
-- =============================================
-- Your notification system is now ready to use.
-- The mobile app will automatically:
-- 1. Register for push notifications
-- 2. Save push tokens to client_push_tokens
-- 3. Monitor trips in real-time
-- 4. Receive notifications for trip status changes
-- 5. Save notification history to client_notifications
-- =============================================

-- Query to check if notifications are working:
-- SELECT * FROM client_push_tokens;
-- SELECT * FROM client_notifications ORDER BY created_at DESC LIMIT 10;
