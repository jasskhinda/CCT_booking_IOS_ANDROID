-- Check what notification tables exist and their structure
-- Run this in Supabase SQL Editor

-- 1. Check which notification-related tables exist
SELECT 
  table_name,
  CASE 
    WHEN table_name = 'notifications' THEN '✅ UNIFIED table (new system)'
    WHEN table_name = 'push_tokens' THEN '✅ UNIFIED table (new system)'
    WHEN table_name = 'client_notifications' THEN '⚠️ OLD table (not used anymore)'
    WHEN table_name = 'client_push_tokens' THEN '⚠️ OLD table (not used anymore)'
    ELSE 'Other'
  END as status
FROM information_schema.tables 
WHERE table_name LIKE '%notification%' 
   OR table_name LIKE '%push_token%'
ORDER BY table_name;

-- 2. Check notifications table structure (if it exists)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'notifications'
ORDER BY ordinal_position;

-- 3. Check push_tokens table structure (if it exists)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'push_tokens'
ORDER BY ordinal_position;

-- 4. Check if app_type column exists in notifications
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'notifications' 
      AND column_name = 'app_type'
    ) 
    THEN '✅ app_type column EXISTS in notifications table'
    ELSE '❌ app_type column MISSING in notifications table'
  END as app_type_status;

-- 5. Check if app_type column exists in push_tokens
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'push_tokens' 
      AND column_name = 'app_type'
    ) 
    THEN '✅ app_type column EXISTS in push_tokens table'
    ELSE '❌ app_type column MISSING in push_tokens table'
  END as app_type_status;

-- 6. Count existing data
SELECT 
  'notifications' as table_name,
  COUNT(*) as row_count
FROM notifications
UNION ALL
SELECT 
  'push_tokens' as table_name,
  COUNT(*) as row_count
FROM push_tokens;
