/**
 * Enhanced Pricing Calculator for CCT Booking Mobile
 * Matches web app pricing logic exactly
 */

export const PRICING_CONFIG = {
  BASE_RATES: {
    STANDARD: 50, // $50 per leg (under 300 lbs)
    BARIATRIC: 150, // $150 per leg (300+ lbs)
  },
  WEIGHT: {
    BARIATRIC_THRESHOLD: 300, // 300+ lbs = bariatric
  },
  DISTANCE: {
    FRANKLIN_COUNTY: 3.0, // $3 per mile inside Franklin County
    OUTSIDE_FRANKLIN: 4.0, // $4 per mile outside Franklin County
  },
  OFFICE_LOCATION: '597 Executive Campus Dr, Westerville, OH 43082, USA',
  PREMIUMS: {
    WEEKEND_AFTER_HOURS: 40, // Before 8am or after 6pm, weekends
    EMERGENCY: 40, // Emergency trip fee
    WHEELCHAIR_RENTAL: 25, // Wheelchair rental fee
    MULTI_COUNTY: 50, // $50 if trip crosses 2+ counties
    HOLIDAY: 100, // $100 for holidays
  },
  DISCOUNTS: {
    VETERAN: 0.2, // 20% veteran discount
  },
  HOURS: {
    AFTER_HOURS_START: 18, // 6pm
    AFTER_HOURS_END: 8, // 8am
  },
  HOLIDAYS: [
    '01-01', // New Year's Day
    '07-04', // Independence Day
    '12-25', // Christmas
    '11-28', // Thanksgiving (approximate - 4th Thursday of November)
  ],
};

/**
 * Calculate distance using Google Maps Distance Matrix API
 */
export async function calculateDistance(origin, destination) {
  try {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
      origin
    )}&destinations=${encodeURIComponent(destination)}&key=${apiKey}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.rows[0]?.elements[0]?.status === 'OK') {
      const element = data.rows[0].elements[0];
      const distanceInMeters = element.distance.value;
      const distanceInMiles = distanceInMeters * 0.000621371; // Convert to miles
      const duration = element.duration.text;

      return {
        distance: distanceInMiles,
        duration: duration,
        distanceText: element.distance.text,
      };
    }

    // Fallback if API fails
    return {
      distance: 10,
      duration: '~30 min',
      distanceText: '10 mi',
    };
  } catch (error) {
    console.error('Error calculating distance:', error);
    // Fallback distance
    return {
      distance: 10,
      duration: '~30 min',
      distanceText: '10 mi',
    };
  }
}

/**
 * Check if address is in Franklin County
 */
function isInFranklinCounty(address) {
  const franklinCities = [
    'columbus',
    'dublin',
    'westerville',
    'gahanna',
    'reynoldsburg',
    'grove city',
    'hilliard',
    'upper arlington',
    'bexley',
    'whitehall',
    'worthington',
    'grandview heights',
    'canal winchester',
    'groveport',
    'new albany',
    'powell',
  ];

  const addressLower = address.toLowerCase();
  return franklinCities.some((city) => addressLower.includes(city));
}

/**
 * Count number of counties in trip (simplified - checks if both addresses in Franklin)
 */
function countCounties(pickupAddress, destinationAddress) {
  const pickupInFranklin = isInFranklinCounty(pickupAddress);
  const destInFranklin = isInFranklinCounty(destinationAddress);

  // If both in Franklin = 1 county
  // If one outside Franklin = 2+ counties
  if (pickupInFranklin && destInFranklin) {
    return 1;
  }
  return 2;
}

/**
 * Check if date is a holiday
 */
function isHoliday(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateString = `${month}-${day}`;

  return PRICING_CONFIG.HOLIDAYS.includes(dateString);
}

/**
 * Check if time is after hours
 */
function isAfterHours(date) {
  const hour = date.getHours();
  const day = date.getDay();

  // Weekend (Saturday = 6, Sunday = 0)
  if (day === 0 || day === 6) {
    return true;
  }

  // Weekday after hours (before 8am or after 6pm)
  if (
    hour < PRICING_CONFIG.HOURS.AFTER_HOURS_END ||
    hour >= PRICING_CONFIG.HOURS.AFTER_HOURS_START
  ) {
    return true;
  }

  return false;
}

/**
 * Calculate complete trip price with all details
 */
export async function calculateEnhancedTripPrice({
  pickupAddress,
  destinationAddress,
  pickupDate,
  isRoundTrip = false,
  wheelchairType = 'none',
  clientProvidesWheelchair = true,
  isVeteran = false,
  isEmergency = false,
  clientWeight = 250, // Default 250 lbs
}) {
  try {
    // Calculate main trip distance
    const tripDistanceData = await calculateDistance(pickupAddress, destinationAddress);
    const tripDistance = tripDistanceData.distance;
    const duration = tripDistanceData.duration;

    // Determine number of legs
    const legs = isRoundTrip ? 2 : 1;

    // Determine if bariatric (300+ lbs)
    const isBariatric = clientWeight >= PRICING_CONFIG.WEIGHT.BARIATRIC_THRESHOLD;
    const baseRatePerLeg = isBariatric
      ? PRICING_CONFIG.BASE_RATES.BARIATRIC
      : PRICING_CONFIG.BASE_RATES.STANDARD;
    const basePrice = baseRatePerLeg * legs;

    // Determine price per mile
    const inFranklinCounty =
      isInFranklinCounty(pickupAddress) && isInFranklinCounty(destinationAddress);
    const pricePerMile = inFranklinCounty
      ? PRICING_CONFIG.DISTANCE.FRANKLIN_COUNTY
      : PRICING_CONFIG.DISTANCE.OUTSIDE_FRANKLIN;

    // Calculate trip distance price
    const tripDistancePrice = tripDistance * pricePerMile * legs;

    // Calculate dead mileage
    let deadMileagePrice = 0;
    let deadMileageDistance = 0;

    if (isRoundTrip) {
      // Round trip: Only office→pickup and back
      const officeToPickup = await calculateDistance(
        PRICING_CONFIG.OFFICE_LOCATION,
        pickupAddress
      );
      deadMileageDistance = officeToPickup.distance * 2; // Office→Pickup + Pickup→Office
      deadMileagePrice = deadMileageDistance * pricePerMile;
    } else {
      // One-way: Office→Pickup + Destination→Office
      const officeToPickup = await calculateDistance(
        PRICING_CONFIG.OFFICE_LOCATION,
        pickupAddress
      );
      const destinationToOffice = await calculateDistance(
        destinationAddress,
        PRICING_CONFIG.OFFICE_LOCATION
      );
      deadMileageDistance = officeToPickup.distance + destinationToOffice.distance;
      deadMileagePrice = deadMileageDistance * pricePerMile;
    }

    // Total distance price (trip + dead mileage)
    const distancePrice = tripDistancePrice + deadMileagePrice;

    // Calculate premiums
    let premiumsTotal = 0;
    const premiumsBreakdown = [];

    // Multi-county surcharge
    const countyCount = countCounties(pickupAddress, destinationAddress);
    if (countyCount >= 2) {
      premiumsTotal += PRICING_CONFIG.PREMIUMS.MULTI_COUNTY;
      premiumsBreakdown.push({
        type: 'Multi-County Fee',
        amount: PRICING_CONFIG.PREMIUMS.MULTI_COUNTY,
      });
    }

    // Holiday surcharge
    if (isHoliday(pickupDate)) {
      premiumsTotal += PRICING_CONFIG.PREMIUMS.HOLIDAY;
      premiumsBreakdown.push({
        type: 'Holiday Surcharge',
        amount: PRICING_CONFIG.PREMIUMS.HOLIDAY,
      });
    }

    // Weekend/After hours premium
    if (isAfterHours(pickupDate)) {
      premiumsTotal += PRICING_CONFIG.PREMIUMS.WEEKEND_AFTER_HOURS;
      premiumsBreakdown.push({
        type: 'Weekend/After Hours',
        amount: PRICING_CONFIG.PREMIUMS.WEEKEND_AFTER_HOURS,
      });
    }

    // Emergency premium
    if (isEmergency) {
      premiumsTotal += PRICING_CONFIG.PREMIUMS.EMERGENCY;
      premiumsBreakdown.push({
        type: 'Emergency Trip',
        amount: PRICING_CONFIG.PREMIUMS.EMERGENCY,
      });
    }

    // Wheelchair rental premium
    if (wheelchairType !== 'none' && !clientProvidesWheelchair) {
      premiumsTotal += PRICING_CONFIG.PREMIUMS.WHEELCHAIR_RENTAL;
      premiumsBreakdown.push({
        type: 'Wheelchair Rental',
        amount: PRICING_CONFIG.PREMIUMS.WHEELCHAIR_RENTAL,
      });
    }

    // Calculate subtotal before discounts
    const subtotal = basePrice + distancePrice + premiumsTotal;

    // Calculate discounts
    let discountAmount = 0;
    if (isVeteran) {
      discountAmount = subtotal * PRICING_CONFIG.DISCOUNTS.VETERAN;
    }

    // Calculate final price
    const finalPrice = subtotal - discountAmount;

    return {
      basePrice,
      baseRatePerLeg,
      isBariatric,
      clientWeight,
      tripDistance,
      tripDistancePrice,
      deadMileageDistance,
      deadMileagePrice,
      distancePrice,
      duration,
      distanceText: tripDistanceData.distanceText,
      premiumsTotal,
      premiumsBreakdown,
      subtotal,
      discountAmount,
      finalPrice,
      legs,
      inFranklinCounty,
      pricePerMile,
      countyCount,
    };
  } catch (error) {
    console.error('Error calculating enhanced trip price:', error);
    throw error;
  }
}

/**
 * Format price for display
 */
export function formatPrice(price) {
  return `$${price.toFixed(2)}`;
}
