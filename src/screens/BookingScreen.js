import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'react-native-calendars';
import { supabase } from '../lib/supabase';
import { calculateEnhancedTripPrice } from '../lib/enhancedPricing';
import { getPricingEstimate } from '../lib/pricing';
import WheelchairSelection from '../components/WheelchairSelection';
import PricingDisplay from '../components/PricingDisplay';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

const BookingScreen = ({ navigation }) => {
  const mapRef = useRef(null);

  // Address and location states
  const [pickupAddress, setPickupAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [pickupCoords, setPickupCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);

  const [pickupDate, setPickupDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notes, setNotes] = useState('');

  // Address autocomplete modal states
  const [showAddressInput, setShowAddressInput] = useState(false);
  const [addressInputType, setAddressInputType] = useState('pickup');
  const [addressInput, setAddressInput] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Wheelchair state
  const [wheelchairType, setWheelchairType] = useState('none');
  const [clientProvidesWheelchair, setClientProvidesWheelchair] = useState(true);

  // Trip options
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [returnDate, setReturnDate] = useState(new Date());
  const [showReturnDatePicker, setShowReturnDatePicker] = useState(false);
  const [showReturnCalendar, setShowReturnCalendar] = useState(false);
  const [showReturnTimePicker, setShowReturnTimePicker] = useState(false);
  const [isVeteran, setIsVeteran] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
  const [clientWeight, setClientWeight] = useState('');

  // Pricing state
  const [estimatedPrice, setEstimatedPrice] = useState(null);
  const [pricingBreakdown, setPricingBreakdown] = useState(null);
  const [pricingResult, setPricingResult] = useState(null); // Store complete pricing result with distanceInfo
  const [calculating, setCalculating] = useState(false);
  const [loading, setLoading] = useState(false);

  const [profile, setProfile] = useState(null);
  
  // Payment method states
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState(null);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);

  useEffect(() => {
    fetchProfile();
    fetchPaymentMethods();
  }, []);

  // Auto-calculate price when required fields change - USING NEW PRICING LOGIC
  useEffect(() => {
    const autoCalculatePrice = async () => {
      // Check if all required fields are filled
      if (!pickupAddress || !destinationAddress || !clientWeight) {
        setEstimatedPrice(null);
        setPricingBreakdown(null);
        return;
      }

      const weight = parseFloat(clientWeight);
      if (weight < 50 || weight > 1000) {
        setEstimatedPrice(null);
        setPricingBreakdown(null);
        return;
      }

      setCalculating(true);
      try {
        console.log('🚀 Mobile: Using NEW pricing calculation');
        
        // Use NEW pricing calculation
        const pricingResult = await getPricingEstimate({
          pickupAddress,
          destinationAddress,
          isRoundTrip,
          pickupDateTime: pickupDate,
          clientWeight: weight,
          isEmergency,
          isVeteran,
        });
        
        if (pricingResult.success && pricingResult.pricing) {
          console.log('💰 Mobile: Complete pricing breakdown:', pricingResult.pricing);
          setEstimatedPrice({
            finalPrice: pricingResult.pricing.total,
            distance: pricingResult.distanceInfo?.distance || 0,
            breakdown: pricingResult.pricing
          });
          setPricingBreakdown(pricingResult.pricing);
          setPricingResult(pricingResult); // Store complete result with distanceInfo
        } else {
          console.error('❌ Mobile: Error calculating pricing:', pricingResult.error);
          // Fallback to old calculation
          const price = await calculateEnhancedTripPrice({
            pickupAddress,
            destinationAddress,
            pickupDate,
            isRoundTrip,
            wheelchairType,
            clientProvidesWheelchair,
            isVeteran,
            isEmergency,
            clientWeight: weight,
          });
          setEstimatedPrice(price);
          setPricingBreakdown(null);
          setPricingResult(null);
        }
      } catch (error) {
        console.error('Error calculating price:', error);
        setEstimatedPrice(null);
        setPricingBreakdown(null);
        setPricingResult(null);
      } finally {
        setCalculating(false);
      }
    };

    autoCalculatePrice();
  }, [
    pickupAddress,
    destinationAddress,
    pickupDate,
    isRoundTrip,
    wheelchairType,
    clientProvidesWheelchair,
    isVeteran,
    isEmergency,
    clientWeight,
  ]);

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
        // Auto-populate weight from profile if available
        if (data?.weight) {
          setClientWeight(data.weight.toString());
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      setLoadingPaymentMethods(true);
      console.log('Fetching payment methods for booking...');
      
      // Import the helper function
      const { getPaymentMethodsMobile } = require('../lib/stripeHelpers');
      const data = await getPaymentMethodsMobile();
      
      console.log('Payment methods fetched:', data.paymentMethods.length);
      setPaymentMethods(data.paymentMethods);
      setDefaultPaymentMethod(data.defaultPaymentMethod);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      Alert.alert('Payment Method Error', 'Failed to load payment methods. Please check your internet connection and try again.');
    } finally {
      setLoadingPaymentMethods(false);
    }
  };

  // Fetch address suggestions using Google Places API via proxy
  const fetchAddressSuggestions = async (input) => {
    if (!input || input.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    setIsLoadingSuggestions(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      console.log('Fetching address suggestions for:', input);
      // Use production URL
      const autocompleteUrl = 'https://book.compassionatecaretransportation.com';
      const response = await fetch(
        `${autocompleteUrl}/api/maps/autocomplete?input=${encodeURIComponent(input)}`,
        {
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error('Autocomplete API error:', response.status);
        setAddressSuggestions([]);
        return;
      }

      const data = await response.json();
      console.log('Got autocomplete response:', data.status, data.predictions?.length, 'suggestions');

      if (data.status === 'OK' && data.predictions) {
        setAddressSuggestions(data.predictions);
      } else {
        console.log('Autocomplete API response:', data);
        setAddressSuggestions([]);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.error('Address autocomplete timed out after 10 seconds');
      } else {
        console.error('Error fetching suggestions:', error);
      }
      setAddressSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Get place details to retrieve coordinates via proxy
  const getPlaceDetails = async (placeId) => {
    try {
      // Use production URL
      const autocompleteUrl = 'https://book.compassionatecaretransportation.com';
      const response = await fetch(
        `${autocompleteUrl}/api/maps/place-details?place_id=${placeId}`
      );
      const data = await response.json();

      if (data.status === 'OK' && data.result) {
        return {
          address: data.result.formatted_address,
          coords: {
            latitude: data.result.geometry.location.lat,
            longitude: data.result.geometry.location.lng,
          },
        };
      }
      return null;
    } catch (error) {
      console.error('Error getting place details:', error);
      return null;
    }
  };

  // Handle selecting an address from suggestions
  const handleAddressSelect = async (suggestion) => {
    const details = await getPlaceDetails(suggestion.place_id);
    if (!details) {
      Alert.alert('Error', 'Could not get address details. Please try again.');
      return;
    }

    if (addressInputType === 'pickup') {
      setPickupAddress(details.address);
      setPickupCoords(details.coords);
    } else {
      setDestinationAddress(details.address);
      setDestinationCoords(details.coords);
    }

    setAddressInput('');
    setAddressSuggestions([]);
    setShowAddressInput(false);

    // Fit map to show both points if both are set
    if (addressInputType === 'pickup' && destinationCoords) {
      fitMapToRoute(details.coords, destinationCoords);
    } else if (addressInputType === 'destination' && pickupCoords) {
      fitMapToRoute(pickupCoords, details.coords);
    }
  };

  const fitMapToRoute = (start, end) => {
    if (mapRef.current && start && end) {
      mapRef.current.fitToCoordinates([start, end], {
        edgePadding: { top: 100, right: 100, bottom: 300, left: 100 },
        animated: true,
      });
    }
  };

  const handleCalendarDateSelect = (day) => {
    // Parse date in local timezone to avoid off-by-one errors
    const [year, month, dayNum] = day.dateString.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, dayNum);
    selectedDate.setHours(pickupDate.getHours());
    selectedDate.setMinutes(pickupDate.getMinutes());
    setPickupDate(selectedDate);
    setShowCalendar(false);
  };

  const handleDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || pickupDate;
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (event.type === 'set') {
      setPickupDate(currentDate);
      if (Platform.OS === 'android') {
        setShowDatePicker(false);
      }
    } else if (event.type === 'dismissed') {
      setShowDatePicker(false);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (event.type === 'set' && selectedTime) {
      const newDate = new Date(pickupDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setPickupDate(newDate);
      if (Platform.OS === 'android') {
        setShowTimePicker(false);
      }
    } else if (event.type === 'dismissed') {
      setShowTimePicker(false);
    }
  };

  const handleReturnCalendarDateSelect = (day) => {
    // Parse date in local timezone to avoid off-by-one errors
    const [year, month, dayNum] = day.dateString.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, dayNum);
    selectedDate.setHours(returnDate.getHours());
    selectedDate.setMinutes(returnDate.getMinutes());
    setReturnDate(selectedDate);
    setShowReturnCalendar(false);
  };

  const handleReturnDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || returnDate;
    if (Platform.OS === 'android') {
      setShowReturnDatePicker(false);
    }
    if (event.type === 'set') {
      setReturnDate(currentDate);
      if (Platform.OS === 'android') {
        setShowReturnDatePicker(false);
      }
    } else if (event.type === 'dismissed') {
      setShowReturnDatePicker(false);
    }
  };

  const handleReturnTimeChange = (event, selectedTime) => {
    if (Platform.OS === 'android') {
      setShowReturnTimePicker(false);
    }
    if (event.type === 'set' && selectedTime) {
      const newDate = new Date(returnDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setReturnDate(newDate);
      if (Platform.OS === 'android') {
        setShowReturnTimePicker(false);
      }
    } else if (event.type === 'dismissed') {
      setShowReturnTimePicker(false);
    }
  };


  const handleBooking = async () => {
    if (!pickupAddress || !destinationAddress) {
      Alert.alert('Missing Information', 'Please fill in all required fields');
      return;
    }

    if (!estimatedPrice) {
      Alert.alert('Price Required', 'Please wait for the fare to be calculated');
      return;
    }

    // Validate payment method exists
    if (!defaultPaymentMethod) {
      Alert.alert(
        'Payment Method Required',
        'You need to add a payment method before booking. Would you like to add one now?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Add Payment Method',
            onPress: () => navigation.navigate('PaymentMethods'),
          },
        ]
      );
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const tripData = {
        user_id: user.id,
        pickup_address: pickupAddress,
        destination_address: destinationAddress,
        pickup_time: pickupDate.toISOString(),
        return_pickup_time: isRoundTrip ? returnDate.toISOString() : null,
        special_requirements: notes || null,
        wheelchair_type: wheelchairType !== 'none' ? wheelchairType : null,
        is_round_trip: isRoundTrip,
        price: estimatedPrice.finalPrice,
        distance: estimatedPrice.distance,
        status: 'pending',
        payment_method_id: defaultPaymentMethod, // Include payment method
        // 💰 NEW: Save complete pricing breakdown for cost transparency
        pricing_breakdown_data: pricingBreakdown ? {
          basePrice: pricingBreakdown.basePrice,
          baseRatePerLeg: pricingBreakdown.baseRatePerLeg,
          isBariatric: pricingBreakdown.isBariatric,
          legs: pricingBreakdown.legs,
          tripDistancePrice: pricingBreakdown.tripDistancePrice,
          deadMileagePrice: pricingBreakdown.deadMileagePrice,
          distancePrice: pricingBreakdown.distancePrice,
          countySurcharge: pricingBreakdown.countySurcharge,
          weekendSurcharge: pricingBreakdown.weekendSurcharge,
          afterHoursSurcharge: pricingBreakdown.afterHoursSurcharge,
          emergencySurcharge: pricingBreakdown.emergencySurcharge,
          holidaySurcharge: pricingBreakdown.holidaySurcharge,
          veteranDiscount: pricingBreakdown.veteranDiscount,
          total: pricingBreakdown.total
        } : null,
        pricing_breakdown_total: pricingBreakdown?.total || estimatedPrice.finalPrice,
        pricing_breakdown_locked_at: pricingBreakdown ? new Date().toISOString() : null,
      };

      const { data, error} = await supabase
        .from('trips')
        .insert([tripData])
        .select()
        .single();

      if (error) throw error;

      Alert.alert(
        'Booking Submitted!',
        'Your trip request has been submitted for approval. You will be notified once approved. Payment will only be processed after trip completion.',
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
      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: 39.9612,
          longitude: -82.9988,
          latitudeDelta: 0.5,
          longitudeDelta: 0.5,
        }}
      >
        {pickupCoords && (
          <Marker
            coordinate={pickupCoords}
            title="Pickup"
            pinColor="green"
          />
        )}
        {destinationCoords && (
          <Marker
            coordinate={destinationCoords}
            title="Destination"
            pinColor="red"
          />
        )}
        {pickupCoords && destinationCoords && (
          <MapViewDirections
            origin={pickupCoords}
            destination={destinationCoords}
            apikey={GOOGLE_MAPS_API_KEY}
            strokeWidth={4}
            strokeColor="#5fbfc0"
            onReady={(result) => {
              fitMapToRoute(pickupCoords, destinationCoords);
            }}
          />
        )}
      </MapView>

      {/* Bottom Sheet with Form */}
      <View style={styles.bottomSheet}>
        <View style={styles.handle} />

        <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trip Details</Text>

              {/* Pickup Location */}
              <TouchableOpacity
                style={styles.addressInputCard}
                onPress={() => {
                  setAddressInputType('pickup');
                  setShowAddressInput(true);
                }}
              >
                <Text style={styles.label}>Pickup Location *</Text>
                {pickupAddress ? (
                  <Text style={styles.addressValue} numberOfLines={2}>{pickupAddress}</Text>
                ) : (
                  <Text style={styles.placeholder}>Tap to enter pickup address</Text>
                )}
              </TouchableOpacity>

              {/* Destination */}
              <TouchableOpacity
                style={styles.addressInputCard}
                onPress={() => {
                  setAddressInputType('destination');
                  setShowAddressInput(true);
                }}
              >
                <Text style={styles.label}>Destination *</Text>
                {destinationAddress ? (
                  <Text style={styles.addressValue} numberOfLines={2}>{destinationAddress}</Text>
                ) : (
                  <Text style={styles.placeholder}>Tap to enter destination address</Text>
                )}
              </TouchableOpacity>

            <Text style={styles.label}>
              Client Weight (lbs) *
              {profile?.weight && <Text style={styles.labelNote}> (from profile)</Text>}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter weight in pounds"
              value={clientWeight}
              onChangeText={setClientWeight}
              keyboardType="numeric"
            />
            {!clientWeight && (
              <Text style={styles.infoNote}>
                💡 Tip: Set your weight in Profile settings to auto-fill this field
              </Text>
            )}
            {clientWeight && parseFloat(clientWeight) >= 400 && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  🚫 Cannot accommodate - Over 400 lbs weight limit
                </Text>
              </View>
            )}
            {clientWeight && parseFloat(clientWeight) >= 300 && parseFloat(clientWeight) < 400 && (
              <Text style={styles.weightNote}>
                ⚠️ Bariatric rate applies ($150 per leg)
              </Text>
            )}
            {clientWeight && parseFloat(clientWeight) < 300 && (
              <Text style={styles.weightNote}>
                Standard rate ($50 per leg)
              </Text>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Pickup Date & Time *</Text>
            <View style={styles.dateTimeRow}>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowCalendar(true)}
              >
                <Text style={styles.dateTimeIcon}>📅</Text>
                <Text style={styles.dateTimeText}>
                  {pickupDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Text style={styles.dateTimeIcon}>🕐</Text>
                <Text style={styles.dateTimeText}>
                  {pickupDate.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  })}
                </Text>
              </TouchableOpacity>
            </View>

            {showTimePicker && (
              <DateTimePicker
                value={pickupDate}
                mode="time"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
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
                    onPress={() => setShowReturnCalendar(true)}
                  >
                    <Text style={styles.dateTimeIcon}>📅</Text>
                    <Text style={styles.dateTimeText}>
                      {returnDate.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.dateTimeButton}
                    onPress={() => setShowReturnTimePicker(true)}
                  >
                    <Text style={styles.dateTimeIcon}>🕐</Text>
                    <Text style={styles.dateTimeText}>
                      {returnDate.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </Text>
                  </TouchableOpacity>
                </View>

                {showReturnTimePicker && (
                  <DateTimePicker
                    value={returnDate}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
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

          {calculating && (
            <View style={styles.calculatingContainer}>
              <ActivityIndicator color="#5fbfc0" size="small" />
              <Text style={styles.calculatingText}>Calculating fare...</Text>
            </View>
          )}

          {pricingBreakdown && (
            <PricingDisplay 
              pricing={pricingBreakdown} 
              distanceInfo={pricingResult?.distanceInfo}
              countyInfo={pricingResult?.countyInfo}
              deadMileageDistance={pricingResult?.deadMileageDistance}
              isRoundTrip={isRoundTrip}
            />
          )}

          {/* Payment Method Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            
            {loadingPaymentMethods ? (
              <View style={styles.paymentMethodCard}>
                <ActivityIndicator color="#5fbfc0" size="small" />
                <Text style={styles.paymentLoadingText}>Loading payment methods...</Text>
              </View>
            ) : defaultPaymentMethod && paymentMethods.length > 0 ? (
              <View style={styles.paymentMethodCard}>
                <View style={styles.paymentMethodInfo}>
                  <Text style={styles.paymentMethodIcon}>💳</Text>
                  <View style={styles.paymentMethodDetails}>
                    {(() => {
                      const method = paymentMethods.find(pm => pm.id === defaultPaymentMethod);
                      if (method?.card) {
                        return (
                          <>
                            <Text style={styles.paymentMethodBrand}>
                              {method.card.brand.toUpperCase()} •••• {method.card.last4}
                            </Text>
                            <Text style={styles.paymentMethodExpiry}>
                              Expires {method.card.exp_month}/{method.card.exp_year}
                            </Text>
                          </>
                        );
                      }
                      return <Text style={styles.paymentMethodBrand}>Default Payment Method</Text>;
                    })()}
                  </View>
                  <TouchableOpacity onPress={() => navigation.navigate('PaymentMethods')}>
                    <Text style={styles.changeButton}>Change</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.noPaymentMethodCard}>
                <Text style={styles.noPaymentMethodIcon}>⚠️</Text>
                <Text style={styles.noPaymentMethodTitle}>No Payment Method</Text>
                <Text style={styles.noPaymentMethodText}>
                  You need to add a payment method before booking a trip
                </Text>
                <TouchableOpacity 
                  style={styles.addPaymentButton}
                  onPress={() => navigation.navigate('PaymentMethods')}
                >
                  <Text style={styles.addPaymentButtonText}>+ Add Payment Method</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

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

          {clientWeight && parseFloat(clientWeight) >= 400 ? (
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => {
                Alert.alert(
                  'Cannot Accommodate',
                  'For clients over 400 lbs, please contact our support team directly at 614-967-9887 to discuss specialized transportation options.',
                  [{ text: 'OK' }]
                );
              }}
            >
              <Text style={styles.contactButtonText}>
                Cannot Book - Contact Us
              </Text>
            </TouchableOpacity>
          ) : !defaultPaymentMethod ? (
            <TouchableOpacity
              style={styles.addPaymentButtonLarge}
              onPress={() => navigation.navigate('PaymentMethods')}
            >
              <Text style={styles.addPaymentButtonLargeText}>
                Add Payment Method to Continue
              </Text>
            </TouchableOpacity>
          ) : (
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
          )}

          <View style={styles.bottomSpacer} />
        </View>
      </ScrollView>
      </View>

      {/* Pickup Date Calendar Modal */}
      <Modal
        visible={showCalendar}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Pickup Date</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Calendar
              current={pickupDate.toISOString().split('T')[0]}
              minDate={new Date().toISOString().split('T')[0]}
              onDayPress={handleCalendarDateSelect}
              markedDates={{
                [pickupDate.toISOString().split('T')[0]]: {
                  selected: true,
                  selectedColor: '#5fbfc0',
                },
              }}
              theme={{
                todayTextColor: '#5fbfc0',
                selectedDayBackgroundColor: '#5fbfc0',
                selectedDayTextColor: '#ffffff',
                arrowColor: '#5fbfc0',
                monthTextColor: '#333',
                textDayFontWeight: '500',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '600',
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Return Date Calendar Modal */}
      <Modal
        visible={showReturnCalendar}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReturnCalendar(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Return Date</Text>
              <TouchableOpacity onPress={() => setShowReturnCalendar(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <Calendar
              current={returnDate.toISOString().split('T')[0]}
              minDate={pickupDate.toISOString().split('T')[0]}
              onDayPress={handleReturnCalendarDateSelect}
              markedDates={{
                [returnDate.toISOString().split('T')[0]]: {
                  selected: true,
                  selectedColor: '#5fbfc0',
                },
              }}
              theme={{
                todayTextColor: '#5fbfc0',
                selectedDayBackgroundColor: '#5fbfc0',
                selectedDayTextColor: '#ffffff',
                arrowColor: '#5fbfc0',
                monthTextColor: '#333',
                textDayFontWeight: '500',
                textMonthFontWeight: 'bold',
                textDayHeaderFontWeight: '600',
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Address Input Modal */}
      <Modal visible={showAddressInput} animationType="slide">
        <View style={styles.addressModalContainer}>
          <View style={styles.addressModalHeader}>
            <Text style={styles.addressModalTitle}>
              {addressInputType === 'pickup' ? 'Pickup Address' : 'Destination Address'}
            </Text>
            <TouchableOpacity onPress={() => {
              setShowAddressInput(false);
              setAddressInput('');
              setAddressSuggestions([]);
            }}>
              <Text style={styles.addressModalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.addressSearchInput}
            value={addressInput}
            onChangeText={(text) => {
              setAddressInput(text);
              fetchAddressSuggestions(text);
            }}
            placeholder="Start typing an address..."
            placeholderTextColor="#999"
            autoFocus
            returnKeyType="search"
          />

          {isLoadingSuggestions && (
            <ActivityIndicator style={styles.loadingIndicator} color="#5fbfc0" />
          )}

          <ScrollView style={styles.suggestionsList} keyboardShouldPersistTaps="handled">
            {addressSuggestions.map((suggestion) => (
              <TouchableOpacity
                key={suggestion.place_id}
                style={styles.suggestionItem}
                onPress={() => handleAddressSelect(suggestion)}
              >
                <View style={styles.suggestionIcon}>
                  <Text style={styles.suggestionIconText}>📍</Text>
                </View>
                <View style={styles.suggestionTextContainer}>
                  <Text style={styles.suggestionMainText}>
                    {suggestion.structured_formatting?.main_text || suggestion.description}
                  </Text>
                  <Text style={styles.suggestionSecondaryText}>
                    {suggestion.structured_formatting?.secondary_text || ''}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {addressSuggestions.length === 0 && addressInput.length >= 3 && !isLoadingSuggestions && (
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>No results found. Try a different search.</Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
    alignSelf: 'center',
    marginVertical: 12,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 30,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 18,
    borderBottomWidth: 2,
    borderBottomColor: '#5fbfc0',
    paddingBottom: 10,
  },
  addressInputCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
  },
  addressValue: {
    fontSize: 15,
    color: '#2E4F54',
    fontWeight: '500',
    marginTop: 4,
  },
  placeholder: {
    fontSize: 15,
    color: '#999',
    marginTop: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  labelNote: {
    fontSize: 13,
    fontWeight: '400',
    color: '#5fbfc0',
    fontStyle: 'italic',
  },
  infoNote: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    marginBottom: 8,
    color: '#333',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  weightNote: {
    fontSize: 13,
    color: '#666',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  errorBox: {
    backgroundColor: '#fee',
    borderWidth: 2,
    borderColor: '#f00',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  errorText: {
    fontSize: 14,
    color: '#c00',
    fontWeight: 'bold',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  dateTimeButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dateTimeIcon: {
    fontSize: 20,
    marginBottom: 5,
  },
  dateTimeText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
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
  calculatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9f9',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
  },
  calculatingText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#5fbfc0',
    fontWeight: '600',
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
  paymentMethodCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    marginBottom: 15,
  },
  paymentMethodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  paymentMethodDetails: {
    flex: 1,
  },
  paymentMethodBrand: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  paymentMethodExpiry: {
    fontSize: 13,
    color: '#666',
  },
  changeButton: {
    fontSize: 15,
    color: '#5fbfc0',
    fontWeight: '600',
  },
  paymentLoadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  noPaymentMethodCard: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#ffc107',
    alignItems: 'center',
    marginBottom: 15,
  },
  noPaymentMethodIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  noPaymentMethodTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  noPaymentMethodText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 20,
  },
  addPaymentButton: {
    backgroundColor: '#5fbfc0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  addPaymentButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  addPaymentButtonLarge: {
    backgroundColor: '#ffc107',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#e0a800',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  addPaymentButtonLargeText: {
    color: '#856404',
    fontSize: 18,
    fontWeight: 'bold',
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
  contactButton: {
    backgroundColor: '#dc2626',
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
  contactButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomSpacer: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#5fbfc0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalClose: {
    fontSize: 28,
    color: '#666',
    fontWeight: '300',
    paddingHorizontal: 10,
  },
  addressModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  addressModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  addressModalTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#2E4F54',
  },
  addressModalClose: {
    fontSize: 32,
    color: '#999',
    fontWeight: '300',
  },
  addressSearchInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#2E4F54',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
  },
  loadingIndicator: {
    marginVertical: 20,
  },
  suggestionsList: {
    flex: 1,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  suggestionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E6F7F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  suggestionIconText: {
    fontSize: 20,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionMainText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E4F54',
    marginBottom: 4,
  },
  suggestionSecondaryText: {
    fontSize: 14,
    color: '#666',
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: '#999',
  },
});

export default BookingScreen;
