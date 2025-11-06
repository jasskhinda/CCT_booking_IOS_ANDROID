-- Check if the tables have the correct structure with app_type column
-- Run this in Supabase SQL Editor

-- Check notifications table columns
SELECT 
  'notifications table columns:' as info,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- Check push_tokens table columns  
SELECT 
  'push_tokens table columns:' as info,
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_name = 'push_tokens'
ORDER BY ordinal_position;

-- Critical check: Does app_type column exist?
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'notifications' 
      AND column_name = 'app_type'
    ) 
    THEN '✅ GOOD: notifications.app_type EXISTS'
    ELSE '❌ PROBLEM: notifications.app_type MISSING - need to add it'
  END as notifications_app_type;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'push_tokens' 
      AND column_name = 'app_type'
    ) 
    THEN '✅ GOOD: push_tokens.app_type EXISTS'
    ELSE '❌ PROBLEM: push_tokens.app_type MISSING - need to add it'
  END as push_tokens_app_type;
