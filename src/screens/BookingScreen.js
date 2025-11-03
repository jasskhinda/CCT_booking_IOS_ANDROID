import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { supabase } from '../lib/supabase';
import { calculateEnhancedTripPrice } from '../lib/enhancedPricing';
import WheelchairSelection from '../components/WheelchairSelection';
import PricingDisplay from '../components/PricingDisplay';

const BookingScreen = ({ navigation }) => {
  const [pickupAddress, setPickupAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [pickupDate, setPickupDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notes, setNotes] = useState('');

  // Wheelchair state
  const [wheelchairType, setWheelchairType] = useState('none');
  const [clientProvidesWheelchair, setClientProvidesWheelchair] = useState(true);

  // Trip options
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [returnDate, setReturnDate] = useState(new Date());
  const [showReturnDatePicker, setShowReturnDatePicker] = useState(false);
  const [showReturnTimePicker, setShowReturnTimePicker] = useState(false);
  const [isVeteran, setIsVeteran] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);

  // Pricing state
  const [estimatedPrice, setEstimatedPrice] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [loading, setLoading] = useState(false);

  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setPickupDate(selectedDate);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(pickupDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setPickupDate(newDate);
    }
  };

  const handleReturnDateChange = (event, selectedDate) => {
    setShowReturnDatePicker(false);
    if (selectedDate) {
      setReturnDate(selectedDate);
    }
  };

  const handleReturnTimeChange = (event, selectedTime) => {
    setShowReturnTimePicker(false);
    if (selectedTime) {
      const newDate = new Date(returnDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setReturnDate(newDate);
    }
  };

  const calculatePrice = async () => {
    if (!pickupAddress || !destinationAddress) {
      Alert.alert('Missing Information', 'Please enter both pickup and destination addresses');
      return;
    }

    setCalculating(true);

    try {
      const price = await calculateEnhancedTripPrice({
        pickupAddress,
        destinationAddress,
        pickupDate,
        isRoundTrip,
        wheelchairType,
        clientProvidesWheelchair,
        isVeteran,
        isEmergency,
      });

      setEstimatedPrice(price);
    } catch (error) {
      console.error('Error calculating price:', error);
      Alert.alert('Calculation Error', 'Could not calculate price. Please try again.');
    } finally {
      setCalculating(false);
    }
  };

  const handleBooking = async () => {
    if (!pickupAddress || !destinationAddress) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    if (!estimatedPrice) {
      Alert.alert('Price Required', 'Please calculate the price first');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const tripData = {
        client_id: user.id,
        pickup_location: pickupAddress,
        destination_location: destinationAddress,
        pickup_date: pickupDate.toISOString(),
        notes: notes || null,
        wheelchair_needed: wheelchairType !== 'none',
        wheelchair_type: wheelchairType,
        client_provides_wheelchair: clientProvidesWheelchair,
        is_round_trip: isRoundTrip,
        return_date: isRoundTrip ? returnDate.toISOString() : null,
        is_veteran: isVeteran,
        is_emergency: isEmergency,
        base_price: estimatedPrice.basePrice,
        distance_price: estimatedPrice.distancePrice,
        premiums_total: estimatedPrice.premiumsTotal,
        discount_amount: estimatedPrice.discountAmount,
        final_price: estimatedPrice.finalPrice,
        distance_miles: estimatedPrice.distance,
        estimated_duration: estimatedPrice.duration,
        status: 'pending',
        payment_status: 'pending',
      };

      const { data, error} = await supabase
        .from('trips')
        .insert([tripData])
        .select()
        .single();

      if (error) throw error;

      Alert.alert(
        'Success!',
        'Your trip has been booked successfully!',
        [
          {
            text: 'View Trips',
            onPress: () => navigation.navigate('Trips'),
          },
          {
            text: 'Book Another',
            onPress: () => {
              setPickupAddress('');
              setDestinationAddress('');
              setEstimatedPrice(null);
              setNotes('');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error booking trip:', error);
      Alert.alert('Booking Failed', 'Failed to book trip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Book a Ride</Text>
        <Text style={styles.headerSubtitle}>Compassionate transportation when you need it</Text>
      </View>

      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.form}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trip Details</Text>

            <Text style={styles.label}>Pickup Location *</Text>
            <View style={styles.autocompleteContainer}>
              <GooglePlacesAutocomplete
                placeholder="Enter pickup address"
                onPress={(data) => {
                  setPickupAddress(data.description);
                }}
                query={{
                  key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
                  language: 'en',
                  components: 'country:us',
                }}
                styles={{
                  textInput: styles.input,
                  container: { flex: 0 },
                  listView: styles.listView,
                }}
                enablePoweredByContainer={false}
                fetchDetails={true}
                minLength={2}
                debounce={400}
                predefinedPlaces={[]}
                textInputProps={{
                  onFocus: () => {},
                  onBlur: () => {},
                  onChangeText: () => {},
                  clearButtonMode: "never",
                }}
              />
            </View>

            <Text style={styles.label}>Destination *</Text>
            <View style={styles.autocompleteContainer}>
              <GooglePlacesAutocomplete
                placeholder="Enter destination address"
                onPress={(data) => {
                  setDestinationAddress(data.description);
                }}
                query={{
                  key: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
                  language: 'en',
                  components: 'country:us',
                }}
                styles={{
                  textInput: styles.input,
                  container: { flex: 0 },
                  listView: styles.listView,
                }}
                enablePoweredByContainer={false}
                fetchDetails={true}
                minLength={2}
                debounce={400}
                predefinedPlaces={[]}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Pickup Date & Time *</Text>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateTimeText}>
                  {pickupDate.toLocaleDateString()}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.dateTimeText}>
                  {pickupDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={pickupDate}
                mode="date"
                display="default"
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                value={pickupDate}
                mode="time"
                display="default"
                onChange={handleTimeChange}
              />
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trip Options</Text>

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => setIsRoundTrip(!isRoundTrip)}
            >
              <View style={styles.checkbox}>
                {isRoundTrip && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Round Trip</Text>
                <Text style={styles.optionDesc}>Book return trip at the same time</Text>
              </View>
            </TouchableOpacity>

            {isRoundTrip && (
              <View style={styles.returnDateSection}>
                <Text style={styles.label}>Return Date & Time *</Text>
                <View style={styles.dateTimeRow}>
                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => setShowReturnDatePicker(true)}
                  >
                    <Text style={styles.dateTimeText}>
                      {returnDate.toLocaleDateString()}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => setShowReturnTimePicker(true)}
                  >
                    <Text style={styles.dateTimeText}>
                      {returnDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                </View>

                {showReturnDatePicker && (
                  <DateTimePicker
                    value={returnDate}
                    mode="date"
                    display="default"
                    onChange={handleReturnDateChange}
                    minimumDate={pickupDate}
                  />
                )}

                {showReturnTimePicker && (
                  <DateTimePicker
                    value={returnDate}
                    mode="time"
                    display="default"
                    onChange={handleReturnTimeChange}
                  />
                )}
              </View>
            )}

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => setIsEmergency(!isEmergency)}
            >
              <View style={styles.checkbox}>
                {isEmergency && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Emergency Trip (+$40)</Text>
                <Text style={styles.optionDesc}>Urgent medical appointment</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionRow}
              onPress={() => setIsVeteran(!isVeteran)}
            >
              <View style={styles.checkbox}>
                {isVeteran && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Veteran Discount (20% off)</Text>
                <Text style={styles.optionDesc}>Available for all veterans</Text>
              </View>
            </TouchableOpacity>
          </View>

          <WheelchairSelection
            wheelchairType={wheelchairType}
            setWheelchairType={setWheelchairType}
            clientProvidesWheelchair={clientProvidesWheelchair}
            setClientProvidesWheelchair={setClientProvidesWheelchair}
          />

          <View style={styles.section}>
            <Text style={styles.label}>Additional Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any special requirements or instructions"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
            />
          </View>

          <TouchableOpacity
            style={[styles.calculateButton, calculating && styles.calculateButtonDisabled]}
            onPress={calculatePrice}
            disabled={calculating}
          >
            {calculating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.calculateButtonText}>Calculate Estimated Fare</Text>
            )}
          </TouchableOpacity>

          {estimatedPrice && <PricingDisplay pricing={estimatedPrice} />}

          {estimatedPrice && (
            <View style={styles.policySection}>
              <Text style={styles.policyTitle}>Important Information</Text>

              <View style={styles.policyItem}>
                <Text style={styles.policyIcon}>💳</Text>
                <Text style={styles.policyText}>
                  Payment will be collected after trip completion
                </Text>
              </View>

              <View style={styles.policyItem}>
                <Text style={styles.policyIcon}>🔔</Text>
                <Text style={styles.policyText}>
                  You'll receive notifications when a driver is assigned
                </Text>
              </View>

              <View style={styles.policyItem}>
                <Text style={styles.policyIcon}>❌</Text>
                <Text style={styles.policyText}>
                  Free cancellation up to 24 hours before pickup
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.bookButton,
              (loading || !estimatedPrice) && styles.bookButtonDisabled,
            ]}
            onPress={handleBooking}
            disabled={loading || !estimatedPrice}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.bookButtonText}>
                Confirm Booking • ${estimatedPrice?.finalPrice.toFixed(2) || '0.00'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.bottomSpacer} />
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
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#5fbfc0',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
  form: {
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  autocompleteContainer: {
    zIndex: 1,
    marginBottom: 15,
  },
  listView: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 5,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  dateTimeButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  dateTimeText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#5fbfc0',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkmark: {
    color: '#5fbfc0',
    fontSize: 16,
    fontWeight: 'bold',
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  optionDesc: {
    fontSize: 13,
    color: '#666',
  },
  returnDateSection: {
    marginTop: 10,
    marginLeft: 36,
    paddingLeft: 15,
    borderLeftWidth: 3,
    borderLeftColor: '#5fbfc0',
  },
  calculateButton: {
    backgroundColor: '#4aa5a6',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calculateButtonDisabled: {
    backgroundColor: '#a8dfe0',
  },
  calculateButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  policySection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginTop: 20,
  },
  policyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  policyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  policyIcon: {
    fontSize: 18,
    marginRight: 10,
    marginTop: 1,
  },
  policyText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  bookButton: {
    backgroundColor: '#5fbfc0',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  bookButtonDisabled: {
    backgroundColor: '#a8dfe0',
    opacity: 0.6,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomSpacer: {
    height: 40,
  },
});

export default BookingScreen;
