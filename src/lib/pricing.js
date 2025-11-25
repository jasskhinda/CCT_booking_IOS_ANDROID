/**
 * Compassionate Rides Pricing Calculator - Mobile App
 * 100% identical to web app pricing logic
 * Implements the full pricing model with distance calculation, premiums, and discounts
 */

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

/**
 * Professional Pricing Constants - Complete Enhanced System
 */
export const PRICING_CONFIG = {
  BASE_RATES: {
    REGULAR_PER_LEG: 50,      // $50 per leg for under 300 lbs
    BARIATRIC_PER_LEG: 150,   // $150 per leg for 300+ lbs
  },
  BARIATRIC: {
    WEIGHT_THRESHOLD: 300,    // 300+ lbs triggers bariatric rate
    MAXIMUM_WEIGHT: 400,      // 400+ lbs cannot be accommodated
  },
  DISTANCE: {
    FRANKLIN_COUNTY: 3.00,    // $3 per mile inside Franklin County
    OUTSIDE_FRANKLIN: 4.00,   // $4 per mile outside Franklin County
    DEAD_MILEAGE: 4.00,       // $4 per mile for dead mileage (office to pickup)
  },
  PREMIUMS: {
    WEEKEND_AFTER_HOURS: 40,  // Before 8am or after 6pm, weekends
    EMERGENCY: 40,            // Emergency trip fee
    WHEELCHAIR_RENTAL: 25,    // Wheelchair rental fee (only if we provide)
    COUNTY_SURCHARGE: 50,     // $50 per county outside Franklin (2+ counties)
    HOLIDAY_SURCHARGE: 100,   // $100 total (not per leg) for holidays
  },
  DISCOUNTS: {
    VETERAN: 0.20  // 20% veteran discount
  },
  HOURS: {
    AFTER_HOURS_START: 18,  // 6pm (18:00)
    AFTER_HOURS_END: 8      // 8am (08:00)
  },
  COMPANY_OFFICE: {
    ADDRESS: "5050 Blazer Pkwy # 100, Dublin, OH 43017",
    LAT: 40.0994,
    LNG: -83.1508
  },
  HOLIDAYS: [
    { month: 1, day: 1, name: "New Year's Day" },
    { month: 12, day: 31, name: "New Year's Eve" },
    { month: 7, day: 4, name: "Independence Day" },
    { month: 12, day: 24, name: "Christmas Eve" },
    { month: 12, day: 25, name: "Christmas Day" }
  ]
};

/**
 * Check if given time is during after-hours (before 8am or after 6pm)
 */
export function isAfterHours(dateTime) {
  const hour = new Date(dateTime).getHours();
  return hour < PRICING_CONFIG.HOURS.AFTER_HOURS_END || hour >= PRICING_CONFIG.HOURS.AFTER_HOURS_START;
}

/**
 * Check if given date is a weekend (Saturday or Sunday)
 */
export function isWeekend(dateTime) {
  const day = new Date(dateTime).getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Check if given date is a holiday
 */
export function checkHoliday(dateTime) {
  const date = new Date(dateTime);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // Check fixed holidays
  for (const holiday of PRICING_CONFIG.HOLIDAYS) {
    if (holiday.month === month && holiday.day === day) {
      return {
        isHoliday: true,
        holidayName: holiday.name,
        surcharge: PRICING_CONFIG.PREMIUMS.HOLIDAY_SURCHARGE
      };
    }
  }

  // Check variable holidays
  const easter = calculateEaster(year);
  if (month === easter.month && day === easter.day) {
    return {
      isHoliday: true,
      holidayName: "Easter Sunday",
      surcharge: PRICING_CONFIG.PREMIUMS.HOLIDAY_SURCHARGE
    };
  }

  const memorialDay = getLastMondayOfMay(year);
  if (month === memorialDay.month && day === memorialDay.day) {
    return {
      isHoliday: true,
      holidayName: "Memorial Day",
      surcharge: PRICING_CONFIG.PREMIUMS.HOLIDAY_SURCHARGE
    };
  }

  const laborDay = getFirstMondayOfSeptember(year);
  if (month === laborDay.month && day === laborDay.day) {
    return {
      isHoliday: true,
      holidayName: "Labor Day",
      surcharge: PRICING_CONFIG.PREMIUMS.HOLIDAY_SURCHARGE
    };
  }

  const thanksgiving = getFourthThursdayOfNovember(year);
  if (month === thanksgiving.month && day === thanksgiving.day) {
    return {
      isHoliday: true,
      holidayName: "Thanksgiving",
      surcharge: PRICING_CONFIG.PREMIUMS.HOLIDAY_SURCHARGE
    };
  }

  return {
    isHoliday: false,
    holidayName: null,
    surcharge: 0
  };
}

/**
 * Helper functions for variable holidays
 */
function getLastMondayOfMay(year) {
  let lastDay = new Date(year, 4, 31);
  while (lastDay.getDay() !== 1) {
    lastDay.setDate(lastDay.getDate() - 1);
  }
  return { month: 5, day: lastDay.getDate() };
}

function getFirstMondayOfSeptember(year) {
  let firstDay = new Date(year, 8, 1);
  while (firstDay.getDay() !== 1) {
    firstDay.setDate(firstDay.getDate() + 1);
  }
  return { month: 9, day: firstDay.getDate() };
}

function calculateEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return { month, day };
}

function getFourthThursdayOfNovember(year) {
  let firstDay = new Date(year, 10, 1);
  while (firstDay.getDay() !== 4) {
    firstDay.setDate(firstDay.getDate() + 1);
  }
  firstDay.setDate(firstDay.getDate() + 21);
  return { month: 11, day: firstDay.getDate() };
}

/**
 * Determine if addresses are in Franklin County using EXACT same override logic as web app
 * MATCHES: facility_app/lib/pricing.js lines 228-292
 */
export async function checkFranklinCountyStatus(pickupAddress, destinationAddress) {
  try {
    // PRIORITY SYSTEM: Pattern matching is the FINAL AUTHORITY
    // This ensures Pickerington, Groveport, etc. are treated as Franklin County
    const pickup = pickupAddress?.toLowerCase() || '';
    const destination = destinationAddress?.toLowerCase() || '';

    console.log('🚨 COUNTY DETECTION CHECK 🚨', {
      pickup: pickupAddress,
      destination: destinationAddress
    });

    // PRIORITY 1: Lancaster/Fairfield County patterns (HIGHEST - forces 2+ counties out)
    const nonFranklinCountyPatterns = [
      'lancaster, oh',
      'lancaster,oh',
      'lancaster ohio',
      '43130', // Lancaster, OH zip code
      'fairfield county',
      'fairfield co'
    ];

    const isPickupLancaster = nonFranklinCountyPatterns.some(pattern => pickup.includes(pattern));
    const isDestinationLancaster = nonFranklinCountyPatterns.some(pattern => destination.includes(pattern));

    if (isPickupLancaster || isDestinationLancaster) {
      console.log('✅ LANCASTER OVERRIDE: Fairfield County detected → 2+ counties out');
      return {
        isInFranklinCounty: false,
        countiesOut: 2,
        pickup: isPickupLancaster ? 'Fairfield County (Lancaster)' : 'Franklin County',
        destination: isDestinationLancaster ? 'Fairfield County (Lancaster)' : 'Franklin County'
      };
    }

    // PRIORITY 2: Franklin County patterns (forces 0 counties out)
    // These 21 patterns are the FINAL AUTHORITY - no Google API fallback
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
      '43082', // Westerville zip
      '43228', // Columbus zip
      'executive campus dr',
      'franshire',
      // CRITICAL: These are in Fairfield/Licking County per Google, but WE treat as Franklin
      'groveport',
      'new albany',
      'pickerington',
      'canal winchester',
      'lockbourne'
    ];

    const isPickupFranklin = franklinCountyPatterns.some(pattern => pickup.includes(pattern));
    const isDestinationFranklin = franklinCountyPatterns.some(pattern => destination.includes(pattern));

    if (isPickupFranklin && isDestinationFranklin) {
      console.log('✅ FRANKLIN COUNTY OVERRIDE APPLIED: Both addresses → 0 counties out, $3/mile');
      return {
        isInFranklinCounty: true,
        countiesOut: 0,
        pickup: 'Franklin County (Override)',
        destination: 'Franklin County (Override)'
      };
    }

    // PRIORITY 3: No pattern matched - default to Franklin County to avoid overcharging
    console.log('⚠️ No override matched - defaulting to Franklin County');
    return {
      isInFranklinCounty: true,
      countiesOut: 0,
      pickup: 'Franklin County (Default)',
      destination: 'Franklin County (Default)'
    };
  } catch (error) {
    console.error('County detection error:', error);
    // Default to Franklin County rates on error to avoid overcharging
    return {
      isInFranklinCounty: true,
      countiesOut: 0,
      pickup: 'Franklin County',
      destination: 'Franklin County'
    };
  }
}

/**
 * Extract county from Google Geocoding result
 */
function extractCountyFromGeocode(result) {
  if (!result.address_components) return null;

  for (let component of result.address_components) {
    if (component.types.includes('administrative_area_level_2')) {
      return component.long_name;
    }
  }

  // Fallback: check if it's in Ohio and assume Franklin County for Columbus area
  const isOhio = result.address_components.some(comp =>
    comp.types.includes('administrative_area_level_1') && comp.short_name === 'OH'
  );

  if (isOhio) {
    const cityComponent = result.address_components.find(comp =>
      comp.types.includes('locality')
    );

    if (cityComponent) {
      const city = cityComponent.long_name.toLowerCase();
      const franklinCountyCities = [
        'columbus', 'dublin', 'westerville', 'gahanna', 'reynoldsburg',
        'grove city', 'hilliard', 'upper arlington', 'bexley', 'whitehall',
        'worthington', 'grandview heights'
      ];

      if (franklinCountyCities.some(fcCity => city.includes(fcCity))) {
        return 'Franklin County';
      }
    }
  }

  return null;
}

/**
 * Calculate dead mileage from company office to pickup location
 */
export async function calculateDeadMileage(pickupAddress) {
  try {
    const officeAddress = PRICING_CONFIG.COMPANY_OFFICE.ADDRESS;

    console.log('🚗 Calculating dead mileage from office to pickup');
    console.log('🏢 Office:', officeAddress);
    console.log('📍 Pickup:', pickupAddress);

    // Use Google Maps Distance Matrix API directly (same as facility_app)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const distanceMatrixUrl = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(officeAddress)}&destinations=${encodeURIComponent(pickupAddress)}&mode=driving&units=imperial&key=${GOOGLE_MAPS_API_KEY}`;

      const response = await fetch(distanceMatrixUrl, { signal: controller.signal });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('❌ Dead mileage API error:', response.status);
        return { distance: 0, isEstimated: true };
      }

      const data = await response.json();

      if (data.status === 'OK' && data.rows && data.rows[0] && data.rows[0].elements && data.rows[0].elements[0]) {
        const element = data.rows[0].elements[0];

        if (element.status === 'OK' && element.distance) {
          // Distance Matrix API returns distance in meters
          const distanceInMiles = element.distance.value * 0.000621371; // Convert meters to miles
          console.log('✅ Dead mileage calculated:', distanceInMiles.toFixed(2), 'miles');

          return {
            distance: Math.round(distanceInMiles * 100) / 100,
            isEstimated: false
          };
        }
      }

      console.warn('⚠️ Dead mileage calculation failed, response:', data.status);
      return { distance: 0, isEstimated: true };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.log('⏱️ Dead mileage calculation timed out');
      } else {
        console.error('❌ Dead mileage calculation error:', fetchError.message);
      }
      return { distance: 0, isEstimated: true };
    }
  } catch (error) {
    console.error('❌ Unable to calculate dead mileage:', error.message);
    return { distance: 0, isEstimated: true };
  }
}

/**
 * Calculate total trip price based on enhanced professional rate structure
 * 100% identical to web app
 */
export function calculateTripPrice({
  isRoundTrip = false,
  distance = 0,
  pickupDateTime,
  wheelchairType = 'no_wheelchair',
  clientType = 'facility',
  additionalPassengers = 0,
  isEmergency = false,
  countyInfo = null,
  clientWeight = null,
  deadMileage = 0,
  holidayInfo = null
}) {
  let breakdown = {
    basePrice: 0,
    roundTripPrice: 0,
    distancePrice: 0,
    countyPrice: 0,
    deadMileagePrice: 0,
    weekendAfterHoursSurcharge: 0,
    weekendSurcharge: 0,          // For PricingDisplay
    afterHoursSurcharge: 0,       // For PricingDisplay
    emergencyFee: 0,
    emergencySurcharge: 0,        // For PricingDisplay
    holidaySurcharge: 0,
    wheelchairPrice: 0,
    veteranDiscount: 0,
    total: 0,
    isBariatric: false,
    hasHolidaySurcharge: false,
    hasDeadMileage: false,
    // Add properties for PricingDisplay component
    legs: isRoundTrip ? 2 : 1,
    baseRatePerLeg: 0,
    tripDistancePrice: 0,         // Alias for distancePrice
    countySurcharge: 0            // Alias for countyPrice
  };

  // Enhanced base rate: Regular vs Bariatric
  const isBariatric = clientWeight && clientWeight >= PRICING_CONFIG.BARIATRIC.WEIGHT_THRESHOLD;
  breakdown.isBariatric = isBariatric;

  console.log('💰 Base Rate Calculation:', {
    clientWeight,
    isBariatric,
    isRoundTrip,
    bariatricRate: PRICING_CONFIG.BASE_RATES.BARIATRIC_PER_LEG,
    regularRate: PRICING_CONFIG.BASE_RATES.REGULAR_PER_LEG
  });

  if (isBariatric) {
    breakdown.baseRatePerLeg = PRICING_CONFIG.BASE_RATES.BARIATRIC_PER_LEG;
    breakdown.basePrice = PRICING_CONFIG.BASE_RATES.BARIATRIC_PER_LEG;
    if (isRoundTrip) {
      breakdown.roundTripPrice = PRICING_CONFIG.BASE_RATES.BARIATRIC_PER_LEG;
    }
  } else {
    breakdown.baseRatePerLeg = PRICING_CONFIG.BASE_RATES.REGULAR_PER_LEG;
    breakdown.basePrice = PRICING_CONFIG.BASE_RATES.REGULAR_PER_LEG;
    if (isRoundTrip) {
      breakdown.roundTripPrice = PRICING_CONFIG.BASE_RATES.REGULAR_PER_LEG;
    }
  }

  console.log('💰 Base Prices Set:', {
    basePrice: breakdown.basePrice,
    roundTripPrice: breakdown.roundTripPrice,
    total: breakdown.basePrice + breakdown.roundTripPrice
  });

  // Distance charge calculation with Franklin County logic
  if (distance > 0) {
    const effectiveDistance = isRoundTrip ? distance * 2 : distance;
    // Use $4/mile if EITHER address is outside Franklin County
    const isInFranklinCounty = countyInfo?.isInFranklinCounty === true;

    console.log('💰 Distance Rate Calculation:', {
      distance,
      effectiveDistance,
      isInFranklinCounty,
      rate: isInFranklinCounty ? '$3/mile' : '$4/mile'
    });

    if (isInFranklinCounty) {
      breakdown.distancePrice = effectiveDistance * PRICING_CONFIG.DISTANCE.FRANKLIN_COUNTY;
    } else {
      breakdown.distancePrice = effectiveDistance * PRICING_CONFIG.DISTANCE.OUTSIDE_FRANKLIN;
    }
    breakdown.tripDistancePrice = breakdown.distancePrice; // Alias for PricingDisplay
  }

  // County surcharge for trips outside Franklin County (2+ counties)
  if (countyInfo && countyInfo.countiesOut >= 2) {
    breakdown.countyPrice = (countyInfo.countiesOut - 1) * PRICING_CONFIG.PREMIUMS.COUNTY_SURCHARGE;
    breakdown.countySurcharge = breakdown.countyPrice; // Alias for PricingDisplay
    console.log('💵 County Surcharge Applied:', {
      countiesOut: countyInfo.countiesOut,
      countyPrice: breakdown.countyPrice
    });
  }

  // Dead mileage fee for trips 2+ counties out (NO dead mileage for 1 county out)
  if (deadMileage > 0 && countyInfo && countyInfo.countiesOut >= 2) {
    breakdown.deadMileagePrice = deadMileage * PRICING_CONFIG.DISTANCE.DEAD_MILEAGE;
    breakdown.hasDeadMileage = true;
    console.log('🚗 Dead Mileage Fee Applied:', {
      deadMileage,
      deadMileagePrice: breakdown.deadMileagePrice
    });
  }

  // Weekend and after-hours premium ($40 total, not per condition)
  if (pickupDateTime) {
    const isAfterHoursTime = isAfterHours(pickupDateTime);
    const isWeekendTime = isWeekend(pickupDateTime);

    console.log('💰 Weekend/After-Hours Check:', {
      pickupDateTime,
      dateObj: new Date(pickupDateTime),
      day: new Date(pickupDateTime).getDay(),
      hour: new Date(pickupDateTime).getHours(),
      isWeekendTime,
      isAfterHoursTime
    });

    if (isAfterHoursTime || isWeekendTime) {
      const surcharge = PRICING_CONFIG.PREMIUMS.WEEKEND_AFTER_HOURS;

      // For PricingDisplay: show which condition triggered it
      if (isWeekendTime && isAfterHoursTime) {
        // Both apply - show as combined
        breakdown.weekendSurcharge = surcharge;
        breakdown.afterHoursSurcharge = 0; // Don't double charge
      } else if (isWeekendTime) {
        breakdown.weekendSurcharge = surcharge;
        breakdown.afterHoursSurcharge = 0;
      } else {
        breakdown.weekendSurcharge = 0;
        breakdown.afterHoursSurcharge = surcharge;
      }

      // Combined field for facility_app compatibility
      breakdown.weekendAfterHoursSurcharge = surcharge;

      console.log('💰 Weekend/After-Hours Surcharge Applied:', {
        weekendSurcharge: breakdown.weekendSurcharge,
        afterHoursSurcharge: breakdown.afterHoursSurcharge,
        total: breakdown.weekendAfterHoursSurcharge
      });
    } else {
      console.log('💰 No Weekend/After-Hours Surcharge (regular hours)');
    }
  }

  // Emergency fee
  if (isEmergency) {
    breakdown.emergencyFee = PRICING_CONFIG.PREMIUMS.EMERGENCY;
    breakdown.emergencySurcharge = PRICING_CONFIG.PREMIUMS.EMERGENCY; // For PricingDisplay
  }

  // Holiday surcharge (total trip, not per leg)
  if (holidayInfo && holidayInfo.isHoliday) {
    breakdown.holidaySurcharge = PRICING_CONFIG.PREMIUMS.HOLIDAY_SURCHARGE;
    breakdown.hasHolidaySurcharge = true;
  }

  // Wheelchair rental fee - DISABLED FOR FACILITY APP
  // if (wheelchairType === 'provided') {
  //   breakdown.wheelchairPrice = PRICING_CONFIG.PREMIUMS.WHEELCHAIR_RENTAL;
  // }

  // Calculate subtotal before veteran discount
  const subtotal = breakdown.basePrice +
                   breakdown.roundTripPrice +
                   breakdown.distancePrice +
                   breakdown.countyPrice +
                   breakdown.deadMileagePrice +
                   breakdown.weekendAfterHoursSurcharge +
                   breakdown.emergencyFee +
                   breakdown.holidaySurcharge +
                   breakdown.wheelchairPrice;

  // Apply veteran discount (20%)
  breakdown.veteranDiscount = 0;

  // Final total
  breakdown.total = subtotal - breakdown.veteranDiscount;

  // Round all monetary values to 2 decimal places
  Object.keys(breakdown).forEach(key => {
    if (typeof breakdown[key] === 'number') {
      breakdown[key] = Math.round(breakdown[key] * 100) / 100;
    }
  });

  return breakdown;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined) return '$0.00';
  return `$${amount.toFixed(2)}`;
}

/**
 * Get pricing estimate with full breakdown - Mobile version
 */
export async function getPricingEstimate({
  pickupAddress,
  destinationAddress,
  isRoundTrip = false,
  pickupDateTime,
  wheelchairType = 'no_wheelchair',
  clientType = 'facility',
  additionalPassengers = 0,
  isEmergency = false,
  distance = 0,
  clientWeight = null
}) {
  try {
    console.log('💰 Mobile getPricingEstimate called:', {
      pickupAddress,
      destinationAddress,
      distance,
      isRoundTrip
    });

    // Get county information
    let countyInfo = null;
    if (pickupAddress && destinationAddress) {
      countyInfo = await checkFranklinCountyStatus(pickupAddress, destinationAddress);
      console.log('📍 County Info:', countyInfo);
    }

    // Calculate dead mileage ONLY for 2+ counties out (NO dead mileage for 1 county out)
    // FIXED: Dead mileage calculation
    // One-way: Office → Pickup + Destination → Office
    // Round trip: Office → Pickup + Pickup → Office (after round trip)
    let deadMileage = 0;
    if (pickupAddress && destinationAddress && countyInfo && countyInfo.countiesOut >= 2) {
      // Calculate office to pickup distance
      const toPickupResult = await calculateDeadMileage(pickupAddress);
      const toPickupDistance = toPickupResult.distance;

      if (isRoundTrip) {
        // Round trip: Driver goes Office → Pickup, then after round trip returns Pickup → Office
        // Dead mileage = (Office → Pickup) × 2
        deadMileage = toPickupDistance * 2;
        console.log('🚗 Round Trip Dead Mileage:', {
          pickup: pickupAddress,
          toPickup: toPickupDistance,
          fromPickup: toPickupDistance,
          totalDistance: deadMileage,
          totalPrice: deadMileage * PRICING_CONFIG.DISTANCE.DEAD_MILEAGE
        });
      } else {
        // One-way trip: Office → Pickup + Destination → Office
        // Driver returns from DESTINATION (where they dropped off), not from pickup
        const fromDestinationResult = await calculateDeadMileage(destinationAddress);
        const fromDestinationDistance = fromDestinationResult.distance;

        deadMileage = toPickupDistance + fromDestinationDistance;
        console.log('🚗 One-Way Dead Mileage:', {
          pickup: pickupAddress,
          destination: destinationAddress,
          toPickup: toPickupDistance,
          fromDestination: fromDestinationDistance,
          totalDistance: deadMileage,
          totalPrice: deadMileage * PRICING_CONFIG.DISTANCE.DEAD_MILEAGE
        });
      }
    }

    // Check for holiday
    let holidayInfo = null;
    if (pickupDateTime) {
      const holidayCheck = checkHoliday(pickupDateTime);
      if (holidayCheck.isHoliday) {
        holidayInfo = {
          isHoliday: true,
          surcharge: holidayCheck.surcharge || 100,
          holidayName: holidayCheck.holidayName
        };
      }
    }

    // Calculate pricing with enhanced rate structure
    const pricing = calculateTripPrice({
      isRoundTrip,
      distance,
      pickupDateTime,
      wheelchairType,
      clientType,
      additionalPassengers,
      isEmergency,
      countyInfo,
      clientWeight,
      deadMileage,
      holidayInfo
    });

    return {
      success: true,
      pricing,
      countyInfo,
      deadMileage,
      deadMileageDistance: deadMileage, // Alias for screen component
      holidayInfo,
      summary: {
        tripType: isRoundTrip ? 'Round Trip' : 'One Way',
        distance: distance > 0 ? `${isRoundTrip ? (distance * 2).toFixed(1) : distance.toFixed(1)} miles` : 'Distance not calculated',
        estimatedTotal: formatCurrency(pricing.total),
        isBariatric: pricing.isBariatric || false,
        hasHolidaySurcharge: pricing.hasHolidaySurcharge || false,
        hasDeadMileage: pricing.hasDeadMileage || false
      }
    };
  } catch (error) {
    console.error('Pricing estimate error:', error);
    return {
      success: false,
      error: error.message,
      pricing: null
    };
  }
}
