import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import AppHeader from '../components/AppHeader';

const TripDetailsScreen = ({ route, navigation }) => {
  const { tripId } = route.params;
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTripDetails();

    // Set up real-time subscription
    const subscription = supabase
      .channel(`trip_${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${tripId}`,
        },
        (payload) => {
          setTrip(payload.new);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [tripId]);

  const fetchTripDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single();

      if (error) throw error;
      
      console.log('📊 Trip Details Data:', JSON.stringify(data, null, 2));
      console.log('💰 Pricing Breakdown:', data.pricing_breakdown_data);
      console.log('📏 Distance:', data.distance);
      console.log('💵 Price:', data.price);
      
      setTrip(data);
    } catch (error) {
      console.error('Error fetching trip details:', error);
      Alert.alert('Error', 'Failed to load trip details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleCancelTrip = async () => {
    Alert.alert(
      'Cancel Trip',
      'Are you sure you want to cancel this trip?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('trips')
                .update({ status: 'cancelled' })
                .eq('id', tripId);

              if (error) throw error;

              Alert.alert('Success', 'Trip cancelled successfully');
              navigation.goBack();
            } catch (error) {
              console.error('Error cancelling trip:', error);
              Alert.alert('Error', 'Failed to cancel trip');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#FFA500';
      case 'assigned':
        return '#4A90E2';
      case 'in_progress':
        return '#9B59B6';
      case 'completed':
        return '#27AE60';
      case 'cancelled':
        return '#E74C3C';
      default:
        return '#95A5A6';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'Pending Assignment';
      case 'assigned':
        return 'Driver Assigned';
      case 'in_progress':
        return 'Trip In Progress';
      case 'completed':
        return 'Trip Completed';
      case 'cancelled':
        return 'Trip Cancelled';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5fbfc0" />
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Trip not found</Text>
      </View>
    );
  }

  const pickupDate = new Date(trip.pickup_time);
  const statusColor = getStatusColor(trip.status);

  return (
    <View style={styles.container}>
      <AppHeader />

      <ScrollView style={styles.scrollContainer}>
        <View style={[styles.statusHeader, { backgroundColor: statusColor }]}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.statusHeaderText}>{getStatusText(trip.status)}</Text>
          <View style={styles.backButtonPlaceholder} />
        </View>

        <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip Details</Text>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date:</Text>
            <Text style={styles.detailValue}>{pickupDate.toLocaleDateString()}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Time:</Text>
            <Text style={styles.detailValue}>
              {pickupDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          {trip.is_round_trip && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type:</Text>
              <Text style={[styles.detailValue, styles.roundTripText]}>Round Trip</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Locations</Text>
          <View style={styles.locationCard}>
            <Text style={styles.locationIcon}>📍</Text>
            <View style={styles.locationDetails}>
              <Text style={styles.locationLabel}>Pickup</Text>
              <Text style={styles.locationAddress}>{trip.pickup_address}</Text>
            </View>
          </View>
          <View style={styles.locationCard}>
            <Text style={styles.locationIcon}>🎯</Text>
            <View style={styles.locationDetails}>
              <Text style={styles.locationLabel}>Destination</Text>
              <Text style={styles.locationAddress}>{trip.destination_address}</Text>
            </View>
          </View>
        </View>

        {trip.driver_name && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Driver Information</Text>
            <View style={styles.driverCard}>
              <View style={styles.driverAvatar}>
                <Text style={styles.driverAvatarText}>
                  {trip.driver_name?.charAt(0) || 'D'}
                </Text>
              </View>
              <View style={styles.driverDetails}>
                <Text style={styles.driverName}>{trip.driver_name}</Text>
                {trip.vehicle && <Text style={styles.driverContact}>{trip.vehicle}</Text>}
              </View>
            </View>
          </View>
        )}

        {trip.special_requirements && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Notes</Text>
            <Text style={styles.notesText}>{trip.special_requirements}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trip Information</Text>
          
          {/* Distance */}
          {trip.distance > 0 && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Distance:</Text>
              <Text style={styles.priceValue}>{trip.distance?.toFixed(1)} miles</Text>
            </View>
          )}

          {/* Wheelchair */}
          {trip.wheelchair_type && trip.wheelchair_type !== 'no_wheelchair' && trip.wheelchair_type !== 'none' && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Wheelchair:</Text>
              <Text style={styles.priceValue}>
                {trip.wheelchair_type === 'provided' ? 'CCT Provided' : 
                 trip.wheelchair_type === 'manual' ? 'Manual' :
                 trip.wheelchair_type === 'power' ? 'Power' : 
                 'Required'}
              </Text>
            </View>
          )}

          {/* Round Trip */}
          {trip.is_round_trip && (
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Trip Type:</Text>
              <Text style={styles.priceValue}>Round Trip</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cost Breakdown</Text>
          
          {trip.pricing_breakdown_locked_at && (
            <View style={styles.lockedNotice}>
              <Text style={styles.lockedLabel}>Pricing Locked from Booking</Text>
              <Text style={styles.lockedDate}>
                {new Date(trip.pricing_breakdown_locked_at).toLocaleDateString()}
              </Text>
            </View>
          )}

          {trip.pricing_breakdown_data ? (
            <>
              {/* Base Fare */}
              {trip.pricing_breakdown_data.basePrice > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>
                    Base fare ({trip.pricing_breakdown_data.legs || 1} leg
                    {(trip.pricing_breakdown_data.legs || 1) > 1 ? 's' : ''} @ $
                    {trip.pricing_breakdown_data.baseRatePerLeg || 50}/leg)
                    {trip.pricing_breakdown_data.isBariatric ? ' 🚑' : ''}
                  </Text>
                  <Text style={styles.priceValue}>
                    ${trip.pricing_breakdown_data.basePrice.toFixed(2)}
                  </Text>
                </View>
              )}

              {/* Distance Charge - Check both old and new field names */}
              {(trip.pricing_breakdown_data.tripDistancePrice > 0 || trip.pricing_breakdown_data.distancePrice > 0) && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>
                    Distance charge ({trip.pricing_breakdown_data.isInFranklinCounty !== false ? '$3/mile (Franklin County)' : '$4/mile (Outside Franklin County)'})
                  </Text>
                  <Text style={styles.priceValue}>
                    ${(trip.pricing_breakdown_data.tripDistancePrice || trip.pricing_breakdown_data.distancePrice || 0).toFixed(2)}
                  </Text>
                </View>
              )}

              {/* County Surcharge - Check both field names */}
              {(trip.pricing_breakdown_data.countySurcharge > 0 || trip.pricing_breakdown_data.countyPrice > 0) && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>County surcharge</Text>
                  <Text style={styles.priceValue}>
                    ${(trip.pricing_breakdown_data.countySurcharge || trip.pricing_breakdown_data.countyPrice || 0).toFixed(2)}
                  </Text>
                </View>
              )}

              {/* Dead Mileage */}
              {trip.pricing_breakdown_data.deadMileagePrice > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Dead mileage</Text>
                  <Text style={styles.priceValue}>
                    ${trip.pricing_breakdown_data.deadMileagePrice.toFixed(2)}
                  </Text>
                </View>
              )}

              {/* Weekend Surcharge */}
              {trip.pricing_breakdown_data.weekendSurcharge > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Weekend surcharge</Text>
                  <Text style={styles.priceValue}>
                    ${trip.pricing_breakdown_data.weekendSurcharge.toFixed(2)}
                  </Text>
                </View>
              )}

              {/* After-Hours Surcharge */}
              {trip.pricing_breakdown_data.afterHoursSurcharge > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>After-hours surcharge</Text>
                  <Text style={styles.priceValue}>
                    ${trip.pricing_breakdown_data.afterHoursSurcharge.toFixed(2)}
                  </Text>
                </View>
              )}

              {/* Combined Weekend/After-hours (for old bookings) */}
              {trip.pricing_breakdown_data.weekendAfterHoursSurcharge > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Weekend/After-hours surcharge</Text>
                  <Text style={styles.priceValue}>
                    ${trip.pricing_breakdown_data.weekendAfterHoursSurcharge.toFixed(2)}
                  </Text>
                </View>
              )}

              {/* Emergency Surcharge */}
              {trip.pricing_breakdown_data.emergencySurcharge > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Emergency surcharge</Text>
                  <Text style={styles.priceValue}>
                    ${trip.pricing_breakdown_data.emergencySurcharge.toFixed(2)}
                  </Text>
                </View>
              )}

              {/* Holiday Surcharge */}
              {trip.pricing_breakdown_data.holidaySurcharge > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Holiday surcharge</Text>
                  <Text style={styles.priceValue}>
                    ${trip.pricing_breakdown_data.holidaySurcharge.toFixed(2)}
                  </Text>
                </View>
              )}

              {/* Veteran Discount */}
              {trip.pricing_breakdown_data.veteranDiscount > 0 && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, styles.discountText]}>
                    Veteran discount (20%) 🎖️
                  </Text>
                  <Text style={[styles.priceValue, styles.discountText]}>
                    -${trip.pricing_breakdown_data.veteranDiscount.toFixed(2)}
                  </Text>
                </View>
              )}

              <View style={styles.divider} />

              {/* Total Price */}
              <View style={[styles.priceRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>
                  ${(trip.pricing_breakdown_data.total || trip.price || 0).toFixed(2)}
                </Text>
              </View>
            </>
          ) : (
            // Fallback if no pricing breakdown data
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Price:</Text>
              <Text style={styles.totalValue}>${trip.price?.toFixed(2) || '0.00'}</Text>
            </View>
          )}
        </View>

        {trip.wheelchair_type && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Requirements</Text>
            <View style={styles.requirementItem}>
              <Text style={styles.requirementIcon}>♿</Text>
              <Text style={styles.requirementText}>Wheelchair Accessible Vehicle</Text>
            </View>
            {!trip.client_provides_wheelchair && (
              <View style={styles.requirementItem}>
                <Text style={styles.requirementIcon}>🦽</Text>
                <Text style={styles.requirementText}>Wheelchair Rental Provided</Text>
              </View>
            )}
          </View>
        )}

        {trip.status === 'pending' && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancelTrip}>
            <Text style={styles.cancelButtonText}>Cancel Trip</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 20,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backButtonPlaceholder: {
    width: 44,
  },
  statusHeaderText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 16,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  roundTripText: {
    color: '#2e7d32',
  },
  locationCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  locationIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  locationDetails: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  driverCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#5fbfc0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  driverAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  driverContact: {
    fontSize: 14,
    color: '#666',
  },
  notesText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
  },
  priceValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  discountText: {
    color: '#27AE60',
  },
  lockedNotice: {
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  lockedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 4,
  },
  lockedDate: {
    fontSize: 12,
    color: '#558b2f',
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 12,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 10,
    marginTop: 5,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#5fbfc0',
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  requirementIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  requirementText: {
    fontSize: 14,
    color: '#666',
  },
  cancelButton: {
    backgroundColor: '#E74C3C',
    borderRadius: 8,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
  },
});

export default TripDetailsScreen;
