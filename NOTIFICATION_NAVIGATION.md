# Notification Navigation - booking_mobile

## 🎯 Feature: Click Notification → Navigate to Trip

### Overview
When a user clicks on a notification badge or individual notification, they are taken directly to the related trip details page.

---

## 📱 How It Works

### 1. Notification Badge in Header
**File:** `src/components/AppHeader.js`

- Badge shows unread notification count
- Clicking badge navigates to Notifications screen
- User can then click individual notifications to view trip details

```javascript
<TouchableOpacity onPress={handleNotificationPress}>
  <Ionicons name="notifications-outline" />
  {unreadCount > 0 && (
    <View style={styles.badge}>
      <Text>{unreadCount}</Text>
    </View>
  )}
</TouchableOpacity>
```

### 2. Notification List Item Click
**File:** `src/screens/NotificationsScreen.js`

When user clicks a notification:
1. **Mark as read** - Updates notification read status
2. **Extract tripId** - Gets tripId from notification data
3. **Navigate** - Goes to TripDetails screen with tripId

```javascript
onPress={() => {
  // Mark as read
  if (!item.read) {
    markAsRead(item.id);
  }
  
  // Navigate to trip if tripId exists
  if (item.data?.tripId) {
    navigation.navigate('TripDetails', { tripId: item.data.tripId });
  }
}}
```

---

## 🗄️ Database Structure

### Notification Data Field (JSONB)
The `data` field stores trip-related information:

```json
{
  "tripId": "uuid-of-trip",
  "status": "confirmed",
  "pickupTime": "2024-01-15T10:00:00Z",
  "pickupAddress": "123 Main St"
}
```

### Trigger Function
**File:** `db/notifications_setup_UNIFIED.sql`

The trigger automatically creates notifications with tripId:

```sql
INSERT INTO notifications (user_id, app_type, notification_type, title, body, data)
VALUES (
  NEW.user_id,
  'booking',
  'trip_update',
  notification_title,
  notification_body,
  jsonb_build_object(
    'tripId', NEW.id,           -- ← Trip UUID stored here
    'status', NEW.status,
    'pickupTime', NEW.pickup_time,
    'pickupAddress', NEW.pickup_address
  )
);
```

---

## 🔄 User Flow

### Flow 1: From Badge Click
```
1. User sees badge on notification bell icon
2. User taps notification bell
3. App navigates to Notifications screen
4. User sees list of notifications
5. User taps a notification
6. Notification marked as read
7. App extracts tripId from notification.data
8. App navigates to TripDetails screen
9. User sees full trip information
```

### Flow 2: From Notification Screen
```
1. User is already on Notifications screen
2. User taps a notification
3. Notification marked as read
4. App extracts tripId from notification.data
5. App navigates to TripDetails screen
6. User sees full trip information
```

---

## 🧪 Testing

### Test 1: Badge Navigation
1. Create a new trip (status change should trigger notification)
2. Check badge count increases on notification bell
3. Tap notification bell
4. Verify Notifications screen opens
5. Tap the new notification
6. Verify TripDetails screen opens with correct trip

### Test 2: Direct Notification Click
1. Open Notifications screen
2. Find any unread notification
3. Tap the notification
4. Verify:
   - Notification marked as read (blue dot disappears)
   - TripDetails screen opens
   - Correct trip information displayed

### Test 3: No Trip ID
1. Create a notification without tripId (manual test)
2. Tap notification
3. Verify: Notification marked as read but no navigation occurs
4. Check console for warning message

---

## 🐛 Debugging

### Check Console Logs
When clicking a notification, you should see:

```
🔔 Notification clicked: {
  id: "notification-uuid",
  title: "Trip Confirmed",
  tripId: "trip-uuid",
  data: { tripId: "...", status: "confirmed", ... }
}
✅ Navigating to trip: trip-uuid
```

### If Navigation Doesn't Work

**Issue 1: No tripId in data**
```
⚠️ No tripId found in notification data: { ... }
```
**Solution:** Check database trigger is storing tripId correctly

**Issue 2: Navigation error**
```
Error: Cannot navigate to TripDetails
```
**Solution:** Verify TripDetails screen is registered in navigation

**Issue 3: Wrong trip shown**
```
Showing different trip than expected
```
**Solution:** Verify tripId matches between notification and database

---

## 📊 Notification Data Structure

### Complete Notification Object
```javascript
{
  id: "uuid",
  user_id: "user-uuid",
  app_type: "booking",
  notification_type: "trip_update",
  title: "✅ Trip Confirmed",
  body: "Your trip has been confirmed and scheduled!",
  data: {
    tripId: "trip-uuid",         // ← Used for navigation
    status: "confirmed",
    pickupTime: "2024-01-15T10:00:00Z",
    pickupAddress: "123 Main St"
  },
  read: false,
  read_at: null,
  created_at: "2024-01-15T09:00:00Z"
}
```

---

## 🔐 Security

### Row Level Security (RLS)
- Users can only see their own notifications
- Users can only mark their own notifications as read
- Users can only delete their own notifications

### Navigation Validation
- TripDetails screen validates trip belongs to user
- If trip doesn't exist or doesn't belong to user, error shown
- No unauthorized access to trip data

---

## 🎨 UI/UX Features

### Visual Indicators
1. **Unread Badge** - Red dot on notification icon
2. **Unread Count** - Number badge on bell icon
3. **Unread Highlight** - Notifications with blue background
4. **Status Icons** - Different icons for different trip statuses
5. **Time Stamps** - "5m ago", "2h ago", "1d ago"

### User Experience
- **Tap to navigate** - Single tap opens trip details
- **Mark as read** - Automatic when notification clicked
- **Delete option** - Swipe or trash icon
- **Mark all read** - Batch action from header
- **Real-time updates** - New notifications appear instantly

---

## 🔗 Related Files

### Core Files:
- `src/components/AppHeader.js` - Badge with unread count
- `src/screens/NotificationsScreen.js` - Notification list and navigation
- `src/screens/TripDetailsScreen.js` - Destination screen
- `src/navigation/AppNavigator.js` - Navigation configuration

### Database Files:
- `db/notifications_setup_UNIFIED.sql` - Tables and trigger
- `supabase/migrations/` - Migration files

### Service Files:
- `src/services/notifications.js` - Notification helpers
- `src/hooks/useNotifications.js` - Real-time subscription

---

## ✅ Implementation Checklist

- [x] Badge shows unread count
- [x] Badge navigates to Notifications screen
- [x] Notification click marks as read
- [x] Notification click navigates to trip
- [x] TripId stored in notification data
- [x] Navigation validated and tested
- [x] Console logging for debugging
- [x] Error handling for missing tripId
- [x] RLS policies for security
- [x] Real-time updates working

---

## 🚀 Future Enhancements

### Potential Improvements:
1. **Deep linking** - Open app directly to trip from push notification
2. **Notification grouping** - Group multiple trip updates
3. **Rich notifications** - Show trip details in notification
4. **Action buttons** - "View Trip", "Cancel Trip" in notification
5. **Notification preferences** - Choose which notifications to receive
6. **Notification sounds** - Custom sounds for different status types
7. **Vibration patterns** - Different patterns for urgency levels

---

## 📞 Support

### Common Questions

**Q: Why doesn't my notification navigate to the trip?**
A: Check that the notification has `data.tripId` in the database.

**Q: How do I test notifications?**
A: Change a trip status in the web app or use SQL to trigger notification.

**Q: Can I customize notification messages?**
A: Yes, edit the trigger function in `notifications_setup_UNIFIED.sql`.

**Q: Why do I see duplicate notifications?**
A: Check for multiple subscriptions or trigger firing twice.

---

## 🎉 Summary

The notification navigation system provides seamless user experience:
- ✅ Click badge → View all notifications
- ✅ Click notification → View trip details
- ✅ Auto mark as read when clicked
- ✅ Real-time updates
- ✅ Secure and validated
- ✅ Works with unified notification system

Users can quickly jump from notification to trip details with a single tap! 🚀
