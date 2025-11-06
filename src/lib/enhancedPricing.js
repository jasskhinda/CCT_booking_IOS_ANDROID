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
  OFFICE_LOCATION: '5050 Blazer Pkwy # 100, Dublin, OH 43017',
  PREMIUMS: {
    WEEKEND: 40, // Saturday/Sunday
    AFTER_HOURS: 40, // Before 8am or after 5pm weekdays
    EMERGENCY: 40, // Emergency trip fee
    WHEELCHAIR_RENTAL: 25, // Wheelchair rental fee
    MULTI_COUNTY: 50, // $50 if trip crosses 2+ counties
    HOLIDAY: 100, // $100 for holidays
  },
  DISCOUNTS: {
    VETERAN: 0.2, // 20% veteran discount
  },
  HOURS: {
    AFTER_HOURS_START: 17, // 5pm
    AFTER_HOURS_END: 8, // 8am
  },
  HOLIDAYS: [
    '01-01', // New Year's Day
    '12-31', // New Year's Eve
    // Easter - dynamic, need to calculate
    // Memorial Day - Last Monday in May
    '07-04', // Independence Day
    // Labor Day - First Monday in September
    // Thanksgiving - Fourth Thursday in November
    '12-24', // Christmas Eve
    '12-25', // Christmas Day
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
 * Get county name from address
 */
function getCountyFromAddress(address) {
  const addressLower = address.toLowerCase();

  // Franklin County cities
  const franklinCities = [
    'columbus', 'dublin', 'westerville', 'gahanna', 'reynoldsburg',
    'grove city', 'hilliard', 'upper arlington', 'bexley', 'whitehall',
    'worthington', 'grandview heights', 'canal winchester', 'groveport',
    'new albany', 'powell'
  ];

  // Adjacent counties (1 county out)
  const adjacentCounties = {
    // Delaware County
    'delaware': 'delaware',
    'lewis center': 'delaware',
    'sunbury': 'delaware',

    // Licking County
    'newark': 'licking',
    'heath': 'licking',
    'granville': 'licking',
    'pataskala': 'licking',

    // Pickaway County
    'circleville': 'pickaway',
    'ashville': 'pickaway',

    // Madison County
    'london': 'madison',
    'plain city': 'madison',

    // Union County
    'marysville': 'union',
    'richwood': 'union',
  };

  // 2+ counties out
  const farCounties = {
    // Fairfield County (2 out)
    'lancaster': 'fairfield',
    'pickerington': 'fairfield',
    'baltimore': 'fairfield',
    'canal winchester': 'fairfield', // Can be Franklin or Fairfield

    // Knox County (2 out)
    'mount vernon': 'knox',

    // Morrow County (2 out)
    'mount gilead': 'morrow',
  };

  // Check Franklin County
  if (franklinCities.some(city => addressLower.includes(city))) {
    return { county: 'franklin', distance: 0 };
  }

  // Check adjacent counties (1 out)
  for (const [city, county] of Object.entries(adjacentCounties)) {
    if (addressLower.includes(city)) {
      return { county, distance: 1 };
    }
  }

  // Check far counties (2+ out)
  for (const [city, county] of Object.entries(farCounties)) {
    if (addressLower.includes(city)) {
      return { county, distance: 2 };
    }
  }

  // Default: if we can't determine, assume adjacent (1 out) to be safe
  return { county: 'unknown', distance: 1 };
}

/**
 * Count number of counties out from Franklin County
 * Returns the maximum distance from Franklin County for either pickup or destination
 */
function countCounties(pickupAddress, destinationAddress) {
  const pickupCounty = getCountyFromAddress(pickupAddress);
  const destCounty = getCountyFromAddress(destinationAddress);

  // Return the maximum distance (if either is 2+ out, entire trip is 2+ out)
  return Math.max(pickupCounty.distance, destCounty.distance);
}

/**
 * Calculate Easter Sunday for a given year
 */
function getEasterDate(year) {
  const f = Math.floor;
  const G = year % 19;
  const C = f(year / 100);
  const H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30;
  const I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11));
  const J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7;
  const L = I - J;
  const month = 3 + f((L + 40) / 44);
  const day = L + 28 - 31 * f(month / 4);
  return new Date(year, month - 1, day);
}

/**
 * Get Memorial Day (Last Monday in May)
 */
function getMemorialDay(year) {
  const lastDay = new Date(year, 5, 0); // Last day of May
  const day = lastDay.getDate();
  const dayOfWeek = lastDay.getDay();
  const lastMonday = day - ((dayOfWeek + 6) % 7);
  return new Date(year, 4, lastMonday);
}

/**
 * Get Labor Day (First Monday in September)
 */
function getLaborDay(year) {
  const firstDay = new Date(year, 8, 1); // Sept 1
  const dayOfWeek = firstDay.getDay();
  const firstMonday = dayOfWeek === 1 ? 1 : 1 + ((8 - dayOfWeek) % 7);
  return new Date(year, 8, firstMonday);
}

/**
 * Get Thanksgiving (Fourth Thursday in November)
 */
function getThanksgiving(year) {
  const firstDay = new Date(year, 10, 1); // Nov 1
  const dayOfWeek = firstDay.getDay();
  const firstThursday = dayOfWeek <= 4 ? 5 - dayOfWeek : 12 - dayOfWeek;
  const fourthThursday = firstThursday + 21;
  return new Date(year, 10, fourthThursday);
}

/**
 * Check if date is a holiday
 */
function isHoliday(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateString = `${month}-${day}`;
  const year = date.getFullYear();

  // Check static holidays
  if (PRICING_CONFIG.HOLIDAYS.includes(dateString)) {
    return true;
  }

  // Check dynamic holidays
  const easter = getEasterDate(year);
  const memorialDay = getMemorialDay(year);
  const laborDay = getLaborDay(year);
  const thanksgiving = getThanksgiving(year);

  const sameDate = (d1, d2) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

  return (
    sameDate(date, easter) ||
    sameDate(date, memorialDay) ||
    sameDate(date, laborDay) ||
    sameDate(date, thanksgiving)
  );
}

/**
 * Check if date is weekend
 */
function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Check if time is after hours (weekday before 8am or after 5pm)
 */
function isAfterHours(date) {
  const hour = date.getHours();
  const day = date.getDay();

  // Only check after hours for weekdays
  if (day !== 0 && day !== 6) {
    // Weekday after hours (before 8am or after 5pm)
    if (
      hour < PRICING_CONFIG.HOURS.AFTER_HOURS_END ||
      hour >= PRICING_CONFIG.HOURS.AFTER_HOURS_START
    ) {
      return true;
    }
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

    // Determine county distance from Franklin County
    const countyDistance = countCounties(pickupAddress, destinationAddress);

    // Calculate dead mileage (only for 2+ counties out)
    let deadMileagePrice = 0;
    let deadMileageDistance = 0;

    if (countyDistance >= 2) {
      // Check if destination is the office (special case - no return dead mileage)
      const destIsOffice = destinationAddress.toLowerCase().includes('5050 blazer') ||
                          destinationAddress.toLowerCase().includes('dublin');

      if (isRoundTrip) {
        // Round trip: Only office→pickup × 2
        const officeToPickup = await calculateDistance(
          PRICING_CONFIG.OFFICE_LOCATION,
          pickupAddress
        );
        deadMileageDistance = officeToPickup.distance * 2; // Office→Pickup + Pickup→Office
        deadMileagePrice = deadMileageDistance * pricePerMile;
      } else if (destIsOffice) {
        // One-way ending at office: Only office→pickup
        const officeToPickup = await calculateDistance(
          PRICING_CONFIG.OFFICE_LOCATION,
          pickupAddress
        );
        deadMileageDistance = officeToPickup.distance;
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
    }

    // Total distance price (trip + dead mileage)
    const distancePrice = tripDistancePrice + deadMileagePrice;

    // Calculate premiums
    let premiumsTotal = 0;
    const premiumsBreakdown = [];

    // Multi-county surcharge (only for 2+ counties)
    if (countyDistance >= 2) {
      premiumsTotal += PRICING_CONFIG.PREMIUMS.MULTI_COUNTY;
      premiumsBreakdown.push({
        type: 'County Surcharge (2+ counties)',
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

    // Weekend premium (can stack with after-hours)
    if (isWeekend(pickupDate)) {
      premiumsTotal += PRICING_CONFIG.PREMIUMS.WEEKEND;
      premiumsBreakdown.push({
        type: 'Weekend Surcharge',
        amount: PRICING_CONFIG.PREMIUMS.WEEKEND,
      });
    }

    // After hours premium (can stack with weekend)
    if (isAfterHours(pickupDate)) {
      premiumsTotal += PRICING_CONFIG.PREMIUMS.AFTER_HOURS;
      premiumsBreakdown.push({
        type: 'After Hours Surcharge',
        amount: PRICING_CONFIG.PREMIUMS.AFTER_HOURS,
      });
    }

    // Emergency premium (can stack with all others)
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
      countyDistance,
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
