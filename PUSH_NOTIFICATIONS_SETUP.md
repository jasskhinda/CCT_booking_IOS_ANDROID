# Push Notifications Setup for Booking Mobile App

## ✅ What's Been Implemented

### Code Implementation (Complete)
- ✅ **Notification Service** (`src/services/notifications.js`)
  - Permission requests for iOS and Android
  - Expo push token registration
  - Local notification scheduling
  - Notification history saving
  - Status-specific notification messages

- ✅ **useNotifications Hook** (`src/hooks/useNotifications.js`)
  - Automatic push notification registration on login
  - Real-time Supabase subscription for notifications
  - Notification listeners for foreground and tap events
  - Auto-reconnection on subscription errors

- ✅ **App Integration** (`App.js`)
  - Notifications enabled when user logs in
  - Integrated with auth context

- ✅ **Configuration** (`app.json`)
  - iOS remote notification background mode
  - Android notification permissions
  - Notification channel setup
  - expo-notifications plugin configured

- ✅ **Database Schema** (`db/notifications_setup.sql`)
  - `client_push_tokens` table for storing device tokens
  - `client_notifications` table for notification history
  - Automatic trip status change notifications via trigger
  - Row Level Security (RLS) policies
  - Real-time subscription enabled

## 🔧 Required Setup Steps

### Step 1: Install Required Dependencies

```bash
cd booking_mobile
npm install expo-notifications expo-device
```

### Step 2: Run Database Migration

1. Open your Supabase SQL Editor
2. Copy the contents of `db/notifications_setup.sql`
3. Execute the SQL to create tables and triggers
4. Verify tables were created:
   ```sql
   SELECT * FROM client_push_tokens;
   SELECT * FROM client_notifications;
   ```

### Step 3: Configure EAS Project (For Remote Push Notifications)

**Note:** Without EAS setup, notifications will work when app is open/background, but NOT when fully closed.

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo (create free account if needed)
eas login

# Initialize EAS project
cd booking_mobile
eas init
```

When prompted, select "Create a new project". This will generate a project ID.

### Step 4: Update app.json with EAS Project ID

After `eas init`, copy your project ID and update `app.json`:

```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "PASTE_YOUR_PROJECT_ID_HERE"
      }
    }
  }
}
```

### Step 5: Add EAS Project ID to Environment Variables

Create or update `.env`:

```bash
EXPO_PUBLIC_EAS_PROJECT_ID=your_project_id_here
```

### Step 6: Build and Test

```bash
# For development testing on physical device
eas build --profile development --platform ios
# or
eas build --profile development --platform android

# For production (App Store/Play Store submission)
eas build --profile production --platform ios
eas build --profile production --platform android
```

**Important:** Push notifications require a physical device. They do NOT work in simulators/emulators.

## 📱 How It Works

### Notification Flow

1. **User Logs In**
   - App requests notification permissions
   - If granted, gets Expo push token
   - Saves token to `client_push_tokens` table

2. **Real-Time Subscription**
   - App subscribes to `client_notifications` table
   - Listens for new rows inserted for the logged-in user

3. **Trip Status Changes**
   - When a trip status changes in the database
   - Database trigger fires: `trigger_notify_client_trip_status`
   - Notification inserted into `client_notifications` table

4. **User Receives Notification**
   - Supabase real-time broadcasts the new notification
   - App receives it and shows local notification
   - Notification appears even if app is in background

5. **Remote Push (With EAS Setup)**
   - Even if app is completely closed
   - Expo Push Service sends notification to device
   - Device wakes app and shows notification

## 🔔 Notification Types

The app sends notifications for these trip status changes:

| Status | Title | Description |
|--------|-------|-------------|
| `pending` | 🚗 Trip Booked! | Trip submitted, pending approval |
| `confirmed` | ✅ Trip Confirmed | Trip has been confirmed |
| `approved` | ✅ Trip Approved | Trip approved and scheduled |
| `assigned` | 🚗 Driver Assigned | Driver has been assigned |
| `in-progress` | 🛣️ Trip In Progress | Trip is in progress |
| `completed` | ✅ Trip Completed | Trip finished successfully |
| `cancelled` | ❌ Trip Cancelled | Trip was cancelled |
| `rejected` | ❌ Trip Request Denied | Trip request was rejected |

## 🧪 Testing Push Notifications

### Test 1: Local Notifications (Works Without EAS)

1. Install app on physical device
2. Log in with your account
3. Check console logs for:
   ```
   ✅ Notification permissions granted
   ✅ Push token saved to database
   ✅ Notification monitoring ACTIVE
   ```
4. In Supabase, manually insert a test notification:
   ```sql
   INSERT INTO client_notifications (user_id, title, body, data)
   VALUES (
     'your-user-id-here',
     'Test Notification',
     'This is a test notification',
     '{"test": true}'::jsonb
   );
   ```
5. You should see the notification appear

### Test 2: Trip Status Notifications

1. Book a trip through the app
2. In Supabase, change the trip status:
   ```sql
   UPDATE trips
   SET status = 'confirmed'
   WHERE id = 'your-trip-id';
   ```
3. Notification should appear automatically

### Test 3: Remote Push (Requires EAS Setup)

1. Complete EAS setup steps above
2. Close app completely
3. Use Expo Push Tool: https://expo.dev/notifications
4. Enter your push token (from console logs)
5. Send test notification
6. Should receive it even with app closed

## 🔍 Troubleshooting

### "Must use physical device for Push Notifications"
- This is expected - push notifications don't work in simulators
- Test on a real iPhone or Android device

### "EAS Project ID not configured"
- This means remote push won't work when app is closed
- Local notifications will still work when app is open/background
- Follow Step 3-5 above to enable remote push

### Notifications not showing
- Check notification permissions in device settings
- Verify user is logged in
- Check console logs for errors
- Verify database tables exist
- Test with manual SQL insert (Test 1 above)

### Token saved as "LOCAL_NOTIFICATIONS_ONLY"
- EAS project ID is not configured
- App can receive local notifications but not remote push
- Complete Step 3-5 to enable remote push

### Subscription errors
- Check Supabase real-time is enabled
- Verify `client_notifications` table is in publication
- Check network connection
- App will auto-reconnect after errors

## 📊 Monitoring Notifications

### Check Push Tokens
```sql
SELECT 
  user_id,
  push_token,
  platform,
  created_at
FROM client_push_tokens
ORDER BY created_at DESC;
```

### View Notification History
```sql
SELECT 
  user_id,
  title,
  body,
  read,
  created_at
FROM client_notifications
ORDER BY created_at DESC
LIMIT 50;
```

### Check Unread Notifications
```sql
SELECT 
  COUNT(*) as unread_count
FROM client_notifications
WHERE user_id = 'your-user-id' AND read = FALSE;
```

## 🚀 Next Steps (Optional Enhancements)

### 1. Add Notification Inbox Screen
Create a screen to show notification history:
```javascript
// src/screens/NotificationsScreen.js
// Fetch and display client_notifications for logged-in user
```

### 2. Add Backend API for Push
If you want to send push notifications from a backend service:
```javascript
// Similar to facility_app/app/api/notifications/send-push/route.js
// Send via Expo Push API: https://exp.host/--/api/v2/push/send
```

### 3. Add Rich Notifications
- Custom sounds
- Images/thumbnails
- Action buttons (Accept/Decline)

### 4. Add Notification Preferences
- Allow users to mute certain notification types
- Quiet hours settings

## 📚 Additional Resources

- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Expo Push Notifications Guide](https://docs.expo.dev/push-notifications/overview/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Supabase Real-time Documentation](https://supabase.com/docs/guides/realtime)

## ✅ Success Checklist

- [ ] Dependencies installed (`expo-notifications`, `expo-device`)
- [ ] Database migration run successfully
- [ ] Tables created (`client_push_tokens`, `client_notifications`)
- [ ] App tested on physical device
- [ ] Notification permissions granted
- [ ] Push token saved to database
- [ ] Test notification received (manual SQL insert)
- [ ] Trip status change notification received
- [ ] EAS project ID configured (optional, for remote push)
- [ ] Production builds created with EAS (optional)

---

**Status:** Local notifications are fully functional. Remote push when app is closed requires EAS setup (Steps 3-6).

**Support:** Check console logs for detailed debugging information. All notification events are logged with emoji prefixes for easy identification.
