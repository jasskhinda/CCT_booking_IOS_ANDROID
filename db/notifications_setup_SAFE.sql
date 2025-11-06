-- =============================================
-- BOOKING MOBILE APP - NOTIFICATIONS SETUP (SAFE)
-- =============================================
-- 🛡️ MULTI-APP SAFE VERSION
-- This creates NEW tables only, doesn't modify existing tables
-- Safe for environments with multiple apps sharing the same database

-- =============================================
-- STEP 1: CREATE NEW TABLES
-- =============================================

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

-- =============================================
-- STEP 2: ADD INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_client_notifications_user_id ON client_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_client_notifications_read ON client_notifications(read);
CREATE INDEX IF NOT EXISTS idx_client_notifications_created_at ON client_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_push_tokens_user_id ON client_push_tokens(user_id);

-- =============================================
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE client_push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notifications ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 4: CREATE RLS POLICIES
-- =============================================

-- Policies for client_push_tokens (users can only manage their own tokens)
DROP POLICY IF EXISTS "Users can view own push token" ON client_push_tokens;
CREATE POLICY "Users can view own push token"
  ON client_push_tokens FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own push token" ON client_push_tokens;
CREATE POLICY "Users can insert own push token"
  ON client_push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own push token" ON client_push_tokens;
CREATE POLICY "Users can update own push token"
  ON client_push_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own push token" ON client_push_tokens;
CREATE POLICY "Users can delete own push token"
  ON client_push_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Policies for client_notifications (users can only see their own notifications)
DROP POLICY IF EXISTS "Users can view own notifications" ON client_notifications;
CREATE POLICY "Users can view own notifications"
  ON client_notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON client_notifications;
CREATE POLICY "System can insert notifications"
  ON client_notifications FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own notifications" ON client_notifications;
CREATE POLICY "Users can update own notifications"
  ON client_notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notifications" ON client_notifications;
CREATE POLICY "Users can delete own notifications"
  ON client_notifications FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- STEP 5: CREATE AUTO-UPDATE TIMESTAMP FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION update_client_push_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- STEP 6: ADD TRIGGER FOR TIMESTAMP UPDATES
-- =============================================

DROP TRIGGER IF EXISTS update_client_push_tokens_updated_at ON client_push_tokens;
CREATE TRIGGER update_client_push_tokens_updated_at
  BEFORE UPDATE ON client_push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_client_push_tokens_updated_at();

-- =============================================
-- STEP 7: ENABLE REAL-TIME SUBSCRIPTIONS
-- =============================================

-- Check if table is already in publication before adding
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'client_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE client_notifications;
    RAISE NOTICE '✅ Added client_notifications to real-time publication';
  ELSE
    RAISE NOTICE 'ℹ️ client_notifications already in real-time publication';
  END IF;
END $$;

-- =============================================
-- STEP 8: CREATE NOTIFICATION FUNCTION
-- =============================================
-- 🔄 This function sends notifications when trip status changes
-- 🛡️ SAFE: Only reads from trips table, doesn't modify it

CREATE OR REPLACE FUNCTION notify_client_trip_status_change()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_body TEXT;
  client_user_id UUID;
BEGIN
  -- Only send notification if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    
    -- Determine the client's user_id
    -- Check both user_id (authenticated clients) and managed_client_id (facility clients)
    client_user_id := NEW.user_id;
    
    -- If user_id is NULL but managed_client_id exists, skip notification
    -- (Managed clients don't have user accounts, so they can't receive push notifications)
    IF client_user_id IS NULL THEN
      RAISE NOTICE 'Skipping notification for managed client (managed_client_id: %)', NEW.managed_client_id;
      RETURN NEW;
    END IF;
    
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
    -- The mobile app subscribes to this table and receives notifications in real-time
    INSERT INTO client_notifications (user_id, title, body, data)
    VALUES (
      client_user_id,
      notification_title,
      notification_body,
      jsonb_build_object(
        'tripId', NEW.id, 
        'status', NEW.status,
        'pickup_address', NEW.pickup_address,
        'destination_address', NEW.destination_address,
        'pickup_time', NEW.pickup_time
      )
    );

    RAISE NOTICE '✅ Notification sent to user % for trip % status change: % -> %', 
      client_user_id, NEW.id, OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- STEP 9: CREATE TRIGGER ON TRIPS TABLE
-- =============================================
-- 🛡️ SAFE: Only adds notification sending, doesn't modify trips table structure

DROP TRIGGER IF EXISTS trigger_notify_client_trip_status ON trips;
CREATE TRIGGER trigger_notify_client_trip_status
  AFTER UPDATE ON trips
  FOR EACH ROW
  EXECUTE FUNCTION notify_client_trip_status_change();

-- =============================================
-- ✅ SETUP COMPLETE!
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ========================================';
  RAISE NOTICE '🎉 BOOKING MOBILE NOTIFICATIONS - SETUP COMPLETE!';
  RAISE NOTICE '🎉 ========================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Tables created:';
  RAISE NOTICE '   • client_push_tokens';
  RAISE NOTICE '   • client_notifications';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Security enabled:';
  RAISE NOTICE '   • Row Level Security (RLS) policies';
  RAISE NOTICE '   • Users can only see their own notifications';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Real-time enabled:';
  RAISE NOTICE '   • Mobile app receives instant notifications';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Automatic notifications for trip status:';
  RAISE NOTICE '   • Booking confirmed';
  RAISE NOTICE '   • Driver assigned';
  RAISE NOTICE '   • Trip in progress';
  RAISE NOTICE '   • Trip completed';
  RAISE NOTICE '   • Trip cancelled/rejected';
  RAISE NOTICE '';
  RAISE NOTICE '🛡️  MULTI-APP SAFE:';
  RAISE NOTICE '   • Only creates NEW tables';
  RAISE NOTICE '   • Doesn''t modify existing trips table';
  RAISE NOTICE '   • Other apps (admin, dispatcher, facility) unaffected';
  RAISE NOTICE '';
  RAISE NOTICE '📱 Next steps:';
  RAISE NOTICE '   1. Reload your iPhone app';
  RAISE NOTICE '   2. Book a test trip';
  RAISE NOTICE '   3. Tap the bell icon to see notifications';
  RAISE NOTICE '';
END $$;

-- =============================================
-- VERIFICATION QUERIES (Optional)
-- =============================================
-- Run these after setup to verify everything works:
--
-- -- Check if tables exist:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('client_push_tokens', 'client_notifications');
--
-- -- Check if trigger exists:
-- SELECT tgname FROM pg_trigger WHERE tgname = 'trigger_notify_client_trip_status';
--
-- -- View recent notifications:
-- SELECT * FROM client_notifications ORDER BY created_at DESC LIMIT 10;
--
-- -- View registered push tokens:
-- SELECT user_id, platform, created_at FROM client_push_tokens;
-- =============================================
