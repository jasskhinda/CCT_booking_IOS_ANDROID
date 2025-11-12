/**
 * Compassionate Care Transportation - Mobile Pricing Calculator
 * Updated: November 6, 2025
 * 
 * Complete implementation matching CCT's official pricing structure
 * Adapted for React Native / Expo
 */

export const PRICING_CONFIG = {
  BASE_RATES: {
    REGULAR_PER_LEG: 50,      // $50 per leg (client weight under 300 lbs)
    BARIATRIC_PER_LEG: 150,   // $150 per leg (client weight 300+ lbs)
  },
  WEIGHT: {
    BARIATRIC_THRESHOLD: 300, // 300+ lbs = bariatric rate
  },
  DISTANCE: {
    FRANKLIN_COUNTY: 3.00,    // $3 per mile inside Franklin County
    OUTSIDE_FRANKLIN: 4.00,   // $4 per mile outside Franklin County
    DEAD_MILEAGE: 4.00,       // $4 per mile for dead mileage
  },
  OFFICE_LOCATION: {
    address: '5050 Blazer Pkwy #100, Dublin, OH 43017',
    coords: { lat: 40.0992, lng: -83.1486 }, // Approximate
  },
  PREMIUMS: {
    WEEKEND: 40,              // Saturday/Sunday
    AFTER_HOURS: 40,          // Before 8 AM or after 5 PM on weekdays
    EMERGENCY: 40,            // Emergency checkbox
    COUNTY_SURCHARGE: 50,     // $50 for 2+ counties out from Franklin
    HOLIDAY_SURCHARGE: 100,   // $100 for holidays (not per leg)
  },
  DISCOUNTS: {
    VETERAN: 0.20             // 20% veteran discount
  },
  HOURS: {
    AFTER_HOURS_START: 17,    // 5:00 PM (17:00)
    AFTER_HOURS_END: 8        // 8:00 AM (08:00)
  },
  HOLIDAYS: [
    '01-01', // New Year's Day
    '12-31', // New Year's Eve
    '07-04', // Independence Day
    '12-24', // Christmas Eve
    '12-25', // Christmas Day
  ],
};

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

/**
 * Calculate distance using Google Maps Distance Matrix API
 */
export async function calculateDistance(pickup, destination) {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(pickup)}&destinations=${encodeURIComponent(destination)}&units=imperial&key=${GOOGLE_MAPS_API_KEY}`
    );
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.rows[0].elements[0].status === 'OK') {
      const element = data.rows[0].elements[0];
      const distanceMeters = element.distance.value;
      const distanceMiles = distanceMeters * 0.000621371;
      
      return {
        distance: parseFloat(distanceMiles.toFixed(2)),
        duration: element.duration.text,
        distanceText: element.distance.text,
        isEstimated: false
      };
    } else {
      throw new Error('Could not calculate distance');
    }
  } catch (error) {
    console.error('Error calculating distance:', error);
    return {
      distance: 15,
      duration: 'Unknown',
      distanceText: '15 mi (estimated)',
      isEstimated: true
    };
  }
}

/**
 * Calculate dead mileage from office to pickup
 * MATCHES facility_mobile exactly (lines 320-382)
 * Returns ONLY office→pickup distance
 * The caller handles round trip vs one-way logic
 */
export async function calculateDeadMileage(pickupAddress) {
  try {
    const officeAddress = PRICING_CONFIG.OFFICE_LOCATION.address;

    console.log('🚗 Calculating dead mileage from office to pickup');
    console.log('🏢 Office:', officeAddress);
    console.log('📍 Pickup:', pickupAddress);

    // Calculate distance from office to pickup using Google Distance Matrix
    const distanceResult = await calculateDistance(officeAddress, pickupAddress);

    if (distanceResult && distanceResult.distance > 0) {
      console.log('🚗 Dead mileage calculated:', distanceResult.distance.toFixed(2), 'miles');
      return {
        distance: distanceResult.distance,
        isEstimated: distanceResult.isEstimated || false
      };
    } else {
      console.warn('Dead mileage calculation failed, using 0');
      return { distance: 0, isEstimated: true };
    }
  } catch (error) {
    console.error('Error calculating dead mileage:', error);
    return { distance: 0, isEstimated: true };
  }
}

/**
 * Check if address is in Franklin County, Ohio
 * ENHANCED: Now includes county override patterns (21 Franklin + 6 Lancaster)
 * Priority system: Lancaster patterns > Franklin patterns > Google API
 */
export async function checkFranklinCountyStatus(pickup, destination) {
  try {
    const pickupLower = pickup?.toLowerCase() || '';
    const destinationLower = destination?.toLowerCase() || '';

    console.log('📍 County Detection (booking_mobile):', { pickup, destination });

    // PRIORITY 1: Lancaster/Fairfield County patterns (forces 2+ counties out)
    // These 6 patterns override everything else
    const lancasterPatterns = [
      'lancaster, oh',
      'lancaster,oh',
      'lancaster ohio',
      '43130',              // Lancaster zip
      'fairfield county',
      'fairfield co'
    ];

    const isPickupLancaster = lancasterPatterns.some(pattern => pickupLower.includes(pattern));
    const isDestinationLancaster = lancasterPatterns.some(pattern => destinationLower.includes(pattern));

    // If either address matches Lancaster patterns, force 2+ counties out
    if (isPickupLancaster || isDestinationLancaster) {
      console.log('🚨 LANCASTER OVERRIDE APPLIED: Fairfield County detected → 2+ counties out');
      return {
        isInFranklinCounty: false,
        countiesOut: 2,
        pickupCounty: isPickupLancaster ? 'Fairfield County (Lancaster)' : 'Franklin County',
        destinationCounty: isDestinationLancaster ? 'Fairfield County (Lancaster)' : 'Franklin County',
      };
    }

    // PRIORITY 2: Franklin County patterns (forces 0 counties out)
    // These 21 patterns match facility_mobile exactly
    const franklinCountyPatterns = [
      'westerville',
      'columbus',
      'dublin',
      'gahanna',
      'reynoldsburg',
      'grove city',
      'hilliard',
      'upper arlington',
      'bexley',
      'whitehall',
      'worthington',
      'grandview heights',
      'groveport',
      'new albany',
      'pickerington',
      'canal winchester',
      'lockbourne',
      '43082',              // Westerville zip
      '43228',              // Columbus zip
      'executive campus dr',
      'franshire'
    ];

    const isPickupFranklin = franklinCountyPatterns.some(pattern => pickupLower.includes(pattern));
    const isDestinationFranklin = franklinCountyPatterns.some(pattern => destinationLower.includes(pattern));

    // If BOTH addresses match Franklin patterns, force 0 counties out
    if (isPickupFranklin && isDestinationFranklin) {
      console.log('✅ FRANKLIN OVERRIDE APPLIED: Both addresses in Franklin County → 0 counties out');
      return {
        isInFranklinCounty: true,
        countiesOut: 0,
        pickupCounty: 'Franklin County',
        destinationCounty: 'Franklin County',
      };
    }

    // PRIORITY 3: No pattern matched - default to Franklin County to avoid overcharging
    // This matches facility_mobile behavior exactly (line 259-265)
    console.log('⚠️ No override matched - defaulting to Franklin County to avoid overcharging');
    return {
      isInFranklinCounty: true,
      countiesOut: 0,
      pickupCounty: 'Franklin County',
      destinationCounty: 'Franklin County',
    };
  } catch (error) {
    console.error('Error checking county status:', error);
    return {
      isInFranklinCounty: true,
      countiesOut: 0,
      pickupCounty: 'Unknown (error)',
      destinationCounty: 'Unknown (error)',
    };
  }
}

/**
 * Check if date is after hours
 */
export function isAfterHours(dateTime) {
  const date = new Date(dateTime);
  const hour = date.getHours();
  const day = date.getDay();

  // Weekdays only - check time
  if (day >= 1 && day <= 5) {
    return hour < PRICING_CONFIG.HOURS.AFTER_HOURS_END || 
           hour >= PRICING_CONFIG.HOURS.AFTER_HOURS_START;
  }
  
  return false;
}

/**
 * Check if date is weekend
 */
export function isWeekend(dateTime) {
  const date = new Date(dateTime);
  const day = date.getDay();
  return day === 0 || day === 6;
}

/**
 * Check if date is a holiday
 */
export function isHoliday(dateTime) {
  const date = new Date(dateTime);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateString = `${month}-${day}`;
  
  if (PRICING_CONFIG.HOLIDAYS.includes(dateString)) {
    return true;
  }
  
  // Check for dynamic holidays
  const year = date.getFullYear();
  
  // Memorial Day (last Monday in May)
  if (month === '05' && date.getDay() === 1) {
    const lastMonday = new Date(year, 4, 31);
    while (lastMonday.getDay() !== 1) {
      lastMonday.setDate(lastMonday.getDate() - 1);
    }
    if (date.toDateString() === lastMonday.toDateString()) return true;
  }
  
  // Labor Day (first Monday in September)
  if (month === '09' && date.getDay() === 1 && parseInt(day) <= 7) {
    return true;
  }
  
  // Thanksgiving (fourth Thursday in November)
  if (month === '11' && date.getDay() === 4) {
    const weekOfMonth = Math.ceil(parseInt(day) / 7);
    if (weekOfMonth === 4) return true;
  }
  
  return false;
}

/**
 * Calculate complete trip price with full breakdown
 */
export function calculateTripPrice({
  isRoundTrip = false,
  tripDistance = 0,
  deadMileageDistance = 0,
  pickupDateTime,
  clientWeight = 250,
  isEmergency = false,
  isVeteran = false,
  countyInfo = null,
}) {
  let breakdown = {
    basePrice: 0,
    baseRatePerLeg: 0,
    isBariatric: false,
    legs: isRoundTrip ? 2 : 1,
    
    tripDistancePrice: 0,
    deadMileagePrice: 0,
    deadMileageDistance: 0,
    distancePrice: 0,
    
    countySurcharge: 0,
    weekendSurcharge: 0,
    afterHoursSurcharge: 0,
    emergencySurcharge: 0,
    holidaySurcharge: 0,
    
    veteranDiscount: 0,
    
    total: 0,
  };

  // 1. Base fare
  breakdown.isBariatric = clientWeight >= PRICING_CONFIG.WEIGHT.BARIATRIC_THRESHOLD;
  breakdown.baseRatePerLeg = breakdown.isBariatric
    ? PRICING_CONFIG.BASE_RATES.BARIATRIC_PER_LEG
    : PRICING_CONFIG.BASE_RATES.REGULAR_PER_LEG;
  breakdown.basePrice = breakdown.baseRatePerLeg * breakdown.legs;

  // 2. Distance pricing - MATCHES facility_mobile lines 434-452
  const isInFranklinCounty = countyInfo?.isInFranklinCounty !== false;
  const pricePerMile = isInFranklinCounty
    ? PRICING_CONFIG.DISTANCE.FRANKLIN_COUNTY
    : PRICING_CONFIG.DISTANCE.OUTSIDE_FRANKLIN;

  // Double distance for round trips INSIDE this function (not by caller)
  // This matches facility_mobile exactly (line 436)
  if (tripDistance > 0) {
    const effectiveDistance = isRoundTrip ? tripDistance * 2 : tripDistance;

    console.log('💰 Distance Rate Calculation:', {
      tripDistance,
      effectiveDistance,
      isInFranklinCounty,
      rate: isInFranklinCounty ? '$3/mile' : '$4/mile'
    });

    breakdown.tripDistancePrice = effectiveDistance * pricePerMile;
  }

  if (deadMileageDistance > 0) {
    breakdown.deadMileagePrice = deadMileageDistance * PRICING_CONFIG.DISTANCE.DEAD_MILEAGE;
    breakdown.deadMileageDistance = deadMileageDistance;
  }

  breakdown.distancePrice = breakdown.tripDistancePrice + breakdown.deadMileagePrice;

  // 3. County surcharge - MATCHES facility_mobile lines 454-461
  // Formula: (countiesOut - 1) * $50
  // Examples: 2 counties = $50, 3 counties = $100, 4 counties = $150
  const countiesOut = countyInfo?.countiesOut || 0;
  if (countiesOut >= 2) {
    breakdown.countySurcharge = (countiesOut - 1) * PRICING_CONFIG.PREMIUMS.COUNTY_SURCHARGE;
    console.log('💵 County Surcharge Applied:', {
      countiesOut,
      surcharge: breakdown.countySurcharge
    });
  }

  // 4. Time-based surcharges
  if (pickupDateTime) {
    if (isWeekend(pickupDateTime)) {
      breakdown.weekendSurcharge = PRICING_CONFIG.PREMIUMS.WEEKEND;
    }
    
    if (isAfterHours(pickupDateTime)) {
      breakdown.afterHoursSurcharge = PRICING_CONFIG.PREMIUMS.AFTER_HOURS;
    }
    
    if (isHoliday(pickupDateTime)) {
      breakdown.holidaySurcharge = PRICING_CONFIG.PREMIUMS.HOLIDAY_SURCHARGE;
    }
  }

  // 5. Emergency
  if (isEmergency) {
    breakdown.emergencySurcharge = PRICING_CONFIG.PREMIUMS.EMERGENCY;
  }

  // 6. Calculate subtotal
  const subtotal = breakdown.basePrice +
                   breakdown.distancePrice +
                   breakdown.countySurcharge +
                   breakdown.weekendSurcharge +
                   breakdown.afterHoursSurcharge +
                   breakdown.emergencySurcharge +
                   breakdown.holidaySurcharge;

  // 7. Veteran discount
  if (isVeteran) {
    breakdown.veteranDiscount = subtotal * PRICING_CONFIG.DISCOUNTS.VETERAN;
  }

  // 8. Final total
  breakdown.total = subtotal - breakdown.veteranDiscount;

  // Round all values
  Object.keys(breakdown).forEach(key => {
    if (typeof breakdown[key] === 'number') {
      breakdown[key] = Math.round(breakdown[key] * 100) / 100;
    }
  });

  return breakdown;
}

/**
 * Get complete pricing estimate
 */
export async function getPricingEstimate({
  pickupAddress,
  destinationAddress,
  isRoundTrip = false,
  pickupDateTime,
  clientWeight = 250,
  isEmergency = false,
  isVeteran = false,
  preCalculatedDistance = null
}) {
  try {
    console.log('📊 Getting pricing estimate:', {
      pickupAddress,
      destinationAddress,
      isRoundTrip,
      clientWeight,
      isEmergency,
      isVeteran
    });

    // 1. Trip distance
    let tripDistance = 0;
    let distanceInfo = null;

    if (preCalculatedDistance) {
      tripDistance = typeof preCalculatedDistance === 'number' 
        ? preCalculatedDistance 
        : (preCalculatedDistance.distance || preCalculatedDistance.miles || 0);
      
      distanceInfo = {
        distance: tripDistance,
        duration: preCalculatedDistance.duration || 'Unknown',
        distanceText: preCalculatedDistance.text || `${tripDistance} mi`,
        isEstimated: false
      };
    } else if (pickupAddress && destinationAddress) {
      distanceInfo = await calculateDistance(pickupAddress, destinationAddress);
      tripDistance = distanceInfo.distance;
    }

    // 2. County status
    let countyInfo = { isInFranklinCounty: true, countiesOut: 0 };
    if (pickupAddress && destinationAddress) {
      countyInfo = await checkFranklinCountyStatus(pickupAddress, destinationAddress);
      console.log('📍 County Info:', countyInfo);
    }

    // 3. Dead mileage (only for 2+ counties) - MATCHES facility_mobile lines 564-601
    let deadMileageDistance = 0;
    if (countyInfo.countiesOut >= 2 && pickupAddress && destinationAddress) {
      // Calculate office to pickup distance
      const toPickupResult = await calculateDeadMileage(pickupAddress);
      const toPickupDistance = toPickupResult.distance;

      if (isRoundTrip) {
        // Round trip: Driver goes Office → Pickup, then after round trip returns Pickup → Office
        // Dead mileage = (Office → Pickup) × 2
        deadMileageDistance = toPickupDistance * 2;
        console.log('🚗 Round Trip Dead Mileage:', {
          pickup: pickupAddress,
          toPickup: toPickupDistance,
          fromPickup: toPickupDistance,
          totalDistance: deadMileageDistance,
          totalPrice: deadMileageDistance * PRICING_CONFIG.DISTANCE.DEAD_MILEAGE
        });
      } else {
        // One-way trip: Office → Pickup + Destination → Office
        // Driver returns from DESTINATION (where they dropped off), not from pickup
        const fromDestinationResult = await calculateDeadMileage(destinationAddress);
        const fromDestinationDistance = fromDestinationResult.distance;

        deadMileageDistance = toPickupDistance + fromDestinationDistance;
        console.log('🚗 One-Way Dead Mileage:', {
          pickup: pickupAddress,
          destination: destinationAddress,
          toPickup: toPickupDistance,
          fromDestination: fromDestinationDistance,
          totalDistance: deadMileageDistance,
          totalPrice: deadMileageDistance * PRICING_CONFIG.DISTANCE.DEAD_MILEAGE
        });
      }
    }

    // 4. Calculate pricing
    const pricing = calculateTripPrice({
      isRoundTrip,
      tripDistance,
      deadMileageDistance,
      pickupDateTime,
      clientWeight,
      isEmergency,
      isVeteran,
      countyInfo,
    });

    console.log('✅ Pricing calculated:', pricing);

    return {
      success: true,
      pricing,
      distanceInfo,
      countyInfo,
      deadMileageDistance,
    };
  } catch (error) {
    console.error('❌ Error calculating pricing:', error);
    return {
      success: false,
      error: error.message,
      pricing: null,
    };
  }
}

/**
 * Format currency for display
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '$0.00';
  return `$${amount.toFixed(2)}`;
}

export default {
  PRICING_CONFIG,
  calculateDistance,
  calculateDeadMileage,
  checkFranklinCountyStatus,
  isAfterHours,
  isWeekend,
  isHoliday,
  calculateTripPrice,
  getPricingEstimate,
  formatCurrency,
};
