# 🔧 EXACT CODE CHANGES - Round Trip Distance Fix

## FILES CHANGED: 2

1. ✅ `/Volumes/C/CCTAPPS/booking_mobile/src/screens/UberLikeBookingScreen.js` (3 locations)
2. ✅ `/Volumes/C/CCTAPPS/booking_mobile/src/lib/pricing.js` (1 comment update)

---

## CHANGE #1: Google Directions API Handler

**File:** `UberLikeBookingScreen.js`  
**Line:** ~635

### BEFORE:
```javascript
setDistanceMiles(Math.round(distanceInMiles * 100) / 100);
setEstimatedDuration(durationText);

const pricingResult = await getPricingEstimate({
  pickupAddress,
  destinationAddress,
  isRoundTrip,
  pickupDateTime: pickupDate.toISOString(),
  wheelchairType,
  isEmergency,
  preCalculatedDistance: Math.round(distanceInMiles * 100) / 100,
  clientWeight: clientWeight ? parseInt(clientWeight) : null,
});
```

### AFTER:
```javascript
// Store the ONE-WAY distance (for display purposes)
const oneWayDistance = Math.round(distanceInMiles * 100) / 100;
setDistanceMiles(oneWayDistance);
setEstimatedDuration(durationText);

// For round trips, double the distance before pricing calculation
// This matches facility_app behavior (line 685 in facility_app/lib/pricing.js)
const distanceForPricing = isRoundTrip ? oneWayDistance * 2 : oneWayDistance;

console.log(`📏 Distance calculation:`, {
  oneWayMiles: oneWayDistance,
  isRoundTrip,
  distanceForPricing,
  calculation: isRoundTrip ? `${oneWayDistance} * 2 = ${distanceForPricing}` : oneWayDistance
});

// Calculate comprehensive pricing with county detection and all fees
const pricingResult = await getPricingEstimate({
  pickupAddress,
  destinationAddress,
  isRoundTrip,
  pickupDateTime: pickupDate.toISOString(),
  wheelchairType,
  isEmergency,
  preCalculatedDistance: distanceForPricing,
  clientWeight: clientWeight ? parseInt(clientWeight) : null,
});
```

**KEY CHANGE:** 
- ✅ Created `distanceForPricing` variable that doubles distance for round trips
- ✅ Added console log for debugging
- ✅ Pass `distanceForPricing` instead of raw `distanceInMiles`

---

## CHANGE #2: MapViewDirections Fallback Handler

**File:** `UberLikeBookingScreen.js`  
**Line:** ~672

### BEFORE:
```javascript
const distanceInMiles = result.distance * 0.621371;
const durationInMinutes = Math.round(result.duration);

setDistanceMiles(distanceInMiles);
setEstimatedDuration(`${durationInMinutes} min`);
console.log('⚠️ Using MapViewDirections fallback:', distanceInMiles.toFixed(2), 'miles');

const pricingResult = await getPricingEstimate({
  pickupAddress,
  destinationAddress,
  isRoundTrip,
  pickupDateTime: pickupDate.toISOString(),
  wheelchairType,
  isEmergency,
  preCalculatedDistance: distanceInMiles,
  clientWeight: clientWeight ? parseInt(clientWeight) : null,
});
```

### AFTER:
```javascript
const oneWayDistance = result.distance * 0.621371;
const durationInMinutes = Math.round(result.duration);

setDistanceMiles(oneWayDistance);
setEstimatedDuration(`${durationInMinutes} min`);
console.log('⚠️ Using MapViewDirections fallback:', oneWayDistance.toFixed(2), 'miles');

// For round trips, double the distance before pricing calculation
const distanceForPricing = isRoundTrip ? oneWayDistance * 2 : oneWayDistance;

// Calculate pricing with fallback distance
const pricingResult = await getPricingEstimate({
  pickupAddress,
  destinationAddress,
  isRoundTrip,
  pickupDateTime: pickupDate.toISOString(),
  wheelchairType,
  isEmergency,
  preCalculatedDistance: distanceForPricing,
  clientWeight: clientWeight ? parseInt(clientWeight) : null,
});
```

**KEY CHANGE:** 
- ✅ Renamed `distanceInMiles` to `oneWayDistance` for clarity
- ✅ Added `distanceForPricing` calculation
- ✅ Pass `distanceForPricing` instead of `oneWayDistance`

---

## CHANGE #3: recalculatePricing Function

**File:** `UberLikeBookingScreen.js`  
**Line:** ~178

### BEFORE:
```javascript
const recalculatePricing = async () => {
  try {
    const pricingResult = await getPricingEstimate({
      pickupAddress,
      destinationAddress,
      isRoundTrip,
      pickupDateTime: pickupDate.toISOString(),
      wheelchairType,
      isEmergency,
      preCalculatedDistance: distanceMiles,
      clientWeight: clientWeight ? parseInt(clientWeight) : null,
    });

    if (pricingResult.success && pricingResult.pricing) {
      setEstimatedFare(pricingResult.pricing.total);
      setPricingBreakdown(pricingResult.pricing);
      setCountyInfo(pricingResult.countyInfo);
      console.log('💰 Comprehensive pricing calculated:', pricingResult);
    }
  } catch (error) {
    console.error('Pricing calculation error:', error);
  }
};
```

### AFTER:
```javascript
const recalculatePricing = async () => {
  try {
    // distanceMiles stores ONE-WAY distance, double it for round trips
    const distanceForPricing = isRoundTrip ? distanceMiles * 2 : distanceMiles;
    
    const pricingResult = await getPricingEstimate({
      pickupAddress,
      destinationAddress,
      isRoundTrip,
      pickupDateTime: pickupDate.toISOString(),
      wheelchairType,
      isEmergency,
      preCalculatedDistance: distanceForPricing,
      clientWeight: clientWeight ? parseInt(clientWeight) : null,
    });

    if (pricingResult.success && pricingResult.pricing) {
      setEstimatedFare(pricingResult.pricing.total);
      setPricingBreakdown(pricingResult.pricing);
      setCountyInfo(pricingResult.countyInfo);
      console.log('💰 Comprehensive pricing calculated:', pricingResult);
    }
  } catch (error) {
    console.error('Pricing calculation error:', error);
  }
};
```

**KEY CHANGE:** 
- ✅ Added `distanceForPricing` calculation
- ✅ Added comment explaining that `distanceMiles` stores ONE-WAY distance

---

## CHANGE #4: Updated Comment in pricing.js

**File:** `pricing.js`  
**Line:** ~298

### BEFORE:
```javascript
// Distance is calculated using actual driving route
// For round trips, the tripDistance already includes both directions
if (tripDistance > 0) {
  breakdown.tripDistancePrice = tripDistance * pricePerMile;
}
```

### AFTER:
```javascript
// Distance is calculated using actual driving route
// For round trips, the calling code doubles the one-way distance before passing it here
// This matches facility_app behavior (see facility_app/lib/pricing.js line 685)
if (tripDistance > 0) {
  breakdown.tripDistancePrice = tripDistance * pricePerMile;
}
```

**KEY CHANGE:** 
- ✅ Updated comment to reflect the actual behavior
- ✅ Added reference to facility_app for consistency

---

## THE PATTERN 🎯

All three locations follow the same pattern:

```javascript
// 1. Get ONE-WAY distance from Google
const oneWayDistance = /* distance from API */;

// 2. Store ONE-WAY distance (for display)
setDistanceMiles(oneWayDistance);

// 3. Double distance for round trips (for pricing)
const distanceForPricing = isRoundTrip ? oneWayDistance * 2 : oneWayDistance;

// 4. Pass TOTAL distance to pricing
preCalculatedDistance: distanceForPricing
```

This matches facility_app's behavior exactly! ✅

---

## VERIFICATION ✅

After reload, you should see this console log for round trips:
```
📏 Distance calculation: {
  oneWayMiles: 45.7,
  isRoundTrip: true,
  distanceForPricing: 91.4,
  calculation: "45.7 * 2 = 91.4"
}
```

And the pricing should now match facility_app! 🎉
