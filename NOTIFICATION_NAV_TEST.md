# Quick Test - Notification Navigation

## 🧪 How to Test Notification → Trip Navigation

### Prerequisites
- booking_mobile app running on your iPhone
- Logged in with a user account
- At least one trip booked

---

## ✅ Test 1: Create a Test Notification

### Option A: Using Web App (Easiest)
1. Log into booking_app or dispatcher_app on web
2. Find one of your trips
3. Change the trip status (e.g., from "pending" to "confirmed")
4. **Result:** Notification should appear on mobile app

### Option B: Using SQL (Direct)
Run this in Supabase SQL Editor:

```sql
-- Get your user ID first
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Get a trip ID
SELECT id, pickup_address, status FROM trips WHERE user_id = 'your-user-id' LIMIT 1;

-- Create a test notification
INSERT INTO notifications (user_id, app_type, notification_type, title, body, data, read)
VALUES (
  'your-user-id',  -- Replace with your user ID
  'booking',
  'trip_update',
  '✅ Test Notification',
  'Click me to see your trip details!',
  jsonb_build_object(
    'tripId', 'your-trip-id',  -- Replace with a real trip ID
    'status', 'confirmed',
    'pickupTime', NOW(),
    'pickupAddress', '123 Test St'
  ),
  false
);
```

---

## 🎯 Test 2: Verify Badge Shows

1. Look at the notification bell icon in app header
2. **Expected:** Red badge with number appears
3. **Expected:** Console shows: "📥 Fetching notifications for user: ..."

---

## 🎯 Test 3: Navigate via Badge

1. **Action:** Tap the notification bell icon
2. **Expected:** Notifications screen opens
3. **Expected:** List of notifications appears
4. **Expected:** Unread notifications have blue background

---

## 🎯 Test 4: Click Notification to Navigate to Trip

1. **Action:** Tap on any notification in the list
2. **Expected Console Logs:**
   ```
   🔔 Notification clicked: {
     id: "...",
     title: "✅ Test Notification",
     tripId: "...",
     data: { tripId: "...", status: "confirmed", ... }
   }
   ✅ Navigating to trip: trip-uuid
   ```
3. **Expected UI:**
   - Notification marked as read (blue background removed)
   - App navigates to Trip Details screen
   - Trip details displayed correctly
   - Back button works to return to notifications

---

## 🎯 Test 5: Real-time Update

1. **Action:** Keep app open on Notifications screen
2. **Action:** Change trip status from web app
3. **Expected:**
   - New notification appears instantly
   - Badge count increases
   - No need to refresh

---

## ❌ What to Check If It Doesn't Work

### Issue 1: No Badge Appears
**Check:**
- User is logged in
- Notification exists in database
- Notification has `app_type='booking'`
- Notification has `read=false`

**Fix:**
```sql
-- Check notifications
SELECT * FROM notifications 
WHERE user_id = 'your-user-id' 
AND app_type = 'booking'
ORDER BY created_at DESC;
```

### Issue 2: Notification Click Doesn't Navigate
**Check Console for:**
- `⚠️ No tripId found in notification data: { ... }`

**Fix:**
- Ensure notification has tripId in data field
- Check trigger is running correctly

**Test Query:**
```sql
-- Check notification data structure
SELECT id, title, data 
FROM notifications 
WHERE user_id = 'your-user-id' 
LIMIT 5;

-- Expected data format:
-- {"tripId": "uuid", "status": "confirmed", ...}
```

### Issue 3: Wrong Trip Shown
**Check:**
- TripId in notification matches actual trip
- Trip belongs to logged-in user

**Fix:**
```sql
-- Verify trip exists and belongs to user
SELECT id, status, pickup_address, user_id
FROM trips
WHERE id = 'trip-id-from-notification';
```

### Issue 4: Badge Count Wrong
**Check:**
- Multiple apps running (facility_mobile vs booking_mobile)
- RLS policies working correctly

**Fix:**
```sql
-- Count unread notifications
SELECT COUNT(*) 
FROM notifications 
WHERE user_id = 'your-user-id' 
AND app_type = 'booking' 
AND read = false;
```

---

## 🎬 Quick Video Test Script

**1 Minute Test:**
1. Open app (0:00)
2. Show notification badge (0:05)
3. Tap notification bell (0:10)
4. Show notifications list (0:15)
5. Tap a notification (0:20)
6. Show trip details screen (0:25)
7. Tap back button (0:30)
8. Show notification is now read (0:35)
9. Badge count decreased (0:40)
10. Done! ✅ (1:00)

---

## ✅ Success Criteria

### Working Correctly When:
- [x] Badge shows correct unread count
- [x] Badge taps opens Notifications screen
- [x] Notification tap marks as read
- [x] Notification tap navigates to trip
- [x] Correct trip details shown
- [x] Back button works
- [x] Badge count updates after marking read
- [x] Real-time notifications appear
- [x] Console logs show expected messages
- [x] No errors in console

---

## 🐛 Debug Mode

### Enable Extra Logging
Already added in the code! Look for these logs:

```javascript
// When notification clicked:
🔔 Notification clicked: { ... }
✅ Navigating to trip: trip-uuid

// If no tripId:
⚠️ No tripId found in notification data: { ... }

// When fetching notifications:
📥 Fetching notifications for user: user-id
✅ Fetched notifications: 5

// When new notification arrives:
🔔 New notification received: { ... }
```

---

## 📱 Expected Behavior

### From Badge Click:
```
Badge (3) → Tap → Notifications Screen → 
Tap Notification → Trip Details Screen
```

### From Notifications Screen:
```
Notifications Screen → Tap Notification → 
Mark as Read → Trip Details Screen
```

### Real-time:
```
Trip Status Changed → Trigger Fires → 
Notification Created → Real-time Event → 
Badge Updates → User Sees Notification
```

---

## 🎉 All Working When...

You can:
1. ✅ See badge with count
2. ✅ Tap badge to see notifications
3. ✅ Tap notification to see trip
4. ✅ See correct trip details
5. ✅ Notification marked as read
6. ✅ Badge count decreases
7. ✅ Can navigate back
8. ✅ New notifications appear in real-time

**If all above work → Feature is complete! 🚀**

---

## 🔧 Quick Fixes

### Reset Everything:
```sql
-- Clear all notifications
DELETE FROM notifications WHERE user_id = 'your-user-id';

-- Reset unread count
-- (Will auto-update when new notifications created)

-- Create fresh test notification
-- (Use SQL from Test 1)
```

### Force Refresh:
```javascript
// In app, pull down on Notifications screen
// OR
// Kill app and reopen
```

---

## 📞 Need Help?

**Check:**
1. Console logs (most important!)
2. Database notification structure
3. Trip exists in database
4. User is logged in
5. App type is 'booking'

**Files to Check:**
- `src/screens/NotificationsScreen.js` - Navigation logic
- `src/components/AppHeader.js` - Badge logic
- `db/notifications_setup_UNIFIED.sql` - Trigger function

---

**Happy Testing! 🎉**

The feature should work immediately - just click a notification and it takes you to the trip!
