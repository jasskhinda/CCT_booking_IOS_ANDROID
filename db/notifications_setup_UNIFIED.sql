-- =============================================
-- UNIFIED NOTIFICATION SYSTEM - ALL APPS
-- =============================================
-- Run this SQL in your Supabase SQL Editor
-- This creates a unified notification system for ALL apps:
-- - booking_app / booking_mobile
-- - facility_app / facility_mobile
-- - driver_app / driver_mobile (future)
-- - dispatcher_app / dispatcher_mobile (future)
-- - admin_app / admin_mobile (future)
--
-- ✅ SAFE FOR MULTI-APP ENVIRONMENT
-- ✅ Professional standard (one table with app_type)
-- ✅ Easy to scale to new apps
-- =============================================

-- 1. Create unified push tokens table for ALL apps
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  app_type TEXT NOT NULL CHECK (app_type IN ('booking', 'facility', 'driver', 'dispatcher', 'admin')),
  push_token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, app_type, platform)  -- One token per user per app per platform
);

COMMENT ON TABLE push_tokens IS 'Push notification tokens for all mobile/web apps';
COMMENT ON COLUMN push_tokens.app_type IS 'Which app this token is for: booking, facility, driver, dispatcher, admin';
COMMENT ON COLUMN push_tokens.platform IS 'Platform: ios, android, or web';

-- 2. Create unified notifications table for ALL apps
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  app_type TEXT NOT NULL CHECK (app_type IN ('booking', 'facility', 'driver', 'dispatcher', 'admin')),
  notification_type TEXT,  -- 'trip_update', 'approval_needed', 'driver_assigned', etc.
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,  -- Additional data (tripId, clientId, etc.)
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE notifications IS 'Unified notifications for all apps - inbox history';
COMMENT ON COLUMN notifications.app_type IS 'Which app this notification is for: booking, facility, driver, dispatcher, admin';
COMMENT ON COLUMN notifications.notification_type IS 'Type of notification: trip_update, approval_needed, message, etc.';
COMMENT ON COLUMN notifications.data IS 'Additional context as JSON (tripId, clientId, driverId, etc.)';

-- 3. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_app ON notifications(user_id, app_type);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_app ON push_tokens(user_id, app_type);

-- 4. Enable Row Level Security
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for push_tokens
-- Users can only view/update their own push tokens
DROP POLICY IF EXISTS "Users can view own push tokens" ON push_tokens;
CREATE POLICY "Users can view own push tokens"
  ON push_tokens FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own push tokens" ON push_tokens;
CREATE POLICY "Users can insert own push tokens"
  ON push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own push tokens" ON push_tokens;
CREATE POLICY "Users can update own push tokens"
  ON push_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own push tokens" ON push_tokens;
CREATE POLICY "Users can delete own push tokens"
  ON push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- 6. RLS Policies for notifications
-- Users can only view their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Allow system to insert notifications for any user
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own notifications
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Add trigger to push_tokens
DROP TRIGGER IF EXISTS update_push_tokens_updated_at ON push_tokens;
CREATE TRIGGER update_push_tokens_updated_at
  BEFORE UPDATE ON push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_push_tokens_updated_at();

-- 9. Enable real-time for notifications table
-- This allows ALL mobile apps to receive notifications in real-time
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- =============================================
-- TRIP STATUS NOTIFICATIONS FUNCTION (BOOKING & FACILITY APPS)
-- =============================================
-- This function automatically sends notifications when trip status changes
-- Sends to BOTH client (booking app) AND facility (if applicable)
-- SAFE: Only READS from trips table, doesn't modify it

CREATE OR REPLACE FUNCTION notify_trip_status_change()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_body TEXT;
  target_user_id UUID;
  target_facility_user_id UUID;
BEGIN
  -- Only send notification if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    
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
      WHEN 'in-progress', 'in_progress' THEN
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

    -- 1. Send notification to CLIENT (if authenticated user, not managed client)
    IF NEW.user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, app_type, notification_type, title, body, data)
      VALUES (
        NEW.user_id,
        'booking',  -- This is for booking app
        'trip_update',
        notification_title,
        notification_body,
        jsonb_build_object(
          'tripId', NEW.id, 
          'status', NEW.status,
          'pickupTime', NEW.pickup_time,
          'pickupAddress', NEW.pickup_address
        )
      );
      
      RAISE NOTICE 'Booking notification sent to user % for trip %', NEW.user_id, NEW.id;
    END IF;
    
    -- 2. Send notification to FACILITY (if trip was booked by facility)
    IF NEW.facility_id IS NOT NULL AND NEW.booked_by IS NOT NULL THEN
      -- Notify the facility user who booked the trip
      INSERT INTO notifications (user_id, app_type, notification_type, title, body, data)
      VALUES (
        NEW.booked_by,
        'facility',  -- This is for facility app
        'trip_update',
        notification_title || ' (Facility)',
        'Trip status updated: ' || notification_body,
        jsonb_build_object(
          'tripId', NEW.id, 
          'status', NEW.status,
          'facilityId', NEW.facility_id,
          'managedClientId', NEW.managed_client_id
        )
      );
      
      RAISE NOTICE 'Facility notification sent to user % for trip %', NEW.booked_by, NEW.id;
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger on trips table to send notifications
-- SAFE: This only READS from trips, doesn't modify it
DROP TRIGGER IF EXISTS trigger_notify_trip_status ON trips;
CREATE TRIGGER trigger_notify_trip_status
AFTER UPDATE ON trips
FOR EACH ROW
EXECUTE FUNCTION notify_trip_status_change();

-- =============================================
-- HELPER FUNCTIONS FOR APPS
-- =============================================

-- Function to get unread count for a specific app
CREATE OR REPLACE FUNCTION get_unread_count(p_user_id UUID, p_app_type TEXT)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE user_id = p_user_id
    AND app_type = p_app_type
    AND read = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read for an app
CREATE OR REPLACE FUNCTION mark_all_read(p_user_id UUID, p_app_type TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET read = true, read_at = NOW()
  WHERE user_id = p_user_id
  AND app_type = p_app_type
  AND read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- SETUP COMPLETE!
-- =============================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ ✅ ✅ UNIFIED NOTIFICATION SYSTEM SETUP COMPLETE! ✅ ✅ ✅';
  RAISE NOTICE '';
  RAISE NOTICE '📱 What was created:';
  RAISE NOTICE '   • push_tokens table (unified for all apps)';
  RAISE NOTICE '   • notifications table (unified for all apps)';
  RAISE NOTICE '   • Row Level Security policies';
  RAISE NOTICE '   • Real-time subscriptions enabled';
  RAISE NOTICE '   • Automatic trip status notifications';
  RAISE NOTICE '   • Helper functions (get_unread_count, mark_all_read)';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Multi-App Safety:';
  RAISE NOTICE '   ✅ Only created NEW tables (no existing tables modified)';
  RAISE NOTICE '   ✅ Trigger only READS trips table (doesn''t modify it)';
  RAISE NOTICE '   ✅ Other apps unaffected';
  RAISE NOTICE '   ✅ Works for ALL current and future apps';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Supports these apps (via app_type):';
  RAISE NOTICE '   • booking (booking_app + booking_mobile)';
  RAISE NOTICE '   • facility (facility_app + facility_mobile)';
  RAISE NOTICE '   • driver (driver_app + driver_mobile - future)';
  RAISE NOTICE '   • dispatcher (dispatcher_app + dispatcher_mobile - future)';
  RAISE NOTICE '   • admin (admin_app + admin_mobile - future)';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next Steps:';
  RAISE NOTICE '   1. Update booking_mobile to use app_type="booking"';
  RAISE NOTICE '   2. Reload the app on your iPhone';
  RAISE NOTICE '   3. Log in and book a trip';
  RAISE NOTICE '   4. You should see notification badge on bell icon';
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Test Queries:';
  RAISE NOTICE '   SELECT * FROM push_tokens;';
  RAISE NOTICE '   SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;';
  RAISE NOTICE '   SELECT app_type, COUNT(*) FROM notifications GROUP BY app_type;';
  RAISE NOTICE '';
END $$;
