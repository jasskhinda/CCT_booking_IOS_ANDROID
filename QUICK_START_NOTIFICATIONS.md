# Quick Start: Enable Push Notifications

## ⚡ 3-Minute Setup

### Step 1: Install Dependencies (1 minute)
```bash
cd /Volumes/C/CCTAPPS/booking_mobile
npm install expo-notifications expo-device
```

### Step 2: Run Database Migration (1 minute)
1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
2. Copy/paste contents of `booking_mobile/db/notifications_setup.sql`
3. Click "Run" to execute

### Step 3: Test on Physical Device (1 minute)
```bash
npx expo start
```
- Scan QR code with Expo Go app on your phone
- Or press `i` for iOS / `a` for Android
- **Must use physical device** (not simulator)

### Step 4: Verify It's Working
Check console logs for:
```
✅ Notification permissions granted
✅ Expo push token: ExponentPushToken[...]
💾 Push token saved to database
✅ Notification monitoring ACTIVE
```

### Step 5: Test Notification
In Supabase SQL Editor, run:
```sql
-- Replace 'your-user-id' with your actual user ID
INSERT INTO client_notifications (user_id, title, body, data)
VALUES (
  'your-user-id',
  '🎉 Test Notification',
  'Push notifications are working!',
  '{"test": true}'::jsonb
);
```

You should see a notification appear on your device!

## ✅ What You Get

### Notifications for:
- ✅ Trip booking confirmation
- ✅ Trip approval/rejection by dispatcher
- ✅ Driver assignment
- ✅ Trip status updates (in-progress, completed)
- ✅ Trip cancellations

### Works When:
- ✅ App is open
- ✅ App is in background
- ⚠️ App is closed (requires EAS setup below)

## 🚀 Optional: Enable Remote Push (5 minutes)

For notifications when app is completely closed:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login and initialize
eas login
eas init

# Update app.json with project ID you receive
# Then rebuild app
eas build --profile development --platform ios
```

See `PUSH_NOTIFICATIONS_SETUP.md` for full details.

## 🎯 Current Status

**What's Working Now:**
- ✅ Real-time notifications via Supabase
- ✅ Local notifications when app is open/background
- ✅ Trip status change notifications
- ✅ Notification history in database

**What Needs EAS (Optional):**
- 📱 Remote push when app is completely closed
- 📱 Notifications via Apple Push Notification Service (APNS)
- 📱 Notifications via Firebase Cloud Messaging (FCM)

## 📝 Notes

- **Physical Device Required:** Push notifications don't work in iOS Simulator or Android Emulator
- **Expo Go Limitations:** For full remote push, build standalone app with EAS
- **Local Notifications:** Work immediately without any additional setup
- **Remote Push:** Requires EAS project ID and production build

## 🐛 Troubleshooting

**No notifications appearing?**
- Check notification permissions in device settings
- Verify you're logged into the app
- Check console logs for errors
- Try manual SQL test (Step 5 above)

**"LOCAL_NOTIFICATIONS_ONLY" token?**
- This is expected without EAS setup
- App will still receive notifications when open/background
- For remote push when closed, follow "Enable Remote Push" above

**Simulator not working?**
- This is expected - use a physical device

## 📚 Next Steps

1. ✅ Complete 3-minute setup above
2. ✅ Test with manual SQL notification
3. ✅ Book a trip and test status changes
4. 📱 (Optional) Set up EAS for remote push
5. 🎨 (Optional) Add notification inbox screen

---

**Ready to test?** Follow the 3-minute setup above! Questions? Check `PUSH_NOTIFICATIONS_SETUP.md` for full documentation.
