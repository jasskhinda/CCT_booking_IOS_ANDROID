-- Check if the notification trigger exists and create it if missing
-- Run this in Supabase SQL Editor

-- 1. Check if the trigger function exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'notify_trip_status_change'
    ) 
    THEN '✅ Function notify_trip_status_change EXISTS'
    ELSE '❌ Function notify_trip_status_change MISSING'
  END as function_status;

-- 2. Check if the trigger exists on trips table
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'trigger_notify_trip_status'
    ) 
    THEN '✅ Trigger trigger_notify_trip_status EXISTS'
    ELSE '❌ Trigger trigger_notify_trip_status MISSING'
  END as trigger_status;

-- 3. If missing, create the function and trigger
-- This is the SAFE version that won't cause the "already member of publication" error

-- Drop and recreate the function (safe to run multiple times)
CREATE OR REPLACE FUNCTION notify_trip_status_change()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_body TEXT;
  target_user_id UUID;
BEGIN
  -- Only send notification if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    
    -- Determine which user_id to notify (authenticated user, not managed clients)
    -- Managed clients don't have auth accounts, so they won't get push notifications
    IF NEW.user_id IS NOT NULL THEN
      target_user_id := NEW.user_id;
    ELSE
      -- Managed client (facility-booked) - skip push notification
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

    -- Insert notification into notifications table
    -- The mobile app is subscribed to this table and will receive it in real-time
    INSERT INTO notifications (user_id, app_type, notification_type, title, body, data)
    VALUES (
      target_user_id,
      'booking',  -- This is for booking app
      'trip_update',
      notification_title,
      notification_body,
      jsonb_build_object('tripId', NEW.id, 'status', NEW.status, 'type', 'trip_update')
    );

    RAISE NOTICE 'Notification sent to user % for trip % status change: % -> %', 
      target_user_id, NEW.id, OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists (to recreate it)
DROP TRIGGER IF EXISTS trigger_notify_trip_status ON trips;

-- Create the trigger on trips table
-- This trigger fires AFTER UPDATE on the trips table
CREATE TRIGGER trigger_notify_trip_status
AFTER UPDATE ON trips
FOR EACH ROW
EXECUTE FUNCTION notify_trip_status_change();

-- Verify it was created
SELECT 
  '✅ DONE: Trigger and function created!' as status,
  'Try booking another trip or changing a trip status' as next_step;

-- Show all triggers on trips table
SELECT 
  tgname as trigger_name,
  proname as function_name,
  CASE tgenabled
    WHEN 'O' THEN 'Enabled'
    WHEN 'D' THEN 'Disabled'
    ELSE 'Unknown'
  END as status
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'trips'::regclass
AND NOT tgisinternal;
