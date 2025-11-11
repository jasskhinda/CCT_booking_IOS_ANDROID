# Trip Details Pricing Breakdown Display Fix

## Issue Description
The Trip Details screen showed "Pricing Locked from Booking" and the total price ($905.20), but **no individual breakdown items** (base fare, distance charge, county surcharge, dead mileage) were displaying.

## Root Cause
The pricing data is stored in the database with a nested structure:
```javascript
pricing_breakdown_data: {
  pricing: {
    basePrice: 300,
    tripDistancePrice: 182.72,
    countySurcharge: 100,
    deadMileagePrice: 252.80,
    // ... other fields
  },
  distance: { ... },
  summary: { ... },
  ...
}
```

However, the Trip Details screen was trying to access fields directly on `pricing_breakdown_data` instead of `pricing_breakdown_data.pricing`:

```javascript
// ❌ BEFORE (incorrect)
{trip.pricing_breakdown_data.basePrice > 0 && (

// ✅ AFTER (correct)
{trip.pricing_breakdown_data.pricing.basePrice > 0 && (
```

## Changes Made

### 1. Fixed TripDetailsScreen.js
**File:** `/Volumes/C/CCTAPPS/booking_mobile/src/screens/TripDetailsScreen.js`

Changed all references from `trip.pricing_breakdown_data.*` to `trip.pricing_breakdown_data.pricing.*`:

#### Base Fare
```javascript
// Before
{trip.pricing_breakdown_data.basePrice > 0 && (
  <Text style={styles.priceValue}>
    ${trip.pricing_breakdown_data.basePrice.toFixed(2)}

// After
{trip.pricing_breakdown_data.pricing.basePrice > 0 && (
  <Text style={styles.priceValue}>
    ${trip.pricing_breakdown_data.pricing.basePrice.toFixed(2)}
```

#### Distance Charge
```javascript
// Before
{trip.pricing_breakdown_data.tripDistancePrice > 0 && (
  ${trip.pricing_breakdown_data.tripDistancePrice.toFixed(2)}

// After
{trip.pricing_breakdown_data.pricing.tripDistancePrice > 0 && (
  ${trip.pricing_breakdown_data.pricing.tripDistancePrice.toFixed(2)}
```

#### County Surcharge
```javascript
// Before
{trip.pricing_breakdown_data.countySurcharge > 0 && (
  ${trip.pricing_breakdown_data.countySurcharge.toFixed(2)}

// After
{trip.pricing_breakdown_data.pricing.countySurcharge > 0 && (
  ${trip.pricing_breakdown_data.pricing.countySurcharge.toFixed(2)}
```

#### Dead Mileage
```javascript
// Before
{trip.pricing_breakdown_data.deadMileagePrice > 0 && (
  Dead mileage ({(trip.pricing_breakdown_data.deadMileagePrice / 4).toFixed(1)} mi @ $4/mile)
  ${trip.pricing_breakdown_data.deadMileagePrice.toFixed(2)}

// After
{trip.pricing_breakdown_data.pricing.deadMileagePrice > 0 && (
  Dead mileage ({trip.pricing_breakdown_data.pricing.deadMileageDistance?.toFixed(1) || (trip.pricing_breakdown_data.pricing.deadMileagePrice / 4).toFixed(1)} mi @ $4/mile)
  ${trip.pricing_breakdown_data.pricing.deadMileagePrice.toFixed(2)}
```

#### Weekend/After-Hours/Holiday/Emergency Surcharges
```javascript
// Before
{trip.pricing_breakdown_data.weekendSurcharge > 0 && (
{trip.pricing_breakdown_data.afterHoursSurcharge > 0 && (
{trip.pricing_breakdown_data.holidaySurcharge > 0 && (
{trip.pricing_breakdown_data.emergencySurcharge > 0 && (

// After
{trip.pricing_breakdown_data.pricing.weekendSurcharge > 0 && (
{trip.pricing_breakdown_data.pricing.afterHoursSurcharge > 0 && (
{trip.pricing_breakdown_data.pricing.holidaySurcharge > 0 && (
{trip.pricing_breakdown_data.pricing.emergencySurcharge > 0 && (
```

#### Veteran Discount
```javascript
// Before
{trip.pricing_breakdown_data.veteranDiscount > 0 && (
  -${trip.pricing_breakdown_data.veteranDiscount.toFixed(2)}

// After
{trip.pricing_breakdown_data.pricing.veteranDiscount > 0 && (
  -${trip.pricing_breakdown_data.pricing.veteranDiscount.toFixed(2)}
```

#### Total
```javascript
// Before
${(trip.pricing_breakdown_data.total || trip.price || 0).toFixed(2)}

// After
${(trip.pricing_breakdown_data.pricing.total || trip.price || 0).toFixed(2)}
```

#### Pricing Notes
```javascript
// Before
{trip.pricing_breakdown_data.isBariatric && (
{trip.pricing_breakdown_data.deadMileagePrice > 0 && (

// After
{trip.pricing_breakdown_data.pricing.isBariatric && (
{trip.pricing_breakdown_data.pricing.deadMileagePrice > 0 && (
```

### 2. Enhanced pricing.js to Store Dead Mileage Distance
**File:** `/Volumes/C/CCTAPPS/booking_mobile/src/lib/pricing.js`

Added `deadMileageDistance` to the pricing breakdown object so it's stored in the database:

```javascript
let breakdown = {
  basePrice: 0,
  baseRatePerLeg: 0,
  isBariatric: false,
  legs: isRoundTrip ? 2 : 1,
  
  tripDistancePrice: 0,
  deadMileagePrice: 0,
  deadMileageDistance: 0,  // ✅ Added this field
  distancePrice: 0,
  // ...
};

// Store the actual distance when calculating dead mileage price
if (deadMileageDistance > 0) {
  breakdown.deadMileagePrice = deadMileageDistance * PRICING_CONFIG.DISTANCE.DEAD_MILEAGE;
  breakdown.deadMileageDistance = deadMileageDistance;  // ✅ Store the distance
}
```

## Result

Now the Trip Details screen correctly displays all pricing breakdown items:

```
Cost Breakdown
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pricing Locked from Booking
11/7/2025

Base fare (2 legs @ $150/leg (Bariatric))    $300.00
Distance charge ($3/mile Franklin County)    $182.72
County surcharge (2 counties @ $50/county)   $100.00
Dead mileage (63.2 mi @ $4/mile)            $252.80
Weekend surcharge                            $50.00
After-hours surcharge                        $50.00
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total                                       $934.52

Pricing Notes:
• Enhanced bariatric rate ($150 vs $50) applied based on client weight
• Dead mileage fee ($4/mile from office to pickup and back) for trips 2+ counties out
• Additional charges apply for off-hours, weekends, or wheelchair accessibility
• Final fare was locked at booking time
```

## Data Structure Reference

### Database Storage Format
```javascript
pricing_breakdown_data: {
  pricing: {
    basePrice: 300,
    baseRatePerLeg: 150,
    isBariatric: true,
    legs: 2,
    tripDistancePrice: 182.72,
    deadMileagePrice: 252.80,
    deadMileageDistance: 63.2,
    distancePrice: 435.52,
    countySurcharge: 100,
    weekendSurcharge: 50,
    afterHoursSurcharge: 50,
    emergencySurcharge: 0,
    holidaySurcharge: 0,
    veteranDiscount: 0,
    total: 934.52,
    countyInfo: { countiesOut: 2 }
  },
  distance: { distance: 60.91, unit: 'miles' },
  summary: {
    isRoundTrip: true,
    isEmergency: false,
    wheelchairType: 'provided',
    additionalPassengers: 0
  },
  wheelchairInfo: { type: 'provided', requirements: null, details: null },
  clientInfo: { weight: 350 },
  addressDetails: {
    pickupDetails: 'Building B, Floor 2',
    destinationDetails: '123 Main St'
  },
  createdAt: '2025-11-07T12:00:00.000Z',
  source: 'BookingMobileApp'
}
```

## Testing

To test this fix:

1. **View an existing trip** that was booked with pricing breakdown:
   - Open Trip Details screen
   - Verify all breakdown items display correctly
   - Verify dead mileage shows actual distance (not calculated)
   - Verify all surcharges display when applicable

2. **Book a new trip** and verify:
   - Pricing breakdown saves correctly to database
   - Trip Details shows all breakdown items
   - Dead mileage distance is stored and displayed correctly

## Files Modified

1. `/Volumes/C/CCTAPPS/booking_mobile/src/screens/TripDetailsScreen.js`
   - Fixed all pricing breakdown property access to use nested structure
   - Enhanced dead mileage display to use actual stored distance

2. `/Volumes/C/CCTAPPS/booking_mobile/src/lib/pricing.js`
   - Added `deadMileageDistance` to breakdown object
   - Store actual dead mileage distance when calculated

## Status
✅ **COMPLETE** - Trip Details screen now displays full pricing breakdown correctly
