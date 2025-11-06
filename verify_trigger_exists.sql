-- Check if trigger and function exist
-- Run this in Supabase SQL Editor

-- 1. Check if function exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'notify_trip_status_change'
    ) 
    THEN '✅ Function EXISTS'
    ELSE '❌ Function MISSING - need to create it'
  END as function_status;

-- 2. Check if trigger exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger 
      WHERE tgname = 'trigger_notify_trip_status'
    ) 
    THEN '✅ Trigger EXISTS'
    ELSE '❌ Trigger MISSING - need to create it'
  END as trigger_status;

-- 3. Show all triggers on trips table
SELECT 
  tgname as trigger_name,
  CASE tgenabled
    WHEN 'O' THEN '✅ Enabled'
    WHEN 'D' THEN '❌ Disabled'
    ELSE '⚠️ Unknown'
  END as status
FROM pg_trigger
WHERE tgrelid = 'trips'::regclass
AND NOT tgisinternal
ORDER BY tgname;
