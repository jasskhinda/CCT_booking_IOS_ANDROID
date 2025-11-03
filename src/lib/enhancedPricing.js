/**
 * Enhanced Pricing Calculator for CCT Booking Mobile
 * Matches web app pricing logic exactly
 */

export const PRICING_CONFIG = {
  BASE_RATES: {
    PER_LEG: 50, // $50 per leg
  },
  DISTANCE: {
    FRANKLIN_COUNTY: 3.0, // $3 per mile inside Franklin County
    OUTSIDE_FRANKLIN: 4.0, // $4 per mile outside Franklin County
  },
  PREMIUMS: {
    WEEKEND_AFTER_HOURS: 40, // Before 8am or after 6pm, weekends
    EMERGENCY: 40, // Emergency trip fee
    WHEELCHAIR_RENTAL: 25, // Wheelchair rental fee
    COUNTY_SURCHARGE: 50, // $50 per county outside Franklin
  },
  DISCOUNTS: {
    VETERAN: 0.2, // 20% veteran discount
  },
  HOURS: {
    AFTER_HOURS_START: 18, // 6pm
    AFTER_HOURS_END: 8, // 8am
  },
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
}) {
  try {
    // Calculate distance and duration
    const distanceData = await calculateDistance(pickupAddress, destinationAddress);
    const distance = distanceData.distance;
    const duration = distanceData.duration;

    // Determine if in Franklin County
    const inFranklinCounty =
      isInFranklinCounty(pickupAddress) && isInFranklinCounty(destinationAddress);

    // Calculate base price (per leg)
    const legs = isRoundTrip ? 2 : 1;
    const basePrice = PRICING_CONFIG.BASE_RATES.PER_LEG * legs;

    // Calculate distance price
    const pricePerMile = inFranklinCounty
      ? PRICING_CONFIG.DISTANCE.FRANKLIN_COUNTY
      : PRICING_CONFIG.DISTANCE.OUTSIDE_FRANKLIN;
    const distancePrice = distance * pricePerMile * legs;

    // Calculate premiums
    let premiumsTotal = 0;
    const premiumsBreakdown = [];

    // After hours premium
    if (isAfterHours(pickupDate)) {
      premiumsTotal += PRICING_CONFIG.PREMIUMS.WEEKEND_AFTER_HOURS;
      premiumsBreakdown.push({
        type: 'After Hours/Weekend',
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

    // Wheelchair rental premium (only if CCT provides and wheelchair is needed)
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
      distancePrice,
      distance,
      duration,
      distanceText: distanceData.distanceText,
      premiumsTotal,
      premiumsBreakdown,
      subtotal,
      discountAmount,
      finalPrice,
      legs,
      inFranklinCounty,
      pricePerMile,
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
