import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PricingDisplay = ({ 
  pricing, 
  distanceInfo = null, 
  countyInfo = null,
  deadMileageDistance = 0,
  isRoundTrip = false 
}) => {
  if (!pricing) return null;

  // Helper function to safely get number value
  const getNumber = (value) => {
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  // Handle both old and new pricing structure with safe number conversion
  const total = getNumber(pricing.total || pricing.finalPrice);
  const basePrice = getNumber(pricing.basePrice);
  const roundTripPrice = getNumber(pricing.roundTripPrice);
  const totalBasePrice = basePrice + roundTripPrice; // Total base fare (includes round trip if applicable)

  console.log('🔍 PricingDisplay received:', {
    basePrice,
    roundTripPrice,
    totalBasePrice,
    pricingObject: pricing
  });
  const baseRatePerLeg = getNumber(pricing.baseRatePerLeg) || 50;
  const legs = getNumber(pricing.legs) || 1;
  const isBariatric = pricing.isBariatric || false;
  const tripDistancePrice = getNumber(pricing.tripDistancePrice || pricing.distancePrice);
  const deadMileagePrice = getNumber(pricing.deadMileagePrice);
  const countySurcharge = getNumber(pricing.countySurcharge);
  const weekendSurcharge = getNumber(pricing.weekendSurcharge);
  const afterHoursSurcharge = getNumber(pricing.afterHoursSurcharge);
  const emergencySurcharge = getNumber(pricing.emergencySurcharge);
  const holidaySurcharge = getNumber(pricing.holidaySurcharge);
  const veteranDiscount = getNumber(pricing.veteranDiscount);

  // Calculate detailed information for labels
  const tripDistance = distanceInfo?.distance || 0;
  
  // Determine price per mile for distance charge
  const isInFranklinCounty = countyInfo?.isInFranklinCounty !== false;
  const pricePerMile = isInFranklinCounty ? 3 : 4;
  const countyText = isInFranklinCounty ? 'Franklin County' : 'Outside Franklin County';
  
  // Calculate trip distance in miles for display
  const tripDistanceMiles = tripDistancePrice > 0 && pricePerMile > 0 
    ? (tripDistancePrice / (pricePerMile * legs)).toFixed(1)
    : tripDistance.toFixed(1);
  
  // Dead mileage details
  const deadMileageMiles = deadMileageDistance > 0 ? deadMileageDistance.toFixed(1) : 0;
  
  // County surcharge count
  const countiesOut = countyInfo?.countiesOut || 0;
  
  // Combined weekend/after-hours
  const combinedWeekendAfterHours = weekendSurcharge > 0 && afterHoursSurcharge > 0;
  const weekendAfterHoursTotal = weekendSurcharge + afterHoursSurcharge;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Total Amount</Text>
        <Text style={styles.totalAmount}>${total.toFixed(2)}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.breakdown}>
        <Text style={styles.breakdownTitle}>View detailed breakdown</Text>

        {/* Base fare with detailed rate info */}
        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>
            Base fare ({legs} leg{legs > 1 ? 's' : ''} @ ${baseRatePerLeg.toFixed(0)}/leg{isBariatric ? ' (Bariatric rate)' : ''})
          </Text>
          <Text style={styles.breakdownValue}>${totalBasePrice.toFixed(2)}</Text>
        </View>

        {/* Distance charge with detailed calculation */}
        {tripDistancePrice > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>
              Distance charge (${pricePerMile}/mile ({countyText}))
            </Text>
            <Text style={styles.breakdownValue}>${tripDistancePrice.toFixed(2)}</Text>
          </View>
        )}

        {/* County surcharge with count */}
        {countySurcharge > 0 && countiesOut > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>
              County surcharge ({countiesOut} {countiesOut === 1 ? 'county' : 'counties'} @ $50/county)
            </Text>
            <Text style={styles.breakdownValue}>${countySurcharge.toFixed(2)}</Text>
          </View>
        )}

        {/* Dead mileage with detailed calculation */}
        {deadMileagePrice > 0 && deadMileageMiles > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>
              Dead mileage ({deadMileageMiles} mi @ $4/mile)
            </Text>
            <Text style={styles.breakdownValue}>${deadMileagePrice.toFixed(2)}</Text>
          </View>
        )}

        {/* Combined Weekend/After-hours */}
        {combinedWeekendAfterHours && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Weekend/After-hours surcharge</Text>
            <Text style={styles.breakdownValue}>${weekendAfterHoursTotal.toFixed(2)}</Text>
          </View>
        )}

        {/* Separate Weekend surcharge */}
        {weekendSurcharge > 0 && !combinedWeekendAfterHours && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Weekend surcharge</Text>
            <Text style={styles.breakdownValue}>${weekendSurcharge.toFixed(2)}</Text>
          </View>
        )}

        {/* Separate After-hours surcharge */}
        {afterHoursSurcharge > 0 && !combinedWeekendAfterHours && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>After-hours surcharge</Text>
            <Text style={styles.breakdownValue}>${afterHoursSurcharge.toFixed(2)}</Text>
          </View>
        )}

        {/* Emergency fee */}
        {emergencySurcharge > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Emergency fee</Text>
            <Text style={styles.breakdownValue}>${emergencySurcharge.toFixed(2)}</Text>
          </View>
        )}

        {/* Holiday surcharge */}
        {holidaySurcharge > 0 && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Holiday surcharge</Text>
            <Text style={styles.breakdownValue}>${holidaySurcharge.toFixed(2)}</Text>
          </View>
        )}

        {/* Veteran discount */}
        {veteranDiscount > 0 && (
          <>
            <View style={styles.divider} />
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, styles.discountLabel]}>
                Veteran discount (20%)
              </Text>
              <Text style={[styles.breakdownValue, styles.discountValue]}>
                -${veteranDiscount.toFixed(2)}
              </Text>
            </View>
          </>
        )}

        <View style={styles.divider} />

        <View style={styles.breakdownRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginVertical: 20,
    borderWidth: 2,
    borderColor: '#5fbfc0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#5fbfc0',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  breakdown: {
    marginTop: 10,
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingRight: 5,
  },
  breakdownLabel: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  breakdownValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    minWidth: 80,
    textAlign: 'right',
  },
  discountLabel: {
    color: '#27AE60',
  },
  discountValue: {
    color: '#27AE60',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5fbfc0',
  },
});

export default PricingDisplay;
