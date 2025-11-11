# Database Schema Compatibility Fix - CRITICAL ⚠️

**Date:** November 7, 2025  
**Status:** IN PROGRESS  
**Issue:** UberLikeBookingScreen using facility_app columns that don't exist in booking_app database

---

## Problem Discovered

The `UberLikeBookingScreen.js` was copied from `facility_mobile` but is trying to insert **facility-specific columns** that don't exist in the `booking_app` database schema.

### Columns Being Used (FROM FACILITY_APP):
```javascript
{
  facility_id: null,           // ❌ DOESN'T EXIST in booking_app
  managed_client_id: null,     // ❌ DOESN'T EXIST in booking_app
  booked_by: user.id,          // ❌ DOESN'T EXIST in booking_app
  bill_to: 'user',             // ❌ DOESN'T EXIST in booking_app
  pricing_breakdown_data: {...}, // ❌ DOESN'T EXIST in booking_app
  pricing_breakdown_total: ...,  // ❌ DOESN'T EXIST in booking_app
  pricing_breakdown_locked_at: ..., // ❌ DOESN'T EXIST in booking_app
  pickup_details: ...,         // ❌ DOESN'T EXIST in booking_app
  destination_details: ...,    // ❌ DOESN'T EXIST in booking_app
  additional_passengers: ...,  // ❌ DOESN'T EXIST in booking_app
  trip_notes: ...,             // ❌ DOESN'T EXIST in booking_app
  route_duration: ...,         // ❌ DOESN'T EXIST in booking_app
  route_distance_text: ...,    // ❌ DOESN'T EXIST in booking_app
  route_duration_text: ...     // ❌ DOESN'T EXIST in booking_app
}
```

### Actual booking_app Trips Table Schema:
```sql
CREATE TABLE trips (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,                    // ✅ EXISTS
  pickup_address TEXT NOT NULL,             // ✅ EXISTS
  destination_address TEXT NOT NULL,        // ✅ EXISTS
  pickup_time TIMESTAMPTZ NOT NULL,         // ✅ EXISTS
  return_pickup_time TIMESTAMPTZ,           // ✅ EXISTS  
  status TEXT NOT NULL,                     // ✅ EXISTS
  driver_name TEXT,                         // ✅ EXISTS
  vehicle TEXT,                             // ✅ EXISTS
  price DECIMAL(10,2),                      // ✅ EXISTS
  rating INTEGER,                           // ✅ EXISTS
  feedback TEXT,                            // ✅ EXISTS
  cancellation_reason TEXT,                 // ✅ EXISTS
  refund_status TEXT,                       // ✅ EXISTS
  special_requirements TEXT,                // ✅ EXISTS
  wheelchair_type TEXT,                     // ✅ EXISTS
  is_round_trip BOOLEAN DEFAULT FALSE,      // ✅ EXISTS
  distance DECIMAL(10,1),                   // ✅ EXISTS
  payment_method_id TEXT,                   // ✅ EXISTS
  created_at TIMESTAMPTZ DEFAULT NOW(),     // ✅ EXISTS
  updated_at TIMESTAMPTZ DEFAULT NOW()      // ✅ EXISTS
);
```

---

## Impact

**Current State:**
- ❌ Trip submissions will **FAIL** with "column does not exist" errors
- ❌ Database will reject inserts with unknown columns
- ❌ Users cannot book trips
- ❌ App appears broken

**After Fix:**
- ✅ Trips submit successfully to correct database schema
- ✅ Only valid columns are inserted
- ✅ No conflicts with facility_app database
- ✅ Users can book trips normally

---

## Solution

### Option 1: Minimal Schema (Recommended)
Use **only the columns that exist** in booking_app schema:
```javascript
{
  user_id,
  pickup_address,
  destination_address,
  pickup_time,
  return_pickup_time,      // For round trips
  status,
  price,
  wheelchair_type,
  is_round_trip,
  distance,
  payment_method_id,       // Important for Stripe
  special_requirements     // Can store trip_notes here
}
```

### Option 2: Add Missing Columns (Not Recommended)
Run migrations to add facility columns to booking_app database - **NOT RECOMMENDED** because:
- Adds unnecessary complexity
- booking_app is for individual users, not facilities
- Violates separation of concerns
- Makes schema harder to maintain

---

## Files That Need Fixing

1. **`/Volumes/C/CCTAPPS/booking_mobile/src/screens/UberLikeBookingScreen.js`**
   - Line 422-476: Trip submission data structure
   - Remove all facility-specific columns
   - Map data to correct booking_app schema

---

## Next Steps

1. ✅ Document the issue (this file)
2. ⏳ Fix UberLikeBookingScreen trip submission
3. ⏳ Test trip booking end-to-end
4. ⏳ Verify database inserts correctly
5. ⏳ Update any trip retrieval code if needed

---

## Critical Columns Mapping

| Data Point | Facility Column | Booking Column | Action |
|-----------|----------------|----------------|---------|
| Trip notes | `trip_notes` | `special_requirements` | Map to special_requirements |
| Pickup details | `pickup_details` | N/A | Combine with pickup_address |
| Destination details | `destination_details` | N/A | Combine with destination_address |
| Additional passengers | `additional_passengers` | `special_requirements` | Add to special_requirements text |
| Route info | `route_duration`, `route_distance_text` | N/A | Not stored (calculated on-demand) |
| Billing info | `bill_to`, `facility_id` | N/A | Not needed (always user pays) |
| Pricing breakdown | `pricing_breakdown_data` | N/A | Not stored (can be recalculated) |
| Booked by | `booked_by` | N/A | Same as user_id for individuals |
| Managed client | `managed_client_id` | N/A | Not needed (user books for self) |

---

## Status

**CRITICAL:** This must be fixed before ANY trip booking can work in booking_mobile app!

