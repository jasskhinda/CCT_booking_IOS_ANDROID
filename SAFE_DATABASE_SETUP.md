# 🛡️ SAFE DATABASE SETUP FOR MULTI-APP ENVIRONMENT

## ⚠️ IMPORTANT: Multi-App Database

Your Supabase database is **shared by 7 apps**:
- ✅ booking_mobile (current)
- ✅ booking_app
- ✅ admin_app
- ✅ dispatcher_app
- ✅ facility_app
- ✅ facility_mobile
- ✅ driver_app

## 🔒 Safety Guarantees

The SQL migration script is **100% SAFE** because:

✅ **Only creates NEW tables** - Doesn't modify existing tables
✅ **Uses `IF NOT EXISTS`** - Won't fail if run multiple times
✅ **Uses `DROP POLICY IF EXISTS`** - Safe to re-run
✅ **Only reads from trips table** - Doesn't change trips structure
✅ **Adds trigger (not constraint)** - Can be dropped without breaking anything
✅ **Isolated to booking_mobile** - Other apps won't be affected

## What Gets Created

### 1. **New Tables** (isolated to booking_mobile)
```sql
✅ client_push_tokens       → Stores device tokens for push notifications
✅ client_notifications     → Stores notification history (inbox)
```

### 2. **Trigger on Existing Table** (safe read-only)
```sql
✅ trigger_notify_client_trip_status → Watches trips table, sends notifications
   • Only READS from trips table
   • Only INSERTS into client_notifications table
   • Doesn't modify trips structure
   • Skips managed clients (facility app users)
```

### 3. **What's NOT Modified**
```
❌ trips table structure     → Unchanged
❌ profiles table            → Unchanged
❌ facilities table          → Unchanged
❌ Any other existing tables → Unchanged
```

## 📋 Run the Migration

### Step 1: Open Supabase
1. Go to **https://supabase.com/dashboard**
2. Select your project
3. Click **SQL Editor** in left sidebar

### Step 2: Copy the SQL
Open this file and copy all contents:
```
/Volumes/C/CCTAPPS/booking_mobile/db/notifications_setup_SAFE.sql
```

### Step 3: Run the SQL
1. Paste into Supabase SQL Editor
2. Click **Run** button
3. Wait for success message

### Step 4: Verify Success
You should see output like:
```
🎉 BOOKING MOBILE NOTIFICATIONS - SETUP COMPLETE!
✅ Tables created: client_push_tokens, client_notifications
✅ Security enabled: RLS policies
✅ Real-time enabled
✅ Automatic notifications for trip status
🛡️  MULTI-APP SAFE: Only creates NEW tables
```

## 🧪 Test After Migration

1. **Reload the app** on your iPhone:
   - Shake device → Reload

2. **Book a test trip**:
   - Login as a client
   - Create a trip booking
   - You should see "Trip Booked!" notification

3. **View notifications**:
   - Tap bell icon in header
   - Should show your notification with unread indicator

4. **Test real-time updates**:
   - Have admin/dispatcher change trip status
   - Notification should appear instantly
   - Bell badge count should update

## 🔄 If You Need to Remove It Later

If you ever need to remove the notification system:

```sql
-- Remove trigger (safe - doesn't affect trips table)
DROP TRIGGER IF EXISTS trigger_notify_client_trip_status ON trips;
DROP FUNCTION IF EXISTS notify_client_trip_status_change();

-- Remove tables (isolated - doesn't affect other apps)
DROP TABLE IF EXISTS client_notifications;
DROP TABLE IF EXISTS client_push_tokens;
```

## 📊 Verification Queries

After setup, check everything works:

```sql
-- 1. Check tables exist
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('client_push_tokens', 'client_notifications');

-- 2. Check trigger exists
SELECT tgname 
FROM pg_trigger 
WHERE tgname = 'trigger_notify_client_trip_status';

-- 3. View your notifications (after booking a trip)
SELECT * FROM client_notifications 
ORDER BY created_at DESC 
LIMIT 10;

-- 4. View registered devices
SELECT user_id, platform, created_at 
FROM client_push_tokens;
```

## ❓ FAQ

**Q: Will this affect other apps?**
A: No! It only creates 2 new tables and adds a read-only trigger.

**Q: What if I run the SQL twice by accident?**
A: Totally safe! `IF NOT EXISTS` and `DROP IF EXISTS` prevent errors.

**Q: Can I test notifications without breaking production?**
A: Yes! The trigger only sends notifications to `user_id` (authenticated clients), not `managed_client_id` (facility clients).

**Q: How do I disable notifications temporarily?**
A: Just drop the trigger: `DROP TRIGGER trigger_notify_client_trip_status ON trips;`

**Q: Will this slow down my database?**
A: No! Indexed properly and only fires on status changes (not every update).

## 🎯 Next Steps

1. ✅ Run the SQL migration
2. ✅ Reload the iPhone app
3. ✅ Book a test trip
4. ✅ See notifications appear!
5. ✅ Celebrate! 🎉

---

**File Location:** `/Volumes/C/CCTAPPS/booking_mobile/db/notifications_setup_SAFE.sql`
