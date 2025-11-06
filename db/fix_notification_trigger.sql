-- Fix notification trigger to fire on INSERT (new bookings)
-- Currently, the trigger only fires on UPDATE, so no notifications are sent when trips are first created

-- Update the trigger to fire on BOTH INSERT and UPDATE
DROP TRIGGER IF EXISTS trigger_notify_trip_status ON trips;
CREATE TRIGGER trigger_notify_trip_status
AFTER INSERT OR UPDATE ON trips  -- Changed from "AFTER UPDATE" to "AFTER INSERT OR UPDATE"
FOR EACH ROW
EXECUTE FUNCTION notify_trip_status_change();

COMMENT ON TRIGGER trigger_notify_trip_status ON trips IS 'Sends notifications to users when trips are created or status changes';

-- Update the function to handle INSERT events properly
CREATE OR REPLACE FUNCTION notify_trip_status_change()
RETURNS TRIGGER AS $$
DECLARE
  notification_title TEXT;
  notification_body TEXT;
  target_user_id UUID;
  target_facility_user_id UUID;
BEGIN
  -- For INSERT (new trip), always send notification
  -- For UPDATE, only send if status changed
  IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status)) THEN
    
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

-- Test the fix by checking if the trigger is properly set up
SELECT 
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  CASE tgtype::integer & 66
    WHEN 2 THEN 'BEFORE'
    WHEN 64 THEN 'INSTEAD OF'
    ELSE 'AFTER'
  END AS trigger_timing,
  CASE tgtype::integer & 28
    WHEN 4 THEN 'INSERT'
    WHEN 8 THEN 'DELETE'
    WHEN 16 THEN 'UPDATE'
    WHEN 12 THEN 'INSERT OR DELETE'
    WHEN 20 THEN 'INSERT OR UPDATE'
    WHEN 24 THEN 'DELETE OR UPDATE'
    WHEN 28 THEN 'INSERT OR UPDATE OR DELETE'
  END AS trigger_event,
  pg_get_functiondef(tgfoid) LIKE '%TG_OP = ''INSERT''%' AS handles_insert
FROM pg_trigger
WHERE tgname = 'trigger_notify_trip_status'
AND NOT tgisinternal;
