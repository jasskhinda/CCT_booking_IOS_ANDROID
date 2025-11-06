# 🔔 Notification & Cost Breakdown Fixes

**Date:** November 5, 2025  
**Issues Found:**  
1. No push notifications when booking trips (badge not showing)
2. Cost breakdown not displaying on Trip Details page

---

## ✅ ISSUE #1: No Push Notifications on Trip Booking

### **Problem**
When you book a trip in booking_mobile, you should receive:
- A native iOS/Android push notification
- A badge on the notification bell icon
- Entry in the Notifications screen

But nothing happens because the database trigger was configured wrong.

### **Root Cause**
The notification trigger in Supabase was set to fire only on `UPDATE` events:
```sql
CREATE TRIGGER trigger_notify_trip_status
AFTER UPDATE ON trips  -- ❌ Only fires when status changes
FOR EACH ROW
EXECUTE FUNCTION notify_trip_status_change();
```

This means notifications were only sent when trip **status** changed (pending → approved), not when trips were **first created**.

### **Solution**
Updated the trigger to fire on **both** INSERT and UPDATE:
```sql
CREATE TRIGGER trigger_notify_trip_status
AFTER INSERT OR UPDATE ON trips  -- ✅ Fires on creation AND status change
FOR EACH ROW
EXECUTE FUNCTION notify_trip_status_change();
```

Also updated the notification function to handle INSERT events:
```sql
IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status)) THEN
  -- Send notification...
END IF;
```

### **To Apply the Fix:**
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Run the file: `/Volumes/C/CCTAPPS/booking_mobile/db/fix_notification_trigger.sql`
4. Verify with test query at bottom of file

---

## ✅ ISSUE #2: Cost Breakdown Not Showing

### **Problem**
Trip Details page shows "Cost Breakdown" section but only displays:
- Distance: 0.0 miles
- Total Price: $664.37

Missing:
- Base fare breakdown
- Distance charges
- Surcharges (weekend, after-hours, etc.)
- Wheelchair fees
- Veteran discounts

### **Root Cause**
The trip record has `pricing_breakdown_data = null` because the BookingScreen doesn't save the pricing breakdown when creating the trip.

### **Solution Applied**
Updated TripDetailsScreen.js to display detailed cost breakdown from `pricing_breakdown_data`:
- Base fare (with number of legs)
- Distance charge
- Dead mileage
- County surcharge
- Multi-county fee
- Weekend/After-hours surcharge
- Holiday surcharge
- Emergency fee
- Wheelchair accessible fee
- Veteran discount (if applicable)
- Total Price (highlighted)

### **Code Changes:**
File: `src/screens/TripDetailsScreen.js`

Added conditional rendering for all pricing components:
```javascript
{trip.pricing_breakdown_data?.basePrice > 0 && (
  <View style={styles.priceRow}>
    <Text style={styles.priceLabel}>Base fare:</Text>
    <Text style={styles.priceValue}>${trip.pricing_breakdown_data.basePrice.toFixed(2)}</Text>
  </View>
)}
```

---

## 🔄 STILL TO DO: Save Pricing Breakdown on Booking

The cost breakdown won't show for **new trips** until we update BookingScreen.js to save `pricing_breakdown_data` when creating trips.

### **Next Steps:**
1. Update `BookingScreen.js` to save pricing breakdown in trip insert
2. Include all pricing components in the JSONB data
3. Add `pricing_breakdown_locked_at` timestamp

Example:
```javascript
const { data, error } = await supabase
  .from('trips')
  .insert([{
    // ...existing fields...
    pricing_breakdown_data: {
      basePrice: 100,
      distancePrice: 45.60,
      weekendAfterHoursSurcharge: 40,
      total: 185.60,
      // ...other breakdown fields...
    },
    pricing_breakdown_total: 185.60,
    pricing_breakdown_locked_at: new Date().toISOString()
  }])
  .select();
```

---

## 🧪 Testing Steps

### **Test Notification Fix:**
1. Apply the SQL fix in Supabase
2. Book a new trip in booking_mobile
3. **Expected Result:**
   - Push notification appears immediately
   - Badge shows "1" on notification bell
   - Notification appears in Notifications screen
   - Clicking notification navigates to trip details

### **Test Cost Breakdown Display:**
1. View an existing trip with pricing_breakdown_data
2. **Expected Result:**
   - Detailed cost breakdown visible
   - All applicable charges shown
   - Total price highlighted
   - Discounts shown in green

### **Test Missing Data Fallback:**
1. View a trip without pricing_breakdown_data
2. **Expected Result:**
   - Only Distance and Total Price shown
   - No errors or blank sections
   - Graceful degradation

---

## 📱 User Experience Impact

### **Before Fix:**
- ❌ Book trip → No notification
- ❌ No badge update
- ❌ Manually check Trips page to see if booking worked
- ❌ Cost breakdown missing

### **After Fix:**
- ✅ Book trip → Instant push notification
- ✅ Badge shows unread count
- ✅ Tap notification → Go directly to trip
- ✅ See detailed cost breakdown (for trips that save it)

---

## 🚀 Deployment Checklist

- [x] Update notification trigger SQL
- [x] Update TripDetailsScreen.js with cost breakdown display
- [ ] Apply SQL fix in Supabase Dashboard
- [ ] Update BookingScreen.js to save pricing breakdown
- [ ] Test on physical device
- [ ] Verify push notifications working
- [ ] Verify cost breakdown displaying

---

## 📝 Notes

### **Why Trigger vs. Application Code?**
Using database triggers ensures notifications are sent **regardless** of which app creates the trip:
- booking_mobile ✅
- booking_app (web) ✅
- facility_mobile ✅
- facility_app (web) ✅
- dispatcher_app (admin) ✅

### **Notification Badge Update**
The AppHeader component already subscribes to notifications table:
```javascript
useEffect(() => {
  const subscription = supabase
    .channel(`header-notifications-${user.id}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${user.id}`,
    }, () => {
      fetchUnreadCount();
    })
    .subscribe();
}, [user?.id]);
```

So as soon as the trigger inserts a notification, the badge will update automatically via real-time subscription! 🎉

---

## 🎯 Summary

**Two Issues - Two Fixes:**
1. **Notifications:** Database trigger fix (requires SQL execution in Supabase)
2. **Cost Breakdown:** Code fix already applied (showing breakdown when data exists)

**Priority:** Apply the SQL fix first - that's blocking all new trip notifications!
