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
 * Calculate dead mileage (office to/from pickup and destination)
 * Only applies for trips 2+ counties out from Franklin County
 */
export async function calculateDeadMileage(pickup, destination, isRoundTrip) {
  try {
    const officeAddress = PRICING_CONFIG.OFFICE_LOCATION.address;
    
    // Calculate office to pickup
    const officeToPickup = await calculateDistance(officeAddress, pickup);
    
    if (isRoundTrip) {
      // Round trip: Office → Pickup × 2
      return {
        distance: officeToPickup.distance * 2,
        breakdown: {
          officeToPickup: officeToPickup.distance,
          pickupToOffice: officeToPickup.distance,
        }
      };
    } else {
      // One-way: Office → Pickup + Destination → Office
      const destinationToOffice = await calculateDistance(destination, officeAddress);
      
      return {
        distance: officeToPickup.distance + destinationToOffice.distance,
        breakdown: {
          officeToPickup: officeToPickup.distance,
          destinationToOffice: destinationToOffice.distance,
        }
      };
    }
  } catch (error) {
    console.error('Error calculating dead mileage:', error);
    return { distance: 0, breakdown: {} };
  }
}

/**
 * Check if address is in Franklin County, Ohio
 */
export async function checkFranklinCountyStatus(pickup, destination) {
  try {
    // Check pickup county
    const pickupResponse = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(pickup)}&key=${GOOGLE_MAPS_API_KEY}`
    );
    const pickupData = await pickupResponse.json();
    
    // Check destination county
    const destinationResponse = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(destination)}&key=${GOOGLE_MAPS_API_KEY}`
    );
    const destinationData = await destinationResponse.json();
    
    let pickupCounty = 'Unknown';
    let destinationCounty = 'Unknown';
    
    if (pickupData.status === 'OK' && pickupData.results[0]) {
      const county = pickupData.results[0].address_components.find(c => 
        c.types.includes('administrative_area_level_2')
      );
      pickupCounty = county?.long_name || 'Unknown';
    }
    
    if (destinationData.status === 'OK' && destinationData.results[0]) {
      const county = destinationData.results[0].address_components.find(c => 
        c.types.includes('administrative_area_level_2')
      );
      destinationCounty = county?.long_name || 'Unknown';
    }
    
    const pickupInFranklin = pickupCounty.includes('Franklin');
    const destinationInFranklin = destinationCounty.includes('Franklin');
    
    // If EITHER address is outside Franklin County, use $4/mile
    const isInFranklinCounty = pickupInFranklin && destinationInFranklin;
    
    // Count counties out
    let countiesOut = 0;
    if (!pickupInFranklin) countiesOut++;
    if (!destinationInFranklin && destinationCounty !== pickupCounty) countiesOut++;
    
    return {
      isInFranklinCounty,
      countiesOut,
      pickupCounty,
      destinationCounty,
    };
  } catch (error) {
    console.error('Error checking county status:', error);
    return {
      isInFranklinCounty: true,
      countiesOut: 0,
      details: 'Error checking county'
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

  // 2. Distance pricing
  const isInFranklinCounty = countyInfo?.isInFranklinCounty !== false;
  const pricePerMile = isInFranklinCounty
    ? PRICING_CONFIG.DISTANCE.FRANKLIN_COUNTY
    : PRICING_CONFIG.DISTANCE.OUTSIDE_FRANKLIN;

  if (tripDistance > 0) {
    breakdown.tripDistancePrice = tripDistance * pricePerMile * breakdown.legs;
  }

  if (deadMileageDistance > 0) {
    breakdown.deadMileagePrice = deadMileageDistance * PRICING_CONFIG.DISTANCE.DEAD_MILEAGE;
  }

  breakdown.distancePrice = breakdown.tripDistancePrice + breakdown.deadMileagePrice;

  // 3. County surcharge
  const countiesOut = countyInfo?.countiesOut || 0;
  if (countiesOut >= 2) {
    breakdown.countySurcharge = PRICING_CONFIG.PREMIUMS.COUNTY_SURCHARGE;
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
    }

    // 3. Dead mileage (only for 2+ counties)
    let deadMileageDistance = 0;
    if (countyInfo.countiesOut >= 2 && pickupAddress && destinationAddress) {
      const deadMileageInfo = await calculateDeadMileage(
        pickupAddress, 
        destinationAddress, 
        isRoundTrip
      );
      deadMileageDistance = deadMileageInfo.distance;
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
};
