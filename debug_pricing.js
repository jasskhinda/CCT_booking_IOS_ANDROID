/**
 * Debug script to test pricing calculation for Pickerington issue
 */

// Import the pricing functions
import { getPricingEstimate, checkFranklinCountyStatus } from './src/lib/pricing.js';

// Test addresses
const testPickup = 'Dublin, OH';
const testDestination = 'Pickerington, OH'; // This should be Fairfield County

async function debugPricingIssue() {
  console.log('🔍 Debugging Pickerington pricing issue...\n');
  
  // 1. Test county detection
  console.log('1. Testing county detection:');
  try {
    const countyInfo = await checkFranklinCountyStatus(testPickup, testDestination);
    console.log('County Info:', countyInfo);
    console.log(`Pickup County: ${countyInfo.pickupCounty}`);
    console.log(`Destination County: ${countyInfo.destinationCounty}`);
    console.log(`Is in Franklin County: ${countyInfo.isInFranklinCounty}`);
    console.log(`Counties Out: ${countyInfo.countiesOut}\n`);
  } catch (error) {
    console.error('County detection error:', error);
  }

  // 2. Test full pricing calculation
  console.log('2. Testing full pricing calculation:');
  try {
    const pricingResult = await getPricingEstimate({
      pickupAddress: testPickup,
      destinationAddress: testDestination,
      isRoundTrip: false,
      pickupDateTime: new Date('2025-01-11T10:00:00'), // Saturday morning
      clientWeight: 250,
      isEmergency: false,
      isVeteran: false
    });

    if (pricingResult.success) {
      console.log('Pricing Success!');
      console.log('Distance Info:', pricingResult.distanceInfo);
      console.log('County Info:', pricingResult.countyInfo);
      console.log('Dead Mileage Distance:', pricingResult.deadMileageDistance);
      console.log('\nPricing Breakdown:');
      console.log(pricingResult.pricing);
    } else {
      console.error('Pricing Error:', pricingResult.error);
    }
  } catch (error) {
    console.error('Full pricing calculation error:', error);
  }
}

// Run the debug
debugPricingIssue().catch(console.error);
