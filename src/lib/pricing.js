/**
 * Pricing Calculator for CCT Booking Mobile
 * Simplified version for mobile app
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
 * Estimate distance between two addresses
 * In a real app, you would use Google Maps Distance Matrix API
 */
function estimateDistance(pickupAddress, destinationAddress) {
  // This is a simplified estimation
  // In production, integrate with Google Maps Distance Matrix API
  // For now, return a default value
  return 10; // miles
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
  if (hour < PRICING_CONFIG.HOURS.AFTER_HOURS_END || hour >= PRICING_CONFIG.HOURS.AFTER_HOURS_START) {
    return true;
  }

  return false;
}

/**
 * Calculate trip price
 */
export async function calculateTripPrice({
  pickupAddress,
  destinationAddress,
  pickupDate,
  isRoundTrip = false,
  wheelchairNeeded = false,
  isVeteran = false,
  isEmergency = false,
}) {
  try {
    // Calculate distance (simplified - should use Google Maps API)
    const distance = estimateDistance(pickupAddress, destinationAddress);

    // Calculate base price (per leg)
    const legs = isRoundTrip ? 2 : 1;
    const basePrice = PRICING_CONFIG.BASE_RATES.PER_LEG * legs;

    // Calculate distance price
    // For simplicity, assuming Franklin County
    const pricePerMile = PRICING_CONFIG.DISTANCE.FRANKLIN_COUNTY;
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
        type: 'Emergency',
        amount: PRICING_CONFIG.PREMIUMS.EMERGENCY,
      });
    }

    // Wheelchair rental premium
    if (wheelchairNeeded) {
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
      premiumsTotal,
      premiumsBreakdown,
      subtotal,
      discountAmount,
      finalPrice,
      legs,
    };
  } catch (error) {
    console.error('Error calculating trip price:', error);
    throw error;
  }
}

/**
 * Format price for display
 */
export function formatPrice(price) {
  return `$${price.toFixed(2)}`;
}
