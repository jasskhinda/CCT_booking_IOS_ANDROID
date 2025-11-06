-- Add trigger for INSERT (new trip bookings)
-- This will send a notification when a trip is first created
-- Run this in Supabase SQL Editor

-- Create or replace the function to handle both INSERT and UPDATE
CREATE OR REPLACE FUNCTION notify_trip_status_change()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_body TEXT;
  target_user_id UUID;
  old_status TEXT;
BEGIN
  -- For INSERT, OLD doesn't exist, so old_status is NULL
  IF TG_OP = 'INSERT' THEN
    old_status := NULL;
  ELSE
    old_status := OLD.status;
  END IF;

  -- Only send notification if:
  -- 1. It's a new trip (INSERT), OR
  -- 2. Status changed (UPDATE with different status)
  IF (TG_OP = 'INSERT') OR (old_status IS DISTINCT FROM NEW.status) THEN
    
    -- Determine which user_id to notify (authenticated user, not managed clients)
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
    INSERT INTO notifications (user_id, app_type, notification_type, title, body, data)
    VALUES (
      target_user_id,
      'booking',
      'trip_update',
      notification_title,
      notification_body,
      jsonb_build_object(
        'tripId', NEW.id, 
        'status', NEW.status, 
        'type', 'trip_update',
        'pickupAddress', NEW.pickup_address,
        'destinationAddress', NEW.destination_address
      )
    );

    IF TG_OP = 'INSERT' THEN
      RAISE NOTICE 'Notification sent to user % for NEW trip %', target_user_id, NEW.id;
    ELSE
      RAISE NOTICE 'Notification sent to user % for trip % status change: % -> %', 
        target_user_id, NEW.id, old_status, NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing UPDATE trigger
DROP TRIGGER IF EXISTS trigger_notify_trip_status ON trips;

-- Create NEW trigger that fires on BOTH INSERT and UPDATE
CREATE TRIGGER trigger_notify_trip_status
AFTER INSERT OR UPDATE ON trips
FOR EACH ROW
EXECUTE FUNCTION notify_trip_status_change();

-- Verify it was created
SELECT 
  '✅ DONE: Trigger now fires on INSERT and UPDATE!' as status,
  'Book a new trip to test!' as next_step;

-- Show trigger details
SELECT 
  tgname as trigger_name,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgname = 'trigger_notify_trip_status';
