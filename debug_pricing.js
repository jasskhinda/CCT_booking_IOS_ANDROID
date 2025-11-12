/**
 * Debug script to test county overrides for booking_mobile
 * Tests: 21 Franklin County patterns + 6 Lancaster patterns
 * Priority: Lancaster > Franklin > Google API
 */

// Import the pricing functions
import { getPricingEstimate, checkFranklinCountyStatus } from './src/lib/pricing.js';

// Test scenarios
const testScenarios = [
  {
    name: 'Pickerington (Franklin Override)',
    pickup: 'Dublin, OH',
    destination: 'Pickerington, OH',
    expectedCountiesOut: 0,
    expectedInFranklin: true,
    expectedRate: '$3/mile'
  },
  {
    name: 'Lancaster (Lancaster Override)',
    pickup: 'Dublin, OH',
    destination: 'Lancaster, OH',
    expectedCountiesOut: 2,
    expectedInFranklin: false,
    expectedRate: '$4/mile'
  },
  {
    name: 'Canal Winchester (Franklin Override)',
    pickup: 'Dublin, OH',
    destination: 'Canal Winchester, OH',
    expectedCountiesOut: 0,
    expectedInFranklin: true,
    expectedRate: '$3/mile'
  },
  {
    name: 'Columbus to Westerville (Both Franklin)',
    pickup: 'Columbus, OH',
    destination: 'Westerville, OH',
    expectedCountiesOut: 0,
    expectedInFranklin: true,
    expectedRate: '$3/mile'
  },
  {
    name: 'Lancaster with zip 43130',
    pickup: 'Dublin, OH',
    destination: '43130',
    expectedCountiesOut: 2,
    expectedInFranklin: false,
    expectedRate: '$4/mile'
  }
];

async function testCountyOverride(scenario) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🧪 TEST: ${scenario.name}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`📍 Route: ${scenario.pickup} → ${scenario.destination}`);
  console.log(`✅ Expected: ${scenario.expectedCountiesOut} counties out, ${scenario.expectedRate}\n`);

  try {
    // 1. Test county detection
    console.log('1️⃣ County Detection:');
    const countyInfo = await checkFranklinCountyStatus(scenario.pickup, scenario.destination);
    console.log(`   Pickup County: ${countyInfo.pickupCounty}`);
    console.log(`   Destination County: ${countyInfo.destinationCounty}`);
    console.log(`   In Franklin County: ${countyInfo.isInFranklinCounty}`);
    console.log(`   Counties Out: ${countyInfo.countiesOut}`);

    // Validate
    const countyMatch = countyInfo.countiesOut === scenario.expectedCountiesOut;
    const franklinMatch = countyInfo.isInFranklinCounty === scenario.expectedInFranklin;
    console.log(`   ${countyMatch && franklinMatch ? '✅ PASS' : '❌ FAIL'}`);

    // 2. Test full pricing
    console.log('\n2️⃣ Full Pricing Calculation:');
    const pricingResult = await getPricingEstimate({
      pickupAddress: scenario.pickup,
      destinationAddress: scenario.destination,
      isRoundTrip: false,
      pickupDateTime: new Date('2025-01-13T10:00:00'), // Monday 10 AM (no surcharges)
      clientWeight: 250,
      isEmergency: false,
      isVeteran: false,
      preCalculatedDistance: 25 // 25 miles for testing
    });

    if (pricingResult.success) {
      const pricing = pricingResult.pricing;
      const ratePerMile = scenario.expectedInFranklin ? 3 : 4;
      const expectedDistancePrice = 25 * ratePerMile;

      console.log(`   Base Price: $${pricing.basePrice.toFixed(2)} (Expected: $50.00)`);
      console.log(`   Distance Price: $${pricing.tripDistancePrice.toFixed(2)} (Expected: $${expectedDistancePrice.toFixed(2)})`);
      console.log(`   County Surcharge: $${pricing.countySurcharge.toFixed(2)} (Expected: $${scenario.expectedCountiesOut >= 2 ? '50.00' : '0.00'})`);
      console.log(`   Dead Mileage: $${pricing.deadMileagePrice.toFixed(2)} (Expected: ${scenario.expectedCountiesOut >= 2 ? '>$0.00' : '$0.00'})`);
      console.log(`   Total: $${pricing.total.toFixed(2)}`);

      const priceMatch = Math.abs(pricing.tripDistancePrice - expectedDistancePrice) < 0.01;
      const surchargeMatch = scenario.expectedCountiesOut >= 2 ? pricing.countySurcharge === 50 : pricing.countySurcharge === 0;
      const deadMileageMatch = scenario.expectedCountiesOut >= 2 ? pricing.deadMileagePrice > 0 : pricing.deadMileagePrice === 0;

      console.log(`   ${priceMatch && surchargeMatch && deadMileageMatch ? '✅ PASS' : '❌ FAIL'}`);
    } else {
      console.error('   ❌ FAIL - Pricing Error:', pricingResult.error);
    }
  } catch (error) {
    console.error('   ❌ FAIL - Error:', error.message);
  }
}

async function runAllTests() {
  console.log('\n🚀 BOOKING_MOBILE COUNTY OVERRIDE TESTS');
  console.log('Testing 21 Franklin County + 6 Lancaster patterns');
  console.log('Priority: Lancaster > Franklin > Google API\n');

  for (const scenario of testScenarios) {
    await testCountyOverride(scenario);
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ All tests completed!');
  console.log(`${'='.repeat(80)}\n`);
}

// Run all tests
runAllTests().catch(console.error);
