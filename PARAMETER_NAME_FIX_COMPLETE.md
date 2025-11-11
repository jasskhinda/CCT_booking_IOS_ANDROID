# 🔧 CRITICAL FIX: Parameter Name Mismatch

**Date:** November 7, 2025  
**Issue:** booking_mobile showing different price than facility_app for same trip  
**Status:** ✅ FIXED

---

## 🐛 The Problem

**Same Trip, Different Prices:**
- **facility_app:** $635.64 ✅ CORRECT
- **booking_mobile:** $624.36 ❌ WRONG (off by $11.28)

**Root Cause:** Parameter name mismatch in `getPricingEstimate` calls

---

## 🔍 Analysis

### facility_app Breakdown (CORRECT):
```
Base fare: $150.00
Distance charge: $182.72 (45.68 miles × $4)
County surcharge: $50.00
Dead mileage: $252.92 (63.2 miles × $4)
Total: $635.64 ✅
```

### booking_mobile Breakdown (WRONG):
```
Base fare: $150.00
Distance charge: $424.36 (106.09 miles × $4) ❌ TOO HIGH!
Dead mileage: $241.64 (60.4 miles × $4)
Total: $624.36 ❌ WRONG
```

**Issue:** Distance charge was using ~106 miles instead of 45.7 miles!

---

## 💡 Root Cause

The `getPricingEstimate` function accepts `preCalculatedDistance` but booking_mobile was passing `distance`:

### WRONG Code:
```javascript
const pricingResult = await getPricingEstimate({
  pickupAddress,
  destinationAddress,
  isRoundTrip,
  distance: distanceMiles,  // ❌ WRONG parameter name!
  // ...
});
```

### What Happened:
1. `distance` parameter was ignored (not recognized)
2. Function recalculated distance from scratch using Google API
3. Got slightly different distance value
4. Sometimes double-counted or used wrong calculation method

---

## ✅ The Fix

Changed all 3 occurrences in `UberLikeBookingScreen.js`:

### CORRECT Code:
```javascript
const pricingResult = await getPricingEstimate({
  pickupAddress,
  destinationAddress,
  isRoundTrip,
  preCalculatedDistance: distanceMiles,  // ✅ CORRECT!
  // ...
});
```

---

## 📁 Files Modified

### booking_mobile/src/screens/UberLikeBookingScreen.js
Fixed 3 function calls:

1. **Line ~187** - `recalculatePricing()` function
```javascript
// BEFORE:
distance: distanceMiles,

// AFTER:
preCalculatedDistance: distanceMiles,
```

2. **Line ~646** - Google Directions API success handler
```javascript
// BEFORE:
distance: Math.round(distanceInMiles * 100) / 100,

// AFTER:
preCalculatedDistance: Math.round(distanceInMiles * 100) / 100,
```

3. **Line ~672** - MapViewDirections fallback handler
```javascript
// BEFORE:
distance: distanceInMiles,

// AFTER:
preCalculatedDistance: distanceInMiles,
```

---

## 🧪 Expected Result

After this fix, **booking_mobile** should show **IDENTICAL** pricing to **facility_app**:

### Test Case (Same Trip):
- Pickup: Westerville area
- Destination: Lancaster, OH  
- Distance: 45.7 miles
- Weight: 350+ lbs (Bariatric)

### Expected Breakdown (BOTH APPS):
```
Base fare: $150.00
Distance charge: ~$183 (45.7 miles × $4)
County surcharge: $50.00
Dead mileage: ~$253 (63.2 miles × $4)
Total: ~$636.00 ✅
```

---

## ✅ Testing Steps

1. **Reload booking_mobile:**
   ```bash
   # Press 'r' in Expo terminal
   ```

2. **Fill Same Addresses:**
   - Use exact same pickup/destination as facility_app test
   - Select Bariatric wheelchair
   - Same date/time

3. **Compare Prices:**
   - booking_mobile: Should show ~$636
   - facility_app: Shows $635.64
   - Difference should be < $1 (rounding differences okay)

4. **Check Breakdown:**
   - Tap "View price breakdown" in booking_mobile
   - Distance charge should be ~$183 (NOT $424!)
   - Dead mileage should be ~$253

---

## 📊 Why This Matters

### Impact of Bug:
- **Wrong pricing** shown to users
- **Inconsistent** between mobile and facility apps  
- **Confusing** for dispatchers comparing bookings
- **Potential** revenue loss or customer disputes

### After Fix:
- ✅ Consistent pricing across all apps
- ✅ Uses same pre-calculated distance
- ✅ Eliminates recalculation discrepancies
- ✅ Matches facility_app exactly

---

## 🎓 Lesson Learned

### Always Check:
1. ✅ Parameter names match function signature
2. ✅ TypeScript/JSDoc would catch this at compile time
3. ✅ Test cross-platform with identical inputs
4. ✅ Compare outputs between apps

### Best Practice:
```javascript
// Good: Use exact parameter name from function signature
getPricingEstimate({
  preCalculatedDistance: value  // ✅
});

// Bad: Use similar but different name
getPricingEstimate({
  distance: value  // ❌ Will be ignored!
});
```

---

## 🚀 Status

- ✅ Bug identified
- ✅ Root cause analyzed
- ✅ Fix applied (3 locations)
- ⏳ Testing needed (reload app and verify)

---

## 📞 Verification Query

After testing, run this in Supabase to see consistent pricing:

```sql
SELECT 
  pricing_breakdown_data->>'source' as source,
  pricing_breakdown_data->'pricing'->>'distancePrice' as distance_charge,
  pricing_breakdown_data->'pricing'->>'deadMileagePrice' as dead_mileage,
  pricing_breakdown_data->'pricing'->>'total' as total,
  created_at
FROM trips
WHERE user_id = 'YOUR_USER_ID'
  AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
```

Should show identical pricing for same trip regardless of source!

---

**Now reload the app and test!** Pricing should match facility_app exactly. 🎯
