-- Debug: Check what status trips are created with
-- This will help us understand why the trigger isn't firing

-- 1. Show recent trips with their status progression
SELECT 
  id,
  user_id,
  status,
  created_at,
  updated_at,
  CASE 
    WHEN created_at = updated_at THEN '🆕 Just created (no UPDATE yet)'
    ELSE '✏️ Has been updated'
  END as update_status
FROM trips 
WHERE user_id = '365d55fe-58a4-4b23-a9ae-df3d8412e7de'
ORDER BY created_at DESC 
LIMIT 10;

-- 2. The trigger only fires on UPDATE, not INSERT!
-- When you BOOK a trip, it's an INSERT (trigger doesn't fire)
-- The trigger fires when status CHANGES (UPDATE)

-- Let's check if we need a trigger for INSERT too
SELECT 
  '⚠️ IMPORTANT: Trigger only fires on UPDATE' as info,
  'When booking a new trip (INSERT), no notification is sent' as problem,
  'Notification only sent when status CHANGES (UPDATE)' as current_behavior,
  'We need to add an INSERT trigger too!' as solution;
