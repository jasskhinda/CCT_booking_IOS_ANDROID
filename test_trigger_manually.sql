-- Test if the trigger works by manually updating a trip
-- Run this in Supabase SQL Editor

-- 1. First, find your latest trip
SELECT 
  id,
  user_id,
  status,
  pickup_address,
  destination_address,
  created_at
FROM trips 
WHERE user_id = '365d55fe-58a4-4b23-a9ae-df3d8412e7de'
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Check if user_id is not null (required for notifications)
SELECT 
  id,
  user_id,
  managed_client_id,
  status,
  CASE 
    WHEN user_id IS NOT NULL THEN '✅ user_id is SET (will get notification)'
    WHEN managed_client_id IS NOT NULL THEN '⚠️ managed_client (NO notification - facility client)'
    ELSE '❌ Both NULL (ERROR!)'
  END as notification_status
FROM trips 
WHERE user_id = '365d55fe-58a4-4b23-a9ae-df3d8412e7de'
   OR managed_client_id IS NOT NULL
ORDER BY created_at DESC 
LIMIT 5;

-- 3. Try to manually trigger a notification by updating a trip status
-- Replace 'YOUR_TRIP_ID_HERE' with an actual trip ID from step 1
-- UNCOMMENT and run after replacing the ID:

/*
UPDATE trips 
SET status = 'confirmed' 
WHERE id = 'YOUR_TRIP_ID_HERE'
AND user_id = '365d55fe-58a4-4b23-a9ae-df3d8412e7de';
*/

-- 4. After running the UPDATE above, check if notification was created
SELECT * FROM notifications 
WHERE user_id = '365d55fe-58a4-4b23-a9ae-df3d8412e7de'
ORDER BY created_at DESC;

-- 5. Check PostgreSQL logs for any trigger errors
-- (This shows if the trigger fired but had an error)
SELECT 
  'Check Supabase Dashboard > Logs for any trigger errors' as info;
