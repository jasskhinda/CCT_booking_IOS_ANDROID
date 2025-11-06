-- Check if unified notification tables exist
SELECT 
  'Checking for unified notification tables...' as status;

-- Check push_tokens table
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'push_tokens'
    ) 
    THEN '✅ push_tokens table EXISTS'
    ELSE '❌ push_tokens table MISSING'
  END as push_tokens_status;

-- Check notifications table
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'notifications'
    ) 
    THEN '✅ notifications table EXISTS'
    ELSE '❌ notifications table MISSING'
  END as notifications_status;

-- Check old client_notifications table (shouldn't exist)
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'client_notifications'
    ) 
    THEN '⚠️  OLD client_notifications table exists (can be ignored)'
    ELSE 'ℹ️  Old client_notifications table does not exist (good)'
  END as old_table_status;

-- If push_tokens exists, show structure
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'push_tokens') THEN
    RAISE NOTICE '📋 push_tokens columns:';
  END IF;
END $$;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'push_tokens'
ORDER BY ordinal_position;

-- If notifications exists, show structure
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    RAISE NOTICE '📋 notifications columns:';
  END IF;
END $$;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'notifications'
ORDER BY ordinal_position;
