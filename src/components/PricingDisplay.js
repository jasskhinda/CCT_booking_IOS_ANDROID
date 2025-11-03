import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PricingDisplay = ({ pricing }) => {
  if (!pricing) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Estimated Fare</Text>
        <Text style={styles.totalAmount}>${pricing.finalPrice.toFixed(2)}</Text>
      </View>

      {pricing.distance && (
        <View style={styles.infoRow}>
          <Text style={styles.infoIcon}>📏</Text>
          <Text style={styles.infoText}>
            {pricing.distance.toFixed(1)} miles • {pricing.duration || '~30 min'}
          </Text>
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.breakdown}>
        <Text style={styles.breakdownTitle}>Price Breakdown</Text>

        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Base Rate ({pricing.legs} leg{pricing.legs > 1 ? 's' : ''})</Text>
          <Text style={styles.breakdownValue}>${pricing.basePrice.toFixed(2)}</Text>
        </View>

        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>Distance ({pricing.distance?.toFixed(1)} mi)</Text>
          <Text style={styles.breakdownValue}>${pricing.distancePrice.toFixed(2)}</Text>
        </View>

        {pricing.premiumsBreakdown?.map((premium, index) => (
          <View key={index} style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>{premium.type}</Text>
            <Text style={styles.breakdownValue}>${premium.amount.toFixed(2)}</Text>
          </View>
        ))}

        {pricing.premiumsTotal > 0 && !pricing.premiumsBreakdown && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Additional Fees</Text>
            <Text style={styles.breakdownValue}>${pricing.premiumsTotal.toFixed(2)}</Text>
          </View>
        )}

        {pricing.discountAmount > 0 && (
          <>
            <View style={styles.divider} />
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, styles.discountLabel]}>
                Veteran Discount (20%)
              </Text>
              <Text style={[styles.breakdownValue, styles.discountValue]}>
                -${pricing.discountAmount.toFixed(2)}
              </Text>
            </View>
          </>
        )}

        <View style={styles.divider} />

        <View style={styles.breakdownRow}>
          <Text style={styles.totalLabel}>Total Fare</Text>
          <Text style={styles.totalValue}>${pricing.finalPrice.toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.notice}>
        <Text style={styles.noticeIcon}>ℹ️</Text>
        <Text style={styles.noticeText}>
          Final fare may vary slightly based on actual route and traffic conditions
        </Text>
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  infoIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
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
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#666',
  },
  breakdownValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
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
  notice: {
    flexDirection: 'row',
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    padding: 12,
    marginTop: 15,
  },
  noticeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#856404',
    lineHeight: 18,
  },
});

export default PricingDisplay;
