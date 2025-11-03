import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

const WheelchairSelection = ({
  wheelchairType,
  setWheelchairType,
  clientProvidesWheelchair,
  setClientProvidesWheelchair
}) => {
  const wheelchairTypes = [
    { value: 'none', label: 'No Wheelchair Needed', icon: '🚶' },
    { value: 'manual', label: 'Manual Wheelchair', icon: '♿' },
    { value: 'power', label: 'Power Wheelchair', icon: '🦽' },
    { value: 'transport', label: 'Transport Chair', icon: '🪑' },
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Wheelchair Requirements</Text>

      <View style={styles.optionsGrid}>
        {wheelchairTypes.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={[
              styles.optionCard,
              wheelchairType === type.value && styles.optionCardSelected,
            ]}
            onPress={() => setWheelchairType(type.value)}
          >
            <Text style={styles.optionIcon}>{type.icon}</Text>
            <Text style={[
              styles.optionLabel,
              wheelchairType === type.value && styles.optionLabelSelected,
            ]}>
              {type.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {wheelchairType !== 'none' && (
        <View style={styles.rentalSection}>
          <Text style={styles.rentalTitle}>Wheelchair Provider</Text>

          <TouchableOpacity
            style={[
              styles.rentalOption,
              clientProvidesWheelchair && styles.rentalOptionSelected,
            ]}
            onPress={() => setClientProvidesWheelchair(true)}
          >
            <View style={styles.radioOuter}>
              {clientProvidesWheelchair && <View style={styles.radioInner} />}
            </View>
            <View style={styles.rentalOptionText}>
              <Text style={styles.rentalOptionTitle}>I'll bring my own</Text>
              <Text style={styles.rentalOptionDesc}>No additional charge</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.rentalOption,
              !clientProvidesWheelchair && styles.rentalOptionSelected,
            ]}
            onPress={() => setClientProvidesWheelchair(false)}
          >
            <View style={styles.radioOuter}>
              {!clientProvidesWheelchair && <View style={styles.radioInner} />}
            </View>
            <View style={styles.rentalOptionText}>
              <Text style={styles.rentalOptionTitle}>CCT will provide</Text>
              <Text style={styles.rentalOptionDesc}>+$25 rental fee</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  optionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  optionCardSelected: {
    borderColor: '#5fbfc0',
    backgroundColor: '#f0f9f9',
  },
  optionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    fontWeight: '600',
  },
  optionLabelSelected: {
    color: '#5fbfc0',
    fontWeight: 'bold',
  },
  rentalSection: {
    marginTop: 15,
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
  },
  rentalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  rentalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#ddd',
  },
  rentalOptionSelected: {
    borderColor: '#5fbfc0',
    backgroundColor: '#f0f9f9',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#5fbfc0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#5fbfc0',
  },
  rentalOptionText: {
    flex: 1,
  },
  rentalOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  rentalOptionDesc: {
    fontSize: 13,
    color: '#666',
  },
});

export default WheelchairSelection;
