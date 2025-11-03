import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { supabase } from '../lib/supabase';
import { calculateTripPrice } from '../lib/pricing';

const BookingScreen = ({ navigation }) => {
  const [pickupAddress, setPickupAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [pickupDate, setPickupDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [wheelchairNeeded, setWheelchairNeeded] = useState(false);
  const [clientProvidesWheelchair, setClientProvidesWheelchair] = useState(true);
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [returnDate, setReturnDate] = useState(new Date());
  const [showReturnDatePicker, setShowReturnDatePicker] = useState(false);
  const [showReturnTimePicker, setShowReturnTimePicker] = useState(false);
  const [isVeteran, setIsVeteran] = useState(false);
  const [estimatedPrice, setEstimatedPrice] = useState(null);
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
      Alert.alert('Error', 'Please enter both pickup and destination addresses');
      return;
    }

    try {
      const price = await calculateTripPrice({
        pickupAddress,
        destinationAddress,
        pickupDate,
        isRoundTrip,
        wheelchairNeeded: wheelchairNeeded && !clientProvidesWheelchair,
        isVeteran,
      });
      setEstimatedPrice(price);
    } catch (error) {
      console.error('Error calculating price:', error);
      Alert.alert('Error', 'Could not calculate price. Please try again.');
    }
  };

  const handleBooking = async () => {
    if (!pickupAddress || !destinationAddress) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!estimatedPrice) {
      Alert.alert('Error', 'Please calculate the price first');
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
        wheelchair_needed: wheelchairNeeded,
        client_provides_wheelchair: clientProvidesWheelchair,
        is_round_trip: isRoundTrip,
        return_date: isRoundTrip ? returnDate.toISOString() : null,
        is_veteran: isVeteran,
        base_price: estimatedPrice.basePrice,
        distance_price: estimatedPrice.distancePrice,
        premiums_total: estimatedPrice.premiumsTotal,
        discount_amount: estimatedPrice.discountAmount,
        final_price: estimatedPrice.finalPrice,
        status: 'pending',
        payment_status: 'pending',
      };

      const { data, error } = await supabase
        .from('trips')
        .insert([tripData])
        .select()
        .single();

      if (error) throw error;

      Alert.alert(
        'Success',
        'Your trip has been booked successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Navigate to payment or trips screen
              navigation.navigate('Trips');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error booking trip:', error);
      Alert.alert('Error', 'Failed to book trip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Book a Ride</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>📍</Text>
          <Text style={styles.infoText}>
            Enter complete addresses including street, city, and state
          </Text>
        </View>

        <Text style={styles.label}>Pickup Location *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter full pickup address (e.g., 123 Main St, Columbus, OH)"
          value={pickupAddress}
          onChangeText={setPickupAddress}
          multiline
          numberOfLines={2}
          autoCapitalize="words"
          autoCorrect={false}
        />

        <Text style={styles.label}>Destination *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter full destination address"
          value={destinationAddress}
          onChangeText={setDestinationAddress}
          multiline
          numberOfLines={2}
          autoCapitalize="words"
          autoCorrect={false}
        />

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

        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setIsRoundTrip(!isRoundTrip)}
          >
            <View style={[styles.checkboxBox, isRoundTrip && styles.checkboxBoxChecked]}>
              {isRoundTrip && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Round Trip</Text>
          </TouchableOpacity>
        </View>

        {isRoundTrip && (
          <>
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
          </>
        )}

        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setWheelchairNeeded(!wheelchairNeeded)}
          >
            <View style={[styles.checkboxBox, wheelchairNeeded && styles.checkboxBoxChecked]}>
              {wheelchairNeeded && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Wheelchair Needed</Text>
          </TouchableOpacity>
        </View>

        {wheelchairNeeded && (
          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setClientProvidesWheelchair(!clientProvidesWheelchair)}
            >
              <View style={[styles.checkboxBox, clientProvidesWheelchair && styles.checkboxBoxChecked]}>
                {clientProvidesWheelchair && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>I will provide my own wheelchair</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.checkboxContainer}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => setIsVeteran(!isVeteran)}
          >
            <View style={[styles.checkboxBox, isVeteran && styles.checkboxBoxChecked]}>
              {isVeteran && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>I am a veteran (20% discount)</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Additional Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Any special requirements or notes"
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity
          style={styles.calculateButton}
          onPress={calculatePrice}
        >
          <Text style={styles.calculateButtonText}>Calculate Price</Text>
        </TouchableOpacity>

        {estimatedPrice && (
          <View style={styles.priceCard}>
            <Text style={styles.priceTitle}>Estimated Price</Text>
            <Text style={styles.priceAmount}>${estimatedPrice.finalPrice.toFixed(2)}</Text>
            <View style={styles.priceBreakdown}>
              <Text style={styles.priceBreakdownItem}>Base Rate: ${estimatedPrice.basePrice.toFixed(2)}</Text>
              <Text style={styles.priceBreakdownItem}>Distance: ${estimatedPrice.distancePrice.toFixed(2)}</Text>
              {estimatedPrice.premiumsTotal > 0 && (
                <Text style={styles.priceBreakdownItem}>Premiums: ${estimatedPrice.premiumsTotal.toFixed(2)}</Text>
              )}
              {estimatedPrice.discountAmount > 0 && (
                <Text style={styles.priceBreakdownItem}>Discount: -${estimatedPrice.discountAmount.toFixed(2)}</Text>
              )}
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.bookButton, loading && styles.bookButtonDisabled]}
          onPress={handleBooking}
          disabled={loading || !estimatedPrice}
        >
          <Text style={styles.bookButtonText}>
            {loading ? 'Booking...' : 'Book Trip'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#5fbfc0',
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  form: {
    padding: 20,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateTimeButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateTimeText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  checkboxContainer: {
    marginVertical: 10,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#5fbfc0',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: '#5fbfc0',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#333',
  },
  calculateButton: {
    backgroundColor: '#4aa5a6',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  calculateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  priceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#5fbfc0',
  },
  priceTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#5fbfc0',
    marginBottom: 15,
  },
  priceBreakdown: {
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 15,
  },
  priceBreakdownItem: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  bookButton: {
    backgroundColor: '#5fbfc0',
    borderRadius: 8,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  bookButtonDisabled: {
    backgroundColor: '#a8dfe0',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default BookingScreen;
