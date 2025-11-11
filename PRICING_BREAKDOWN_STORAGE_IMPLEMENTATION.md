# Pricing Breakdown Storage Implementation

## Overview
Added pricing breakdown storage to `booking_mobile` to match `facility_mobile` functionality. This ensures pricing details are preserved from booking time and can be displayed in trip details and edit screens.

## Database Changes

### New Columns Added to `trips` Table
```sql
pricing_breakdown_data JSONB        -- Complete pricing breakdown with all details
pricing_breakdown_total DECIMAL     -- Quick access to total amount
pricing_breakdown_locked_at TIMESTAMP -- When pricing was calculated/locked
```

### Migration File
**Location:** `/Volumes/C/CCTAPPS/booking_app/db/add_pricing_breakdown_columns.sql`

**To Apply:**
1. Open Supabase SQL Editor for booking_app database
2. Run the migration SQL file
3. Verify columns were added successfully

## Code Changes

### 1. UberLikeBookingScreen.js - Save Pricing Breakdown
**Location:** `/Volumes/C/CCTAPPS/booking_mobile/src/screens/UberLikeBookingScreen.js`

**What's Saved:**
```javascript
pricing_breakdown_data: {
  pricing: {
    basePrice: 150.00,
    distancePrice: 298.80,
    countyPrice: 0,
    deadMileagePrice: 0,
    wheelchairPrice: 0,
    weekendAfterHoursSurcharge: 0,
    emergencyFee: 0,
    holidaySurcharge: 0,
    total: 448.80,
    isBariatric: true,
    baseRatePerLeg: 150
  },
  distance: { distance: 45.7, unit: 'miles' },
  summary: {
    isRoundTrip: false,
    isEmergency: false,
    wheelchairType: 'bariatric',
    additionalPassengers: 0
  },
  wheelchairInfo: {
    type: 'bariatric',
    requirements: null,
    details: null
  },
  clientInfo: {
    weight: 450
  },
  addressDetails: {
    pickupDetails: 'Suite 100',
    destinationDetails: 'Building A'
  },
  createdAt: '2025-01-07T...',
  source: 'BookingMobileApp'
}
```

## Benefits

### ✅ Pricing Consistency
- Pricing is locked at booking time
- Shows exact same breakdown in trip details/edit
- No recalculation needed (which could differ due to time/conditions)

### ✅ Audit Trail
- `pricing_breakdown_locked_at` timestamp shows when pricing was calculated
- Can track pricing changes over time
- Helps with billing disputes

### ✅ Rich Context
- Stores all input parameters (weight, wheelchair type, etc.)
- Preserves address details (suite numbers, building info)
- Records source app for debugging

### ✅ Edit Capability
- When editing trip, can pre-fill form with original values
- Can recalculate pricing or keep locked pricing
- User sees what pricing was based on

## Usage in Other Screens

### Trip Details Screen
Display saved pricing breakdown:
```javascript
{trip.pricing_breakdown_data?.pricing && (
  <View>
    <Text>Base fare: ${trip.pricing_breakdown_data.pricing.basePrice}</Text>
    <Text>Distance: ${trip.pricing_breakdown_data.pricing.distancePrice}</Text>
    <Text>Total: ${trip.pricing_breakdown_data.pricing.total}</Text>
  </View>
)}
```

### Edit Trip Screen
Pre-fill form from saved data:
```javascript
// Load saved wheelchair info
if (trip.pricing_breakdown_data?.wheelchairInfo) {
  setWheelchairType(trip.pricing_breakdown_data.wheelchairInfo.type);
  setWheelchairRequirements(trip.pricing_breakdown_data.wheelchairInfo.requirements);
}

// Load saved client info
if (trip.pricing_breakdown_data?.clientInfo?.weight) {
  setClientWeight(trip.pricing_breakdown_data.clientInfo.weight.toString());
}
```

## Testing Checklist

- [ ] Run migration SQL in Supabase
- [ ] Book a new trip in booking_mobile
- [ ] Verify `pricing_breakdown_data` is saved
- [ ] Check trip details show correct breakdown
- [ ] Test editing trip preserves pricing
- [ ] Verify round trip pricing is saved correctly
- [ ] Test with different wheelchair types
- [ ] Verify bariatric pricing is preserved

## Next Steps

1. **Apply Database Migration** - Run SQL in Supabase
2. **Test Booking Flow** - Book trip and verify data saved
3. **Create TripDetailScreen** - Display saved breakdown
4. **Create EditTripModal** - Allow editing with preserved pricing
5. **Sync with dispatcher_app** - Ensure dispatcher sees same breakdown

## Compatibility

### Shared `trips` Table Strategy
- **Individual Bookings:** `user_id` set, `facility_id` NULL, `pricing_breakdown_data` includes source: 'BookingMobileApp'
- **Facility Bookings:** `facility_id` set, `user_id` NULL, `pricing_breakdown_data` includes source: 'FacilityMobileApp'
- Both can coexist in same table with their own pricing breakdowns
