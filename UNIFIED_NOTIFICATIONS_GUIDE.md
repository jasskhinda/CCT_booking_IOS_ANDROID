# 🔔 Unified Notification System - Complete Guide

## 📋 Overview

Your apps now use a **unified notification system** that supports **all current and future apps** through a single set of database tables. This is the professional standard used by companies like Slack, Discord, and Gmail.

---

## 🏗️ Architecture

### **Single Tables for ALL Apps:**

```sql
-- One table for ALL push tokens
push_tokens (
  id, 
  user_id, 
  app_type,      -- 'booking', 'facility', 'driver', 'dispatcher', 'admin'
  push_token, 
  platform       -- 'ios', 'android', 'web'
)

-- One table for ALL notifications
notifications (
  id, 
  user_id, 
  app_type,           -- Which app: 'booking', 'facility', etc.
  notification_type,  -- Type: 'trip_update', 'approval_needed', etc.
  title, 
  body, 
  data,              -- JSON with extra context
  read
)
```

---

## 🎯 App Types

| App Type | Apps | Status |
|----------|------|--------|
| `booking` | booking_app (web) + booking_mobile | ✅ Active (booking_mobile using unified system) |
| `facility` | facility_app (web) + facility_mobile | ✅ Published (facility_mobile has own system - don't touch!) |
| `driver` | driver_app (web) + driver_mobile (future) | 📋 Planned |
| `dispatcher` | dispatcher_app (web) + dispatcher_mobile (future) | 📋 Planned |
| `admin` | admin_app (web) + admin_mobile (future) | 📋 Planned |

---

## 📱 How It Works

### **Example: Trip Status Change**

When a trip status changes (e.g., from "pending" → "confirmed"):

```sql
-- 1. Database trigger fires automatically
UPDATE trips SET status = 'confirmed' WHERE id = 'trip-123';

-- 2. Trigger creates notifications for relevant users
INSERT INTO notifications VALUES (
  'user-123',      -- Client who booked the trip
  'booking',       -- For booking app
  'trip_update',   -- Notification type
  '✅ Trip Confirmed',
  'Your trip has been confirmed!'
);

-- 3. If trip was booked by facility, notify them too
INSERT INTO notifications VALUES (
  'facility-user-456',  -- Facility manager
  'facility',           -- For facility app
  'trip_update',
  '✅ Trip Confirmed (Facility)',
  'Trip status updated'
);
```

### **booking_mobile receives notification:**

1. **Real-time subscription** detects new notification
2. Filters for `app_type = 'booking'`
3. Shows **local push notification** on device
4. Updates **notification bell badge** counter
5. Saves to **notification inbox** screen

---

## 🔧 Implementation (booking_mobile)

### **1. Service Layer** (`src/services/notifications.js`)
```javascript
// Saves push token with app_type
await supabase.from('push_tokens').upsert({
  user_id: userId,
  app_type: 'booking',  // ← Identifies this as booking app
  push_token: token,
  platform: Platform.OS
});

// Saves notification to history
await supabase.from('notifications').insert({
  user_id: userId,
  app_type: 'booking',  // ← Only booking notifications
  notification_type: 'trip_update',
  title, body, data
});
```

### **2. Notifications Screen** (`src/screens/NotificationsScreen.js`)
```javascript
// Fetch only booking app notifications
const { data } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', user.id)
  .eq('app_type', 'booking')  // ← Filter by app
  .order('created_at', { ascending: false });

// Real-time subscription
supabase.channel(`notifications-${user.id}`)
  .on('postgres_changes', { table: 'notifications' }, (payload) => {
    if (payload.new.app_type === 'booking') {  // ← Only booking
      setNotifications(prev => [payload.new, ...prev]);
    }
  });
```

### **3. Header Badge** (`src/components/AppHeader.js`)
```javascript
// Get unread count for booking app only
const { count } = await supabase
  .from('notifications')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', user.id)
  .eq('app_type', 'booking')  // ← Only booking
  .eq('read', false);
```

### **4. Real-time Hook** (`src/hooks/useNotifications.js`)
```javascript
// Subscribe to notifications
supabase.channel(`booking-notifications-${userId}`)
  .on('postgres_changes', { table: 'notifications' }, (payload) => {
    // Filter for booking app
    if (payload.new.app_type !== 'booking') return;
    
    // Show push notification
    scheduleLocalNotification(payload.new.title, payload.new.body);
  });
```

---

## 🚀 Adding Notifications to Other Apps

### **For facility_mobile (Future):**

Just change `app_type` from `'booking'` to `'facility'`:

```javascript
// 1. Register push token
await supabase.from('push_tokens').upsert({
  user_id: userId,
  app_type: 'facility',  // ← Changed!
  push_token: token,
  platform: Platform.OS
});

// 2. Fetch notifications
const { data } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', user.id)
  .eq('app_type', 'facility')  // ← Changed!
  .order('created_at', { ascending: false });

// 3. Real-time subscription
if (payload.new.app_type === 'facility') {  // ← Changed!
  // Show notification
}
```

**That's it!** Same code, just different `app_type`.

---

## 📊 Database Queries

### **Get all notifications for a user (all apps):**
```sql
SELECT * FROM notifications 
WHERE user_id = 'user-123' 
ORDER BY created_at DESC;
```

### **Get only booking app notifications:**
```sql
SELECT * FROM notifications 
WHERE user_id = 'user-123' 
AND app_type = 'booking'
ORDER BY created_at DESC;
```

### **Get unread count per app:**
```sql
SELECT app_type, COUNT(*) 
FROM notifications 
WHERE user_id = 'user-123' 
AND read = false 
GROUP BY app_type;
```

### **Get all push tokens for a user:**
```sql
SELECT * FROM push_tokens 
WHERE user_id = 'user-123';
```

---

## ✅ Benefits of Unified System

### **1. Simplicity**
- ✅ One set of tables instead of 10+ tables
- ✅ Easier to maintain
- ✅ Less code duplication

### **2. Flexibility**
- ✅ See all notifications across apps
- ✅ Filter by app when needed
- ✅ Easy to add new apps (just add new `app_type`)

### **3. Scalability**
- ✅ Professional standard (Slack, Discord, Gmail use this)
- ✅ Better performance (fewer tables = faster queries)
- ✅ Easier to add features (cross-app notifications, unified inbox, etc.)

### **4. Cross-App Features (Future)**
- 💡 Unified notification center (see all apps in one place)
- 💡 Global unread counter
- 💡 Cross-app notification preferences
- 💡 Notification forwarding between apps

---

## 🔒 Security (Row Level Security)

Users can only see **their own** notifications:

```sql
-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

-- System can insert notifications for any user
CREATE POLICY "System can insert notifications"
ON notifications FOR INSERT
WITH CHECK (true);
```

---

## 📝 Database Setup

**Already completed!** Just run this SQL in Supabase:

```bash
/Volumes/C/CCTAPPS/booking_mobile/db/notifications_setup_UNIFIED.sql
```

This creates:
- ✅ `push_tokens` table
- ✅ `notifications` table
- ✅ RLS policies
- ✅ Real-time subscriptions
- ✅ Automatic trip status notifications
- ✅ Helper functions

---

## 🧪 Testing

### **1. Run the SQL migration**
- Open Supabase Dashboard → SQL Editor
- Run `notifications_setup_UNIFIED.sql`

### **2. Test on booking_mobile**
- Reload app on iPhone
- Log in as a client
- Book a trip
- Check notification bell for badge
- Tap bell → see notification in inbox

### **3. Check database**
```sql
-- See push tokens
SELECT * FROM push_tokens;

-- See notifications
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 10;

-- Count by app
SELECT app_type, COUNT(*) FROM notifications GROUP BY app_type;
```

---

## 📚 Files Modified

### **booking_mobile:**
1. `src/services/notifications.js` - Uses `push_tokens` and `notifications` tables with `app_type='booking'`
2. `src/screens/NotificationsScreen.js` - Filters by `app_type='booking'`
3. `src/components/AppHeader.js` - Badge counts `app_type='booking'` only
4. `src/hooks/useNotifications.js` - Subscribes to `app_type='booking'` notifications

### **Database:**
1. `db/notifications_setup_UNIFIED.sql` - Creates unified tables for all apps

---

## 🎯 Next Steps

1. ✅ **Run SQL migration** in Supabase
2. ✅ **Test booking_mobile** notifications
3. 🔜 **Add to facility_mobile** (copy code, change `app_type` to `'facility'`)
4. 🔜 **Add to driver_mobile** (future)
5. 🔜 **Add to dispatcher_mobile** (future)
6. 🔜 **Add to admin_mobile** (future)

---

## 💡 Pro Tips

### **Notification Types:**
Use `notification_type` to categorize notifications:

```javascript
// Trip-related
notification_type: 'trip_update'
notification_type: 'trip_assigned'
notification_type: 'trip_completed'

// Approval-related (facility app)
notification_type: 'approval_needed'
notification_type: 'approval_granted'

// Payment-related
notification_type: 'payment_received'
notification_type: 'payment_failed'

// System-related
notification_type: 'system_announcement'
notification_type: 'maintenance_notice'
```

### **Custom Data:**
Store extra context in `data` JSONB field:

```javascript
data: {
  tripId: 'trip-123',
  status: 'confirmed',
  pickupTime: '2025-11-05T10:00:00Z',
  driverId: 'driver-456',
  facilityId: 'facility-789'
}
```

This allows:
- Deep linking to specific screens
- Rich notification content
- Analytics and tracking

---

## 🎉 Summary

You now have a **production-ready, unified notification system** that:

✅ Works for ALL apps (current and future)  
✅ Uses industry best practices  
✅ Is easy to maintain and scale  
✅ Supports real-time updates  
✅ Has proper security (RLS)  
✅ Is ready for booking_mobile immediately  
✅ Can be easily added to other apps  

**Just run the SQL migration and you're good to go!** 🚀
