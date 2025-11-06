-- Test real-time notifications while app is open
-- Run this while booking_mobile is OPEN and you're logged in

-- 1. First, verify the app is subscribed
-- Check your Metro logs for:
-- "✅ Notification monitoring ACTIVE"
-- "📡 Notification subscription status: SUBSCRIBED"

-- 2. Once you see the app is subscribed, run this to insert a test notification:
INSERT INTO notifications (user_id, app_type, notification_type, title, body, data)
VALUES (
  '365d55fe-58a4-4b23-a9ae-df3d8412e7de',
  'booking',
  'test',
  '🧪 Test Notification',
  'This is a test notification to check real-time updates!',
  jsonb_build_object('type', 'test', 'message', 'Testing real-time')
);

-- 3. Check Metro logs immediately after running this
-- You should see:
-- "🔔 New notification received via Supabase real-time"
-- "📋 Notification details: ..."
-- "✅ Local notification scheduled successfully"

-- 4. You should also see a push notification on your iPhone!

-- 5. Check if it was created:
SELECT * FROM notifications 
WHERE user_id = '365d55fe-58a4-4b23-a9ae-df3d8412e7de'
AND app_type = 'booking'
ORDER BY created_at DESC 
LIMIT 5;
