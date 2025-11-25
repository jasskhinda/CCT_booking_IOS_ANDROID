import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';
import { getPricingEstimate, formatCurrency } from '../lib/pricing';

export default function EditTripModal({ visible, trip, onClose, onSave }) {
  const [loading, setLoading] = useState(false);

  // Date & Time
  const [pickupDate, setPickupDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [returnTime, setReturnTime] = useState(new Date());
  const [showReturnTimePicker, setShowReturnTimePicker] = useState(false);

  // Addresses
  const [pickupAddress, setPickupAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [pickupCoords, setPickupCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);

  // Address input modal
  const [showAddressInput, setShowAddressInput] = useState(false);
  const [addressInputType, setAddressInputType] = useState('pickup'); // 'pickup' or 'destination'
  const [addressInput, setAddressInput] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Location Details
  const [pickupDetails, setPickupDetails] = useState('');
  const [destinationDetails, setDestinationDetails] = useState('');

  // Trip Details
  const [wheelchairType, setWheelchairType] = useState('none');
  const [wheelchairRequirements, setWheelchairRequirements] = useState({
    stepStool: false,
    smallerRamp: false,
    largerRamp: false,
    bariatricRamp: false,
    widerVehicle: false,
  });
  const [wheelchairDetails, setWheelchairDetails] = useState('');
  const [additionalPassengers, setAdditionalPassengers] = useState('0');
  const [isEmergency, setIsEmergency] = useState(false);
  const [tripNotes, setTripNotes] = useState('');

  // Client Information
  const [clientName, setClientName] = useState('');
  const [clientWeight, setClientWeight] = useState('');
  const [clientHeightFeet, setClientHeightFeet] = useState('');
  const [clientHeightInches, setClientHeightInches] = useState('');
  const [clientDOB, setClientDOB] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  // Pricing
  const [estimatedFare, setEstimatedFare] = useState(null);
  const [distanceMiles, setDistanceMiles] = useState(0);
  const [pricingBreakdown, setPricingBreakdown] = useState(null);
  const [countyInfo, setCountyInfo] = useState(null);
  const [deadMileageDistance, setDeadMileageDistance] = useState(0);
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);

  useEffect(() => {
    if (trip) {
      // Initialize form with trip data
      if (trip.pickup_time) {
        setPickupDate(new Date(trip.pickup_time));
      }
      if (trip.return_pickup_time) {
        setReturnTime(new Date(trip.return_pickup_time));
      }
      setPickupAddress(trip.pickup_address || '');
      setDestinationAddress(trip.destination_address || '');
      setPickupDetails(trip.pickup_details || '');
      setDestinationDetails(trip.destination_details || '');
      setIsRoundTrip(trip.is_round_trip || false);
      setWheelchairType(trip.wheelchair_type || 'none');
      setAdditionalPassengers(String(trip.additional_passengers || 0));
      setTripNotes(trip.trip_notes || '');
      setIsEmergency(trip.is_emergency || false);
      setDistanceMiles(trip.distance || 0);
      setEstimatedFare(trip.price || 0);

      // Load client data from database
      const loadClientData = async () => {
        try {
          // booking_mobile: Only load user profile data (no managed clients)
          if (trip.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', trip.user_id)
              .single();

            if (profile) {
              setClientName(profile.name || profile.full_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || '');
              setClientEmail(profile.email || '');

              // Load weight from profile
              if (profile.weight) {
                setClientWeight(String(profile.weight));
              }

              // Load height from profile
              if (profile.height_feet) {
                setClientHeightFeet(String(profile.height_feet));
              }
              if (profile.height_inches) {
                setClientHeightInches(String(profile.height_inches));
              }

              // Load DOB from profile
              if (profile.date_of_birth) {
                setClientDOB(profile.date_of_birth);
              }
            }
          }

          // Fallback: Load client weight from pricing_breakdown_data if not in profile
          if (!clientWeight && trip.pricing_breakdown_data?.clientInfo?.weight) {
            setClientWeight(String(trip.pricing_breakdown_data.clientInfo.weight));
          }
        } catch (error) {
          console.error('Error loading client data:', error);
        }
      };

      loadClientData();

      // Extract wheelchair requirements
      if (trip.pricing_breakdown_data?.wheelchairInfo?.requirements) {
        setWheelchairRequirements(trip.pricing_breakdown_data.wheelchairInfo.requirements);
      }
      if (trip.pricing_breakdown_data?.wheelchairInfo?.details) {
        setWheelchairDetails(trip.pricing_breakdown_data.wheelchairInfo.details);
      }
    }
  }, [trip]);

  // Recalculate pricing when relevant fields change
  useEffect(() => {
    if (trip && (pickupAddress || trip.pickup_address) && (destinationAddress || trip.destination_address)) {
      recalculatePricing();
    }
  }, [
    isRoundTrip,
    wheelchairType,
    wheelchairRequirements,
    pickupDate,
    returnTime,
    isEmergency,
    clientWeight,
    additionalPassengers,
    pickupAddress,
    destinationAddress
  ]);

  const recalculatePricing = async () => {
    try {
      const currentPickup = pickupAddress || trip.pickup_address;
      const currentDestination = destinationAddress || trip.destination_address;

      console.log('🔄 Recalculating pricing preview...');
      console.log('📍 Pickup:', currentPickup);
      console.log('📍 Destination:', currentDestination);

      if (!currentPickup || !currentDestination) {
        console.warn('⚠️ Missing addresses, cannot calculate pricing');
        return;
      }

      // CRITICAL FIX: Calculate distance using Directions API (same as UberLikeBookingScreen)
      // This ensures we get the accurate driving distance and can detect counties correctly
      try {
        const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
        const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(currentPickup)}&destination=${encodeURIComponent(currentDestination)}&alternatives=true&mode=driving&units=imperial&departure_time=now&traffic_model=best_guess&key=${GOOGLE_MAPS_API_KEY}`;

        console.log('🌐 Fetching route from Google Directions API...');
        const response = await fetch(directionsUrl);
        const data = await response.json();

        if (data.status === 'OK' && data.routes && data.routes.length > 0) {
          // Find fastest route (same logic as UberLikeBookingScreen)
          let fastestRoute = data.routes[0];
          let shortestDuration = data.routes[0].legs[0].duration.value;

          for (let i = 1; i < data.routes.length; i++) {
            const routeDuration = data.routes[i].legs[0].duration.value;
            if (routeDuration < shortestDuration) {
              shortestDuration = routeDuration;
              fastestRoute = data.routes[i];
            }
          }

          const leg = fastestRoute.legs[0];
          const distanceInMiles = leg.distance.value * 0.000621371;
          const calculatedDistance = Math.round(distanceInMiles * 100) / 100;

          console.log('✅ Distance calculated:', calculatedDistance, 'miles');
          setDistanceMiles(calculatedDistance);

          // Now calculate pricing with the accurate distance
          const pricing = await getPricingEstimate({
            isRoundTrip,
            distance: calculatedDistance,
            pickupDateTime: pickupDate,
            wheelchairType,
            clientType: 'client',
            additionalPassengers: parseInt(additionalPassengers) || 0,
            isEmergency,
            pickupAddress: currentPickup,
            destinationAddress: currentDestination,
            clientWeight: clientWeight ? parseInt(clientWeight) : null,
          });

          if (pricing && pricing.pricing) {
            console.log('💰 Updated fare estimate:', pricing.pricing.total);
            console.log('📊 County info:', pricing.countyInfo);
            setEstimatedFare(pricing.pricing.total);
            setPricingBreakdown(pricing.pricing);
            setCountyInfo(pricing.countyInfo);
            setDeadMileageDistance(pricing.deadMileageDistance || pricing.deadMileage || 0);
          }
        } else {
          console.error('❌ Directions API failed:', data.status);
          // Fallback to old distance if Directions API fails
          const pricing = await getPricingEstimate({
            isRoundTrip,
            distance: distanceMiles,
            pickupDateTime: pickupDate,
            wheelchairType,
            clientType: 'client',
            additionalPassengers: parseInt(additionalPassengers) || 0,
            isEmergency,
            pickupAddress: currentPickup,
            destinationAddress: currentDestination,
            clientWeight: clientWeight ? parseInt(clientWeight) : null,
          });

          if (pricing && pricing.pricing) {
            setEstimatedFare(pricing.pricing.total);
            setPricingBreakdown(pricing.pricing);
            setCountyInfo(pricing.countyInfo);
            setDeadMileageDistance(pricing.deadMileageDistance || pricing.deadMileage || 0);
          }
        }
      } catch (directionsError) {
        console.error('❌ Error calling Directions API:', directionsError);
        // Fallback to pricing with old distance
        const pricing = await getPricingEstimate({
          isRoundTrip,
          distance: distanceMiles,
          pickupDateTime: pickupDate,
          wheelchairType,
          clientType: 'client',
          additionalPassengers: parseInt(additionalPassengers) || 0,
          isEmergency,
          pickupAddress: currentPickup,
          destinationAddress: currentDestination,
          clientWeight: clientWeight ? parseInt(clientWeight) : null,
        });

        if (pricing && pricing.pricing) {
          setEstimatedFare(pricing.pricing.total);
          setPricingBreakdown(pricing.pricing);
          setCountyInfo(pricing.countyInfo);
          setDeadMileageDistance(pricing.deadMileageDistance || pricing.deadMileage || 0);
        }
      }
    } catch (error) {
      console.error('Error recalculating pricing:', error);
    }
  };

  // Calculate distance between two coordinates
  const calculateDistance = async (start, end) => {
    try {
      const url = `${API_URL}/api/maps/distance?origin=${start.latitude},${start.longitude}&destination=${end.latitude},${end.longitude}`;
      console.log('🔍 Calculating distance:', url);

      const response = await fetch(url);
      console.log('📡 Distance response status:', response.status, response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Distance calculation error:', errorText.substring(0, 200));
        return null;
      }

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.log('⚠️ Distance response not valid JSON');
        return null;
      }

      if (data.status === 'OK' && data.routes?.[0]) {
        const distanceMeters = data.routes[0].legs[0].distance.value;
        const distanceMiles = (distanceMeters * 0.000621371).toFixed(2);
        console.log('✅ Distance calculated:', distanceMiles, 'miles');
        return parseFloat(distanceMiles);
      }
      console.log('⚠️ No routes in distance response:', data.status);
      return null;
    } catch (error) {
      console.log('⚠️ Distance calculation error (silently handled):', error.message);
      return null;
    }
  };

  // Fetch address suggestions
  const fetchAddressSuggestions = async (input) => {
    if (!input || input.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      // Use production URL for autocomplete (same as booking screen)
      const autocompleteUrl = 'https://facility.compassionatecaretransportation.com';
      const url = `${autocompleteUrl}/api/maps/autocomplete?input=${encodeURIComponent(input)}`;
      console.log('🔍 Fetching autocomplete:', url);

      const response = await fetch(url);
      console.log('📡 Response status:', response.status, response.ok);

      // Check if response is OK before parsing
      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Error response:', errorText.substring(0, 200));
        setAddressSuggestions([]);
        return;
      }

      // Get response as text first to check if it's JSON
      const responseText = await response.text();
      console.log('📄 Response preview:', responseText.substring(0, 100));

      // Try to parse as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.log('⚠️ Not valid JSON, got HTML or other format');
        setAddressSuggestions([]);
        return;
      }

      if (data.status === 'OK' && data.predictions) {
        console.log('✅ Got', data.predictions.length, 'suggestions');
        setAddressSuggestions(data.predictions);
      } else {
        console.log('⚠️ No predictions in response:', data.status);
        setAddressSuggestions([]);
      }
    } catch (error) {
      console.log('⚠️ Fetch error (silently handled):', error.message);
      setAddressSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Get place details
  const getPlaceDetails = async (placeId) => {
    try {
      // Use production URL for place details (same as booking screen)
      const autocompleteUrl = 'https://facility.compassionatecaretransportation.com';
      const url = `${autocompleteUrl}/api/maps/place-details?place_id=${placeId}`;
      console.log('🔍 Fetching place details:', url);

      const response = await fetch(url);
      console.log('📡 Place details response status:', response.status, response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Place details error:', errorText.substring(0, 200));
        return null;
      }

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.log('⚠️ Place details response not valid JSON');
        return null;
      }

      if (data.status === 'OK' && data.result) {
        console.log('✅ Got place details');
        return {
          address: data.result.formatted_address,
          coords: {
            latitude: data.result.geometry.location.lat,
            longitude: data.result.geometry.location.lng,
          },
        };
      }
      console.log('⚠️ No result in place details:', data.status);
      return null;
    } catch (error) {
      console.log('⚠️ Place details error (silently handled):', error.message);
      return null;
    }
  };

  // Handle selecting an address suggestion
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

    // Recalculate pricing with new addresses
    if ((addressInputType === 'pickup' && destinationCoords) ||
        (addressInputType === 'destination' && pickupCoords)) {
      recalculatePricing();
    }
  };

  // Watch for address input changes
  useEffect(() => {
    if (addressInput.length >= 3) {
      const timeoutId = setTimeout(() => {
        fetchAddressSuggestions(addressInput);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setAddressSuggestions([]);
    }
  }, [addressInput]);

  const handleSave = async () => {
    try {
      setLoading(true);

      // Validate required fields
      if (!clientWeight) {
        Alert.alert('Missing Information', 'Please enter client weight');
        setLoading(false);
        return;
      }

      // Verify trip is still pending
      const { data: currentTrip, error: checkError } = await supabase
        .from('trips')
        .select('status')
        .eq('id', trip.id)
        .single();

      if (checkError) throw new Error('Failed to verify trip status');

      if (currentTrip.status !== 'pending') {
        Alert.alert('Error', 'This trip can no longer be edited. Only pending trips can be modified.');
        setLoading(false);
        return;
      }

      // Get full pricing breakdown with county detection and all fees
      console.log('🔄 Recalculating pricing for trip edit...');
      console.log('📍 Pickup:', pickupAddress || trip.pickup_address);
      console.log('📍 Destination:', destinationAddress || trip.destination_address);
      console.log('📏 Distance:', distanceMiles, 'miles');

      const pricingBreakdown = await getPricingEstimate({
        isRoundTrip,
        distance: distanceMiles,
        pickupDateTime: pickupDate,
        wheelchairType,
        clientType: 'client', // booking_mobile: users are 'client' not 'managed'
        additionalPassengers: parseInt(additionalPassengers) || 0,
        isEmergency,
        pickupAddress: pickupAddress || trip.pickup_address,
        destinationAddress: destinationAddress || trip.destination_address,
        clientWeight: clientWeight ? parseInt(clientWeight) : null,
      });

      console.log('💰 Pricing result:', pricingBreakdown);

      if (!pricingBreakdown || !pricingBreakdown.pricing) {
        throw new Error('Failed to calculate pricing. Please check addresses and try again.');
      }

      // CRITICAL FIX: Use pricingBreakdown.pricing.total for BOTH price and pricing_breakdown_total
      // This ensures the displayed "Total Amount" matches the detailed breakdown
      const finalPrice = pricingBreakdown.pricing.total;

      console.log('✅ Final price:', finalPrice);
      console.log('📊 County info:', pricingBreakdown.countyInfo);

      // Prepare update data
      const updateData = {
        pickup_address: pickupAddress || trip.pickup_address,
        destination_address: destinationAddress || trip.destination_address,
        pickup_time: pickupDate.toISOString(),
        return_pickup_time: isRoundTrip ? returnTime.toISOString() : null,
        pickup_details: pickupDetails.trim() || null,
        destination_details: destinationDetails.trim() || null,
        is_round_trip: isRoundTrip,
        wheelchair_type: wheelchairType,
        additional_passengers: parseInt(additionalPassengers) || 0,
        trip_notes: tripNotes.trim() || null,
        is_emergency: isEmergency,
        price: finalPrice, // ← FIXED: Use pricingBreakdown.pricing.total
        distance: distanceMiles,
        pricing_breakdown_data: {
          pricing: pricingBreakdown.pricing,
          countyInfo: pricingBreakdown.countyInfo, // ← Include county info
          deadMileage: pricingBreakdown.deadMileage || 0,
          deadMileageDistance: pricingBreakdown.deadMileageDistance || pricingBreakdown.deadMileage || 0,
          distance: { distance: distanceMiles, unit: 'miles' },
          summary: {
            isRoundTrip,
            isEmergency,
            wheelchairType,
            additionalPassengers: parseInt(additionalPassengers) || 0,
          },
          wheelchairInfo: {
            type: wheelchairType,
            requirements: wheelchairType === 'provided' ? wheelchairRequirements : null,
            details: wheelchairType === 'provided' ? wheelchairDetails : null
          },
          clientInfo: {
            weight: clientWeight ? parseInt(clientWeight) : null,
            height: clientHeightFeet && clientHeightInches
              ? `${clientHeightFeet}'${clientHeightInches}"`
              : null,
            dob: clientDOB || null,
            email: clientEmail || null,
          },
          createdAt: trip?.pricing_breakdown_data?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source: 'EditTripModal (Mobile)'
        },
        pricing_breakdown_total: finalPrice, // ← FIXED: Use same value as price
        pricing_breakdown_locked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Update the trip
      const { error: updateError } = await supabase
        .from('trips')
        .update(updateData)
        .eq('id', trip.id)
        .eq('status', 'pending');

      if (updateError) throw updateError;

      // booking_mobile: User profile data is stored in pricing_breakdown_data
      // No need to update facility_managed_clients table (doesn't exist in booking_mobile context)

      Alert.alert('Success', 'Trip updated successfully!', [
        {
          text: 'OK',
          onPress: () => {
            if (onSave) onSave();
            onClose();
          },
        },
      ]);
    } catch (error) {
      console.error('Error updating trip:', error);
      Alert.alert('Error', error.message || 'Failed to update trip');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(pickupDate);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setPickupDate(newDate);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    // On Android, close picker immediately
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    // On iOS, keep picker open until "Done" is pressed
    if (selectedTime) {
      const newDate = new Date(pickupDate);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setPickupDate(newDate);
    }
  };

  const onReturnTimeChange = (event, selectedTime) => {
    setShowReturnTimePicker(false);
    if (selectedTime) {
      setReturnTime(selectedTime);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} disabled={loading}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Trip</Text>
          <TouchableOpacity onPress={handleSave} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#7CCFD0" />
            ) : (
              <Text style={styles.saveButton}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Addresses (Editable) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Route</Text>

            <TouchableOpacity
              style={styles.addressCard}
              onPress={() => {
                setAddressInputType('pickup');
                setShowAddressInput(true);
              }}
            >
              <Text style={styles.label}>Pickup Address</Text>
              <Text style={styles.addressValue} numberOfLines={2}>
                {pickupAddress || trip?.pickup_address}
              </Text>
              <Text style={styles.changeText}>Tap to change</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.addressCard}
              onPress={() => {
                setAddressInputType('destination');
                setShowAddressInput(true);
              }}
            >
              <Text style={styles.label}>Destination Address</Text>
              <Text style={styles.addressValue} numberOfLines={2}>
                {destinationAddress || trip?.destination_address}
              </Text>
              <Text style={styles.changeText}>Tap to change</Text>
            </TouchableOpacity>
          </View>

          {/* Pickup Date & Time */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Pickup Date & Time</Text>

            <TouchableOpacity
              style={styles.inputCard}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.label}>Pickup Date</Text>
              <Text style={styles.value}>
                {pickupDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.inputCard}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.label}>Pickup Time</Text>
              <Text style={styles.value}>
                {pickupDate.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Round Trip */}
          <View style={styles.section}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>🔄 Round Trip</Text>
              <Switch
                value={isRoundTrip}
                onValueChange={setIsRoundTrip}
                trackColor={{ false: '#D1D5DB', true: '#7CCFD0' }}
                thumbColor="#fff"
              />
            </View>
            {isRoundTrip && (
              <TouchableOpacity
                style={styles.inputCard}
                onPress={() => setShowReturnTimePicker(true)}
              >
                <Text style={styles.label}>Return Time</Text>
                <Text style={styles.value}>
                  {returnTime.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Emergency Trip */}
          <View style={styles.section}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>🚨 Emergency Trip</Text>
              <Switch
                value={isEmergency}
                onValueChange={setIsEmergency}
                trackColor={{ false: '#D1D5DB', true: '#EF4444' }}
                thumbColor="#fff"
              />
            </View>
            {isEmergency && (
              <View style={styles.warningBox}>
                <Text style={styles.warningText}>
                  ⚠️ Emergency trips have a $40 surcharge
                </Text>
              </View>
            )}
          </View>

          {/* Location Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📌 Location Details</Text>

            <View style={styles.inputCard}>
              <Text style={styles.label}>Pickup Details</Text>
              <TextInput
                style={styles.textInput}
                value={pickupDetails}
                onChangeText={setPickupDetails}
                placeholder="Apt, Suite, Building, etc."
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputCard}>
              <Text style={styles.label}>Destination Details</Text>
              <TextInput
                style={styles.textInput}
                value={destinationDetails}
                onChangeText={setDestinationDetails}
                placeholder="Floor, Room, Wing, etc."
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Wheelchair Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>♿ Wheelchair Type</Text>

            {['none', 'manual', 'power', 'transport', 'provided'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.radioOption,
                  wheelchairType === type && styles.radioOptionActive
                ]}
                onPress={() => setWheelchairType(type)}
              >
                <View style={[styles.radio, wheelchairType === type && styles.radioActive]}>
                  {wheelchairType === type && <View style={styles.radioInner} />}
                </View>
                <Text style={styles.radioLabel}>
                  {type === 'none' && 'None (No wheelchair assistance needed)'}
                  {type === 'manual' && 'Manual Wheelchair'}
                  {type === 'power' && 'Power Wheelchair'}
                  {type === 'transport' && 'Transport Chair (Not Wheelchair Accessible)'}
                  {type === 'provided' && 'Yes, provide wheelchair'}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Wheelchair Requirements for "provided" */}
            {wheelchairType === 'provided' && (
              <View style={styles.requirementsSection}>
                <Text style={styles.requirementsTitle}>Equipment Requirements:</Text>
                {[
                  { key: 'stepStool', label: 'Step stool' },
                  { key: 'smallerRamp', label: 'Smaller ramp' },
                  { key: 'largerRamp', label: 'Larger ramp' },
                  { key: 'bariatricRamp', label: 'Bariatric ramp' },
                  { key: 'widerVehicle', label: 'Wider vehicle' },
                ].map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    style={styles.checkboxRow}
                    onPress={() => setWheelchairRequirements(prev => ({
                      ...prev,
                      [key]: !prev[key]
                    }))}
                  >
                    <View style={[styles.checkbox, wheelchairRequirements[key] && styles.checkboxActive]}>
                      {wheelchairRequirements[key] && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <Text style={styles.checkboxLabel}>{label}</Text>
                  </TouchableOpacity>
                ))}
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={wheelchairDetails}
                  onChangeText={setWheelchairDetails}
                  placeholder="Additional details..."
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={3}
                />
              </View>
            )}
          </View>

          {/* Client Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👤 Client Information</Text>

            {clientName && (
              <View style={styles.clientNameBanner}>
                <Text style={styles.clientNameText}>
                  📋 Client: <Text style={styles.clientNameBold}>{clientName}</Text>
                </Text>
              </View>
            )}

            <View style={styles.inputCard}>
              <Text style={styles.label}>Weight (lbs) *</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyValue}>
                  {clientWeight || 'Not set'}
                </Text>
              </View>
              {clientWeight && parseInt(clientWeight) >= 300 && (
                <Text style={styles.warningText}>⚠️ Bariatric rate applies ($150/leg)</Text>
              )}
            </View>

            <View style={styles.row}>
              <View style={[styles.inputCard, styles.half]}>
                <Text style={styles.label}>Height - Feet *</Text>
                <View style={styles.readOnlyField}>
                  <Text style={styles.readOnlyValue}>
                    {clientHeightFeet || 'Not set'}
                  </Text>
                </View>
              </View>
              <View style={[styles.inputCard, styles.half]}>
                <Text style={styles.label}>Height - Inches *</Text>
                <View style={styles.readOnlyField}>
                  <Text style={styles.readOnlyValue}>
                    {clientHeightInches || 'Not set'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.inputCard}>
              <Text style={styles.label}>Date of Birth *</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyValue}>
                  {clientDOB || 'Not set'}
                </Text>
              </View>
            </View>

            <View style={styles.inputCard}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyValue}>
                  {clientEmail || 'Not set'}
                </Text>
              </View>
            </View>
          </View>

          {/* Additional Passengers */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👥 Additional Passengers</Text>
            <View style={styles.inputCard}>
              <Text style={styles.label}>Number of Additional Passengers</Text>
              <TextInput
                style={styles.textInput}
                value={additionalPassengers}
                onChangeText={setAdditionalPassengers}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Special Instructions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Special Instructions</Text>
            <View style={styles.inputCard}>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={tripNotes}
                onChangeText={setTripNotes}
                placeholder="Any special instructions..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Updated Pricing with Breakdown */}
          {estimatedFare !== null && distanceMiles > 0 && pricingBreakdown && (
            <View style={styles.pricingCard}>
              <Text style={styles.pricingCardTitle}>Updated Fare Estimate</Text>
              <Text style={styles.pricingCardSubtitle}>
                {isRoundTrip ? `Round Trip • ${(distanceMiles * 2).toFixed(1)} miles (${distanceMiles.toFixed(1)} mi each way)` : `One Way • ${distanceMiles.toFixed(1)} miles`}
              </Text>

              <Text style={styles.pricingCardTotal}>{formatCurrency(estimatedFare)}</Text>

              <TouchableOpacity
                style={styles.breakdownToggle}
                onPress={() => setShowPriceBreakdown(!showPriceBreakdown)}
              >
                <Text style={styles.breakdownToggleText}>
                  {showPriceBreakdown ? '▼' : '▶'} View price breakdown
                </Text>
              </TouchableOpacity>

              {showPriceBreakdown && pricingBreakdown && (
                <View style={styles.breakdownSection}>
                  {/* Base Fare */}
                  {pricingBreakdown.basePrice !== undefined && !isNaN(pricingBreakdown.basePrice) && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>
                        Base fare ({isRoundTrip ? '2' : '1'} leg{isRoundTrip ? 's' : ''} @ ${pricingBreakdown.baseRatePerLeg || (pricingBreakdown.isBariatric ? 150 : 50)}/leg{pricingBreakdown.isBariatric ? ' (Bariatric rate)' : ''})
                      </Text>
                      <Text style={styles.breakdownValue}>
                        {formatCurrency(pricingBreakdown.basePrice + (pricingBreakdown.roundTripPrice || 0))}
                      </Text>
                    </View>
                  )}

                  {/* Distance Charge */}
                  {pricingBreakdown.tripDistancePrice > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>
                        Distance charge ({countyInfo?.isInFranklinCounty ? '$3/mile (Franklin County)' : '$4/mile (Outside Franklin County)'})
                      </Text>
                      <Text style={styles.breakdownValue}>{formatCurrency(pricingBreakdown.tripDistancePrice)}</Text>
                    </View>
                  )}

                  {/* County Surcharge */}
                  {pricingBreakdown.countySurcharge > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>
                        County surcharge ({countyInfo?.countiesOut || 2} counties @ $50/county)
                      </Text>
                      <Text style={styles.breakdownValue}>{formatCurrency(pricingBreakdown.countySurcharge)}</Text>
                    </View>
                  )}

                  {/* Dead Mileage */}
                  {pricingBreakdown.deadMileagePrice > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>
                        Dead mileage ({deadMileageDistance.toFixed(1)} mi @ $4/mile)
                      </Text>
                      <Text style={styles.breakdownValue}>{formatCurrency(pricingBreakdown.deadMileagePrice)}</Text>
                    </View>
                  )}

                  {/* Weekend/After-hours */}
                  {pricingBreakdown.weekendAfterHoursSurcharge > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Weekend/After-hours surcharge</Text>
                      <Text style={styles.breakdownValue}>{formatCurrency(pricingBreakdown.weekendAfterHoursSurcharge)}</Text>
                    </View>
                  )}

                  {/* Emergency Fee */}
                  {pricingBreakdown.emergencyFee > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Emergency fee</Text>
                      <Text style={styles.breakdownValue}>{formatCurrency(pricingBreakdown.emergencyFee)}</Text>
                    </View>
                  )}

                  {/* Holiday Surcharge */}
                  {pricingBreakdown.holidaySurcharge > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Holiday surcharge</Text>
                      <Text style={styles.breakdownValue}>{formatCurrency(pricingBreakdown.holidaySurcharge)}</Text>
                    </View>
                  )}

                  {/* Wheelchair */}
                  {pricingBreakdown.wheelchairPrice > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Wheelchair rental</Text>
                      <Text style={styles.breakdownValue}>{formatCurrency(pricingBreakdown.wheelchairPrice)}</Text>
                    </View>
                  )}

                  <View style={styles.pricingDivider} />

                  {/* Total */}
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownTotal}>Total</Text>
                    <Text style={styles.breakdownTotal}>{formatCurrency(pricingBreakdown.total)}</Text>
                  </View>
                </View>
              )}

              {showPriceBreakdown && !pricingBreakdown && (
                <View style={styles.breakdownSection}>
                  <Text style={styles.breakdownLabel}>
                    Pricing breakdown not available. Please calculate fare first.
                  </Text>
                </View>
              )}

              {pricingBreakdown?.deadMileagePrice > 0 && (
                <Text style={styles.pricingDisclaimer}>
                  • Dead mileage fee ($4/mile from office to pickup and back) for trips 2+ counties out
                </Text>
              )}
              <Text style={styles.pricingDisclaimer}>
                • Additional charges apply for off-hours, weekends, or wheelchair accessibility
              </Text>
              <Text style={styles.pricingDisclaimer}>
                • Final fare may vary based on actual route and traffic conditions
              </Text>
              <Text style={styles.pricingNote}>Price will be recalculated when you save</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>

      {/* Date/Time Pickers - Rendered outside main container */}
      {showDatePicker && Platform.OS === 'ios' && (
        <Modal visible={showDatePicker} transparent animationType="slide">
          <View style={styles.pickerModalOverlay}>
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.pickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.pickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pickupDate}
                mode="date"
                display="spinner"
                onChange={onDateChange}
                minimumDate={new Date()}
                textColor="#000"
              />
            </View>
          </View>
        </Modal>
      )}

      {showDatePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={pickupDate}
          mode="date"
          display="default"
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}

      {showTimePicker && Platform.OS === 'ios' && (
        <Modal visible={showTimePicker} transparent animationType="slide">
          <View style={styles.pickerModalOverlay}>
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={styles.pickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>Select Time</Text>
                <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                  <Text style={styles.pickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pickupDate}
                mode="time"
                display="spinner"
                onChange={(event, selectedTime) => {
                  if (selectedTime) {
                    const newDate = new Date(pickupDate);
                    newDate.setHours(selectedTime.getHours());
                    newDate.setMinutes(selectedTime.getMinutes());
                    setPickupDate(newDate);
                  }
                }}
                textColor="#000"
              />
            </View>
          </View>
        </Modal>
      )}

      {showTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={pickupDate}
          mode="time"
          display="default"
          onChange={onTimeChange}
        />
      )}

      {showReturnTimePicker && Platform.OS === 'ios' && (
        <Modal visible={showReturnTimePicker} transparent animationType="slide">
          <View style={styles.pickerModalOverlay}>
            <View style={styles.pickerModalContent}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowReturnTimePicker(false)}>
                  <Text style={styles.pickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>Select Return Time</Text>
                <TouchableOpacity onPress={() => setShowReturnTimePicker(false)}>
                  <Text style={styles.pickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={returnTime}
                mode="time"
                display="spinner"
                onChange={(event, selectedTime) => {
                  if (selectedTime) {
                    setReturnTime(selectedTime);
                  }
                }}
                textColor="#000"
              />
            </View>
          </View>
        </Modal>
      )}

      {showReturnTimePicker && Platform.OS === 'android' && (
        <DateTimePicker
          value={returnTime}
          mode="time"
          display="default"
          onChange={onReturnTimeChange}
        />
      )}

      {/* Address Input Modal */}
      <Modal
        visible={showAddressInput}
        animationType="slide"
        transparent={false}
        onRequestClose={() => {
          setShowAddressInput(false);
          setAddressInput('');
          setAddressSuggestions([]);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => {
                setShowAddressInput(false);
                setAddressInput('');
                setAddressSuggestions([]);
              }}
            >
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {addressInputType === 'pickup' ? 'Pickup Address' : 'Destination Address'}
            </Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Start typing an address..."
              placeholderTextColor="#999"
              value={addressInput}
              onChangeText={setAddressInput}
              autoFocus
              returnKeyType="search"
            />
          </View>

          {isLoadingSuggestions && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#7CCFD0" />
            </View>
          )}

          <ScrollView style={styles.suggestionsContainer} keyboardShouldPersistTaps="handled">
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
            {addressSuggestions.length === 0 && addressInput.length >= 3 && !isLoadingSuggestions && (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>No results found. Try a different search.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E4F54',
  },
  cancelButton: {
    fontSize: 16,
    color: '#6B7280',
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7CCFD0',
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E4F54',
    marginBottom: 12,
  },
  readOnlyCard: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  readOnlyLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  readOnlyText: {
    fontSize: 14,
    color: '#1F2937',
  },
  inputCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E4F54',
    marginBottom: 8,
  },
  readOnlyField: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 14,
    minHeight: 48,
    justifyContent: 'center',
  },
  readOnlyValue: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
    color: '#1F2937',
  },
  textInput: {
    fontSize: 16,
    color: '#1F2937',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  switchLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2E4F54',
  },
  warningBox: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  warningText: {
    fontSize: 13,
    color: '#92400E',
    marginTop: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  radioOptionActive: {
    borderColor: '#7CCFD0',
    backgroundColor: '#F0F9FF',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioActive: {
    borderColor: '#7CCFD0',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7CCFD0',
  },
  radioLabel: {
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
  },
  requirementsSection: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E4F54',
    marginBottom: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#7CCFD0',
    borderColor: '#7CCFD0',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#1F2937',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
  pricingCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    backgroundColor: '#E6F7F7',
    borderRadius: 12,
  },
  pricingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E4F54',
    marginBottom: 8,
  },
  pricingAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#7CCFD0',
    marginBottom: 4,
  },
  pricingNote: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    marginTop: 8,
  },
  pricingCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E4F54',
    marginBottom: 4,
  },
  pricingCardSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  pricingCardTotal: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2E4F54',
    marginVertical: 12,
  },
  breakdownToggle: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    marginTop: 8,
  },
  breakdownToggleText: {
    fontSize: 14,
    color: '#7CCFD0',
    fontWeight: '600',
  },
  breakdownSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
    marginRight: 8,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E4F54',
  },
  breakdownTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E4F54',
  },
  pricingDivider: {
    height: 1,
    backgroundColor: '#7CCFD0',
    marginVertical: 8,
  },
  pricingDisclaimer: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    lineHeight: 16,
  },
  addressCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addressValue: {
    fontSize: 15,
    color: '#1F2937',
    marginBottom: 6,
  },
  changeText: {
    fontSize: 13,
    color: '#7CCFD0',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
  },
  modalCancelButton: {
    fontSize: 16,
    color: '#7CCFD0',
    width: 60,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E4F54',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInput: {
    fontSize: 16,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  suggestionsContainer: {
    flex: 1,
  },
  suggestionItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'center',
  },
  suggestionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  suggestionIconText: {
    fontSize: 16,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionMainText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  suggestionSecondaryText: {
    fontSize: 13,
    color: '#6B7280',
  },
  noResultsContainer: {
    padding: 40,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 15,
    color: '#6B7280',
  },
  clientNameBanner: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginBottom: 12,
  },
  clientNameText: {
    fontSize: 14,
    color: '#1E40AF',
  },
  clientNameBold: {
    fontWeight: '600',
    color: '#1E3A8A',
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2E4F54',
  },
  pickerCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
  },
  pickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7CCFD0',
  },
});
