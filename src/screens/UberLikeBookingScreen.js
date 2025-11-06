import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { getPricingEstimate, formatCurrency } from '../lib/pricing';
import { useAuth } from '../hooks/useAuth'; // Get current logged-in user

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function UberLikeBookingScreen({ route }) {
  const mapRef = useRef(null);
  const navigation = useNavigation();
  const { user } = useAuth(); // Get current logged-in user

  // State  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [profileDataLoaded, setProfileDataLoaded] = useState({
    weight: false,
    height: false,
    dob: false,
    email: false
  });

  // Form state (no client selection needed - user books for themselves)
  const [pickupAddress, setPickupAddress] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [pickupCoords, setPickupCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [pickupDate, setPickupDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isRoundTrip, setIsRoundTrip] = useState(false);
  const [returnTime, setReturnTime] = useState(new Date());
  const [showReturnTimePicker, setShowReturnTimePicker] = useState(false);
  const [isEmergency, setIsEmergency] = useState(false);
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
  const [notes, setNotes] = useState('');
  // Bill to user (no facility billing in booking_mobile)

  // Address details
  const [pickupDetails, setPickupDetails] = useState(''); // Apt, suite, etc.
  const [destinationDetails, setDestinationDetails] = useState(''); // Building, room, etc.

  // Enhanced Client Information
  const [clientWeight, setClientWeight] = useState('');
  const [clientHeightFeet, setClientHeightFeet] = useState('');
  const [clientHeightInches, setClientHeightInches] = useState('');
  const [clientDOB, setClientDOB] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  // Distance and pricing state
  const [distanceMiles, setDistanceMiles] = useState(0);
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [estimatedFare, setEstimatedFare] = useState(null);
  const [pricingBreakdown, setPricingBreakdown] = useState(null);
  const [countyInfo, setCountyInfo] = useState(null);
  const [showPriceBreakdown, setShowPriceBreakdown] = useState(false);

  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    tripDetails: true,
    wheelchair: false,
    clientInfo: false,
    additionalOptions: false,
  });

  // Modal state
  const [showAddressInput, setShowAddressInput] = useState(false);
  const [addressInputType, setAddressInputType] = useState('pickup'); // 'pickup' or 'destination'
  const [addressInput, setAddressInput] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  useEffect(() => {
    loadData();
    // Set default date/time to 1 hour from now
    const defaultDate = new Date();
    defaultDate.setHours(defaultDate.getHours() + 1);
    defaultDate.setMinutes(Math.ceil(defaultDate.getMinutes() / 15) * 15);
    setPickupDate(defaultDate);
  }, []);

  // Reload profile when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('📍 Booking screen focused - reloading profile...');
      loadData();
    });

    return unsubscribe;
  }, [navigation]);

  // Calculate minimum return time for round trips (for validation only, not for picker constraint)
  const getMinimumReturnTime = () => {
    if (!isRoundTrip || !estimatedDuration || !pickupDate) {
      return null;
    }

    // Parse duration string (e.g., "53 mins" or "1 hour 15 mins")
    const durationMatch = estimatedDuration.match(/(\d+)\s*(hour|hr|min)/gi);
    let totalMinutes = 0;

    if (durationMatch) {
      durationMatch.forEach(part => {
        const value = parseInt(part);
        if (part.toLowerCase().includes('hour') || part.toLowerCase().includes('hr')) {
          totalMinutes += value * 60;
        } else {
          totalMinutes += value;
        }
      });
    }

    // Add buffer time at destination (15 minutes default)
    const bufferMinutes = 15;
    const totalTimeMinutes = totalMinutes + bufferMinutes;

    // Calculate minimum return time = pickup time + travel time + buffer
    const minReturnTime = new Date(pickupDate);
    minReturnTime.setMinutes(minReturnTime.getMinutes() + totalTimeMinutes);

    return minReturnTime;
  };

  // Recalculate pricing when options change - Use comprehensive pricing
  useEffect(() => {
    if (distanceMiles > 0 && pickupAddress && destinationAddress) {
      recalculatePricing();
    }
  }, [isRoundTrip, wheelchairType, pickupDate, distanceMiles, isEmergency, clientWeight, pickupAddress, destinationAddress]);

  // Auto-update return time to sensible default when pickup time or duration changes
  useEffect(() => {
    if (isRoundTrip && pickupDate) {
      const minReturnTime = getMinimumReturnTime();

      // If return time is before pickup time OR before minimum required time, update it
      if (returnTime < pickupDate || (minReturnTime && returnTime < minReturnTime)) {
        if (minReturnTime) {
          setReturnTime(minReturnTime);
        } else {
          // Default: pickup time + 1 hour if no duration available yet
          const defaultReturn = new Date(pickupDate);
          defaultReturn.setHours(defaultReturn.getHours() + 1);
          setReturnTime(defaultReturn);
        }
      }
    }
  }, [isRoundTrip, pickupDate, estimatedDuration]);

  const recalculatePricing = async () => {
    try {
      const pricingResult = await getPricingEstimate({
        pickupAddress,
        destinationAddress,
        isRoundTrip,
        pickupDateTime: pickupDate.toISOString(),
        wheelchairType,
        isEmergency,
        distance: distanceMiles,
        clientWeight: clientWeight ? parseInt(clientWeight) : null,
      });

      if (pricingResult.success && pricingResult.pricing) {
        setEstimatedFare(pricingResult.pricing.total);
        setPricingBreakdown(pricingResult.pricing);
        setCountyInfo(pricingResult.countyInfo);
        console.log('💰 Comprehensive pricing calculated:', pricingResult);
      }
    } catch (error) {
      console.error('Pricing calculation error:', error);
    }
  };

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ No authenticated user found');
        return;
      }

      console.log('🔍 Loading profile for user:', user.id);

      // Load user's profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('❌ Error loading profile:', profileError);
        return;
      }

      console.log('✅ Loaded profile:', profileData);
      setProfile(profileData);

      // Auto-populate data directly from profiles table
      if (profileData?.weight) {
        setClientWeight(profileData.weight.toString());
        setProfileDataLoaded(prev => ({ ...prev, weight: true }));
        console.log('✅ Loaded weight from profile:', profileData.weight);
      }
      
      if (profileData?.height_feet) {
        setClientHeightFeet(profileData.height_feet.toString());
        setProfileDataLoaded(prev => ({ ...prev, height: true }));
        console.log('✅ Loaded height_feet from profile:', profileData.height_feet);
      }
      
      if (profileData?.height_inches) {
        setClientHeightInches(profileData.height_inches.toString());
        setProfileDataLoaded(prev => ({ ...prev, height: true }));
        console.log('✅ Loaded height_inches from profile:', profileData.height_inches);
      }
      
      if (profileData?.date_of_birth) {
        setClientDOB(profileData.date_of_birth);
        setProfileDataLoaded(prev => ({ ...prev, dob: true }));
        console.log('✅ Loaded date_of_birth from profile:', profileData.date_of_birth);
      }
      
      // Auto-populate email from profile
      if (profileData?.email) {
        setClientEmail(profileData.email);
        setProfileDataLoaded(prev => ({ ...prev, email: true }));
        console.log('✅ Loaded email from profile:', profileData.email);
      }
      
    } catch (error) {
      console.error('❌ Error in loadData:', error);
    }
  };

  // Fetch address suggestions via proxy API
  const fetchAddressSuggestions = async (input) => {
    if (!input || input.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    setIsLoadingSuggestions(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      console.log('🔍 Fetching address suggestions for:', input);
      // Use production URL for autocomplete
      const autocompleteUrl = 'https://facility.compassionatecaretransportation.com';
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
      console.log('✅ Got autocomplete response:', data.status, data.predictions?.length, 'suggestions');

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

  // Get place details via proxy API
  const getPlaceDetails = async (placeId) => {
    try {
      // Use production URL for place details
      const autocompleteUrl = 'https://facility.compassionatecaretransportation.com';
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
        edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
        animated: true,
      });
    }
  };

  const handleBookTrip = async () => {
    if (!pickupAddress || !destinationAddress) {
      Alert.alert('Error', 'Please enter both pickup and destination addresses');
      return;
    }

    // Validate required fields
    if (!clientWeight) {
      Alert.alert('Missing Information', 'Please enter client weight');
      setLoading(false);
      return;
    }

    // Validate return time for round trips
    if (isRoundTrip) {
      const minReturnTime = getMinimumReturnTime();
      if (minReturnTime && returnTime < minReturnTime) {
        const formattedMinTime = minReturnTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        Alert.alert(
          'Invalid Return Time',
          `Return time must be at least ${formattedMinTime} to allow for travel time (${estimatedDuration}) plus a 15-minute buffer.`
        );
        return;
      }
    }

    setLoading(true);
    try {
      // Combine address with details if provided
      const fullPickupAddress = pickupDetails
        ? `${pickupAddress}, ${pickupDetails}`
        : pickupAddress;
      const fullDestinationAddress = destinationDetails
        ? `${destinationAddress}, ${destinationDetails}`
        : destinationAddress;

      const tripData = {
        user_id: user.id, // Individual user booking for themselves
        facility_id: null, // Not a facility booking
        managed_client_id: null, // Not a managed client
        pickup_address: fullPickupAddress,
        pickup_details: pickupDetails || null,
        destination_address: fullDestinationAddress,
        destination_details: destinationDetails || null,
        pickup_time: pickupDate.toISOString(),
        is_round_trip: isRoundTrip,
        wheelchair_type: wheelchairType,
        additional_passengers: parseInt(additionalPassengers) || 0,
        trip_notes: notes,
        status: 'pending',
        booked_by: user.id,
        bill_to: 'user', // Individual users pay for their own trips
        price: estimatedFare || 0,
        distance: distanceMiles > 0 ? Math.round(distanceMiles * 10) / 10 : null,
        route_duration: estimatedDuration || null,
        route_distance_text: distanceMiles > 0 ? `${distanceMiles.toFixed(1)} mi` : null,
        route_duration_text: estimatedDuration || null,
        pricing_breakdown_data: pricingBreakdown ? {
          pricing: pricingBreakdown,
          distance: { distance: distanceMiles, unit: 'miles' },
          summary: {
            isRoundTrip,
            isEmergency,
            wheelchairType,
            additionalPassengers: parseInt(additionalPassengers) || 0,
            billTo: 'user'
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
          createdAt: new Date().toISOString(),
          source: 'BookingMobileApp'
        } : null,
        pricing_breakdown_total: estimatedFare || null,
        pricing_breakdown_locked_at: estimatedFare ? new Date().toISOString() : null
      };

      const { error } = await supabase
        .from('trips')
        .insert([tripData]);

      if (error) throw error;

      Alert.alert('Success', 'Trip booked successfully!', [
        {
          text: 'View Trips',
          onPress: () => {
            resetForm();
            navigation.navigate('Trips');
          }
        },
        {
          text: 'Book Another',
          onPress: resetForm,
          style: 'cancel'
        }
      ]);
    } catch (error) {
      console.error('Error booking trip:', error);
      Alert.alert('Error', 'Failed to book trip. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setPickupAddress('');
    setDestinationAddress('');
    setPickupCoords(null);
    setDestinationCoords(null);
    setPickupDetails('');
    setDestinationDetails('');
    setIsRoundTrip(false);
    setReturnTime(new Date());
    setIsEmergency(false);
    setWheelchairType('none');
    setWheelchairRequirements({
      stepStool: false,
      smallerRamp: false,
      largerRamp: false,
      bariatricRamp: false,
      widerVehicle: false,
    });
    setWheelchairDetails('');
    setAdditionalPassengers('0');
    setNotes('');
    setClientWeight('');
    setClientHeightFeet('');
    setClientHeightInches('');
    setClientDOB('');
    setClientEmail('');
    setDistanceMiles(0);
    setEstimatedDuration('');
    setEstimatedFare(null);
    setPricingBreakdown(null);
    setShowPriceBreakdown(false);
    const defaultDate = new Date();
    defaultDate.setHours(defaultDate.getHours() + 1);
    setPickupDate(defaultDate);
  };

  const formatDateTime = (date) => {
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
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
            strokeColor="#7CCFD0"
            onReady={async (result) => {
              fitMapToRoute(pickupCoords, destinationCoords);

              // Use Google Directions API directly to get EXACT same results as web app
              // Web app uses DirectionsService with alternatives=true and selects fastest route
              try {
                console.log('🎯 Calling Google Directions API for fastest route selection...');
                console.log('🔑 Google Maps API Key:', GOOGLE_MAPS_API_KEY ? '✅ SET' : '❌ NOT SET');
                console.log('📍 Pickup:', pickupAddress);
                console.log('📍 Destination:', destinationAddress);

                const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(pickupAddress)}&destination=${encodeURIComponent(destinationAddress)}&alternatives=true&mode=driving&units=imperial&departure_time=now&traffic_model=best_guess&key=${GOOGLE_MAPS_API_KEY}`;

                console.log('🌐 Fetching directions from Google API...');
                const response = await fetch(directionsUrl);
                const data = await response.json();
                console.log('📦 Directions API response status:', data.status);
                console.log('📦 Full response:', JSON.stringify(data, null, 2));

                if (data.status === 'OK' && data.routes && data.routes.length > 0) {
                  console.log(`🎯 Found ${data.routes.length} alternative routes`);

                  // Find the fastest route (shortest duration) - EXACT same logic as web app
                  let fastestRoute = data.routes[0];
                  let shortestDuration = data.routes[0].legs[0].duration.value;
                  let fastestRouteIndex = 0;

                  for (let i = 1; i < data.routes.length; i++) {
                    const routeDuration = data.routes[i].legs[0].duration.value;
                    if (routeDuration < shortestDuration) {
                      shortestDuration = routeDuration;
                      fastestRoute = data.routes[i];
                      fastestRouteIndex = i;
                    }
                  }

                  const leg = fastestRoute.legs[0];
                  const distanceInMiles = leg.distance.value * 0.000621371; // meters to miles
                  const durationText = leg.duration.text;

                  console.log(`🎯 Selected fastest route ${fastestRouteIndex + 1}:`, {
                    distance: leg.distance.text,
                    duration: durationText,
                    miles: distanceInMiles.toFixed(2),
                    summary: fastestRoute.summary || 'No summary'
                  });

                  setDistanceMiles(Math.round(distanceInMiles * 100) / 100); // Round to 2 decimals (same as web)
                  setEstimatedDuration(durationText);

                  // Calculate comprehensive pricing with county detection and all fees
                  const pricingResult = await getPricingEstimate({
                    pickupAddress,
                    destinationAddress,
                    isRoundTrip,
                    pickupDateTime: pickupDate.toISOString(),
                    wheelchairType,
                    isEmergency,
                    distance: Math.round(distanceInMiles * 100) / 100,
                    clientWeight: clientWeight ? parseInt(clientWeight) : null,
                  });

                  if (pricingResult.success && pricingResult.pricing) {
                    setEstimatedFare(pricingResult.pricing.total);
                    setPricingBreakdown(pricingResult.pricing);
                    console.log('💰 Final price:', pricingResult.pricing.total);
                    console.log('💰 Breakdown:', pricingResult.pricing);
                  }
                } else {
                  throw new Error(`Directions API failed: ${data.status}`);
                }
              } catch (error) {
                console.error('❌ Google Directions API error:', error);
                // Fallback to MapViewDirections result
                const distanceInMiles = result.distance * 0.621371;
                const durationInMinutes = Math.round(result.duration);

                setDistanceMiles(distanceInMiles);
                setEstimatedDuration(`${durationInMinutes} min`);
                console.log('⚠️ Using MapViewDirections fallback:', distanceInMiles.toFixed(2), 'miles');

                // Calculate pricing with fallback distance
                const pricingResult = await getPricingEstimate({
                  pickupAddress,
                  destinationAddress,
                  isRoundTrip,
                  pickupDateTime: pickupDate.toISOString(),
                  wheelchairType,
                  isEmergency,
                  distance: distanceInMiles,
                  clientWeight: clientWeight ? parseInt(clientWeight) : null,
                });

                if (pricingResult.success && pricingResult.pricing) {
                  setEstimatedFare(pricingResult.pricing.total);
                }
              }
            }}
          />
        )}
      </MapView>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        <View style={styles.handle} />

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* User Info Display */}
          <View style={styles.inputCard}>
            <Text style={styles.label}>👤 Passenger</Text>
            {profile ? (
              <View style={styles.userInfoRow}>
                <Text style={styles.value}>
                  {profile.first_name} {profile.last_name}
                </Text>
                <TouchableOpacity
                  style={styles.editProfileButton}
                  onPress={() => navigation.navigate('Profile')}
                >
                  <Text style={styles.editProfileText}>Edit Profile</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.placeholder}>Loading...</Text>
            )}
          </View>

          {/* Pickup Address */}
          <TouchableOpacity
            style={styles.inputCard}
            onPress={() => {
              setAddressInputType('pickup');
              setShowAddressInput(true);
            }}
          >
            <Text style={styles.label}>📍 Pickup</Text>
            {pickupAddress ? (
              <Text style={styles.value} numberOfLines={2}>{pickupAddress}</Text>
            ) : (
              <Text style={styles.placeholder}>Enter pickup address</Text>
            )}
          </TouchableOpacity>

          {/* Destination Address */}
          <TouchableOpacity
            style={styles.inputCard}
            onPress={() => {
              setAddressInputType('destination');
              setShowAddressInput(true);
            }}
          >
            <Text style={styles.label}>🏁 Destination</Text>
            {destinationAddress ? (
              <Text style={styles.value} numberOfLines={2}>{destinationAddress}</Text>
            ) : (
              <Text style={styles.placeholder}>Enter destination address</Text>
            )}
          </TouchableOpacity>

          {/* Date & Time */}
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.inputCard, styles.half]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.label}>📅 Date</Text>
              <Text style={styles.value}>
                {pickupDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.inputCard, styles.half]}
              onPress={() => setShowTimePicker(true)}
            >
              <Text style={styles.label}>🕐 Time</Text>
              <Text style={styles.value}>
                {pickupDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Address Details */}
          {pickupAddress && (
            <View style={styles.inputCard}>
              <Text style={styles.label}>🏢 Apartment, Suite, Building (Optional)</Text>
              <TextInput
                style={styles.detailInput}
                value={pickupDetails}
                onChangeText={setPickupDetails}
                placeholder="e.g., Apt 101, Building A"
                placeholderTextColor="#999"
              />
            </View>
          )}

          {destinationAddress && (
            <View style={styles.inputCard}>
              <Text style={styles.label}>🏢 Building, Room Number (Optional)</Text>
              <TextInput
                style={styles.detailInput}
                value={destinationDetails}
                onChangeText={setDestinationDetails}
                placeholder="e.g., Room 304, East Wing"
                placeholderTextColor="#999"
              />
            </View>
          )}

          {/* Options */}
          <View style={styles.optionsSection}>
            <TouchableOpacity
              style={styles.option}
              onPress={() => setIsRoundTrip(!isRoundTrip)}
            >
              <View style={[styles.checkbox, isRoundTrip && styles.checkboxActive]}>
                {isRoundTrip && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionText}>Round Trip</Text>
                {isRoundTrip && (
                  <Text style={styles.optionSubtext}>The vehicle will wait for you and take you back to your pickup location.</Text>
                )}
              </View>
            </TouchableOpacity>

            {/* Return Time - Only show when Round Trip is checked */}
            {isRoundTrip && (
              <TouchableOpacity
                style={styles.inputCard}
                onPress={() => setShowReturnTimePicker(true)}
              >
                <Text style={styles.label}>🔄 Return Time</Text>
                <Text style={styles.value}>
                  {returnTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.option}
              onPress={() => setIsEmergency(!isEmergency)}
            >
              <View style={[styles.checkbox, isEmergency && styles.checkboxActive]}>
                {isEmergency && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.optionText}>🚨 Emergency Trip</Text>
                <Text style={styles.optionSubtext}>Additional $40 emergency fee applies</Text>
              </View>
            </TouchableOpacity>

            {/* Wheelchair Transportation Section */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>♿ Wheelchair Transportation</Text>
              <Text style={styles.sectionSubtitle}>What type of wheelchair do you have?</Text>

              {/* None - Client needs wheelchair assistance */}
              <TouchableOpacity
                style={[
                  styles.wheelchairOption,
                  wheelchairType === 'none' && styles.wheelchairOptionActive,
                ]}
                onPress={() => setWheelchairType('none')}
              >
                <View style={styles.wheelchairOptionHeader}>
                  <View style={[styles.radioButton, wheelchairType === 'none' && styles.radioButtonActive]}>
                    {wheelchairType === 'none' && <View style={styles.radioButtonInner} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.wheelchairOptionTitle}>None (Client will need wheelchair assistance)</Text>
                    <Text style={styles.wheelchairOptionDesc}>Client doesn't have their own wheelchair - facility will provide</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Manual Wheelchair */}
              <TouchableOpacity
                style={[
                  styles.wheelchairOption,
                  wheelchairType === 'manual' && styles.wheelchairOptionActive,
                ]}
                onPress={() => setWheelchairType('manual')}
              >
                <View style={styles.wheelchairOptionHeader}>
                  <View style={[styles.radioButton, wheelchairType === 'manual' && styles.radioButtonActive]}>
                    {wheelchairType === 'manual' && <View style={styles.radioButtonInner} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.wheelchairOptionTitle}>Manual wheelchair (I have my own)</Text>
                    <Text style={styles.wheelchairOptionDesc}>Standard manual wheelchair that you bring</Text>
                    <Text style={styles.wheelchairFee}>No additional fee</Text>
                  </View>
                </View>
                {wheelchairType === 'manual' && (
                  <View style={styles.wheelchairNote}>
                    <Text style={styles.wheelchairNoteText}>✓ My wheelchair is not wider than 36 inches from wheel to wheel</Text>
                    <Text style={styles.wheelchairNoteSubtext}>If your wheelchair is wider than 36 inches, please contact us to ensure we can accommodate your needs.</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Power Wheelchair */}
              <TouchableOpacity
                style={[
                  styles.wheelchairOption,
                  wheelchairType === 'power' && styles.wheelchairOptionActive,
                ]}
                onPress={() => setWheelchairType('power')}
              >
                <View style={styles.wheelchairOptionHeader}>
                  <View style={[styles.radioButton, wheelchairType === 'power' && styles.radioButtonActive]}>
                    {wheelchairType === 'power' && <View style={styles.radioButtonInner} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.wheelchairOptionTitle}>Power wheelchair (I have my own)</Text>
                    <Text style={styles.wheelchairOptionDesc}>Electric/motorized wheelchair that you bring</Text>
                    <Text style={styles.wheelchairFee}>No additional fee</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Transport Wheelchair - Disabled */}
              <View style={[styles.wheelchairOption, styles.wheelchairOptionDisabled]}>
                <View style={styles.wheelchairOptionHeader}>
                  <View style={styles.radioButtonDisabled}>
                    <Text style={styles.radioButtonDisabledIcon}>✕</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.wheelchairOptionTitleDisabled}>Transport wheelchair</Text>
                    <Text style={styles.wheelchairOptionNotAvailable}>Not Available</Text>
                    <Text style={styles.wheelchairOptionDesc}>Lightweight transport chair - Not permitted for safety reasons</Text>
                  </View>
                </View>
              </View>

              {/* Provide Wheelchair Option */}
              <View style={styles.wheelchairDivider} />
              <Text style={styles.wheelchairSectionLabel}>Do you want us to provide a wheelchair?</Text>

              <TouchableOpacity
                style={[
                  styles.wheelchairOption,
                  wheelchairType === 'provided' && styles.wheelchairOptionActive,
                ]}
                onPress={() => setWheelchairType('provided')}
              >
                <View style={styles.wheelchairOptionHeader}>
                  <View style={[styles.radioButton, wheelchairType === 'provided' && styles.radioButtonActive]}>
                    {wheelchairType === 'provided' && <View style={styles.radioButtonInner} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.wheelchairOptionTitle}>Yes, please provide a wheelchair</Text>
                    <Text style={styles.wheelchairOptionDesc}>We will provide a suitable wheelchair for your trip</Text>
                    <Text style={styles.wheelchairFeeHighlight}>+$0 wheelchair rental fee</Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Additional Requirements - Show when "provided" is selected */}
              {wheelchairType === 'provided' && (
                <View style={styles.wheelchairRequirementsSection}>
                  <Text style={styles.wheelchairRequirementsTitle}>Please specify wheelchair and equipment requirements:</Text>

                  {/* Step Stool */}
                  <TouchableOpacity
                    style={styles.requirementOption}
                    onPress={() => setWheelchairRequirements({
                      ...wheelchairRequirements,
                      stepStool: !wheelchairRequirements.stepStool
                    })}
                  >
                    <View style={[
                      styles.requirementCheckbox,
                      wheelchairRequirements.stepStool && styles.requirementCheckboxActive
                    ]}>
                      {wheelchairRequirements.stepStool && <Text style={styles.requirementCheckmark}>✓</Text>}
                    </View>
                    <Text style={styles.requirementLabel}>Step stool</Text>
                  </TouchableOpacity>

                  {/* Smaller Ramp */}
                  <TouchableOpacity
                    style={styles.requirementOption}
                    onPress={() => setWheelchairRequirements({
                      ...wheelchairRequirements,
                      smallerRamp: !wheelchairRequirements.smallerRamp
                    })}
                  >
                    <View style={[
                      styles.requirementCheckbox,
                      wheelchairRequirements.smallerRamp && styles.requirementCheckboxActive
                    ]}>
                      {wheelchairRequirements.smallerRamp && <Text style={styles.requirementCheckmark}>✓</Text>}
                    </View>
                    <Text style={styles.requirementLabel}>Smaller ramp</Text>
                  </TouchableOpacity>

                  {/* Larger Ramp */}
                  <TouchableOpacity
                    style={styles.requirementOption}
                    onPress={() => setWheelchairRequirements({
                      ...wheelchairRequirements,
                      largerRamp: !wheelchairRequirements.largerRamp
                    })}
                  >
                    <View style={[
                      styles.requirementCheckbox,
                      wheelchairRequirements.largerRamp && styles.requirementCheckboxActive
                    ]}>
                      {wheelchairRequirements.largerRamp && <Text style={styles.requirementCheckmark}>✓</Text>}
                    </View>
                    <Text style={styles.requirementLabel}>Larger ramp</Text>
                  </TouchableOpacity>

                  {/* Bariatric Ramp */}
                  <TouchableOpacity
                    style={styles.requirementOption}
                    onPress={() => setWheelchairRequirements({
                      ...wheelchairRequirements,
                      bariatricRamp: !wheelchairRequirements.bariatricRamp
                    })}
                  >
                    <View style={[
                      styles.requirementCheckbox,
                      wheelchairRequirements.bariatricRamp && styles.requirementCheckboxActive
                    ]}>
                      {wheelchairRequirements.bariatricRamp && <Text style={styles.requirementCheckmark}>✓</Text>}
                    </View>
                    <Text style={styles.requirementLabel}>Bariatric ramp</Text>
                  </TouchableOpacity>

                  {/* Wider Vehicle */}
                  <TouchableOpacity
                    style={styles.requirementOption}
                    onPress={() => setWheelchairRequirements({
                      ...wheelchairRequirements,
                      widerVehicle: !wheelchairRequirements.widerVehicle
                    })}
                  >
                    <View style={[
                      styles.requirementCheckbox,
                      wheelchairRequirements.widerVehicle && styles.requirementCheckboxActive
                    ]}>
                      {wheelchairRequirements.widerVehicle && <Text style={styles.requirementCheckmark}>✓</Text>}
                    </View>
                    <Text style={styles.requirementLabel}>Wider vehicle</Text>
                  </TouchableOpacity>

                  {/* Additional Details */}
                  <View style={styles.requirementDetailsSection}>
                    <Text style={styles.requirementDetailsLabel}>Additional details: specific wheelchair type, special accommodations, accessibility needs, etc.</Text>
                    <TextInput
                      style={styles.requirementDetailsInput}
                      value={wheelchairDetails}
                      onChangeText={setWheelchairDetails}
                      placeholder="Enter any specific requirements..."
                      placeholderTextColor="#999"
                      multiline
                      numberOfLines={3}
                    />
                    <Text style={styles.requirementDetailsNote}>We have regular-sized/standard manual wheelchairs and one bariatric wheelchair available. Transport chairs are not recommended for safety reasons.</Text>
                  </View>

                  {/* Rental Fee Info */}
                  <View style={styles.rentalFeeBox}>
                    <Text style={styles.rentalFeeTitle}>Wheelchair Rental Fee</Text>
                    <Text style={styles.rentalFeeAmount}>+$0</Text>
                    <Text style={styles.rentalFeeDesc}>This fee covers wheelchair rental and assistance</Text>
                  </View>
                </View>
              )}

              {/* Wheelchair Info */}
              <View style={styles.wheelchairInfoBox}>
                <Text style={styles.wheelchairInfoTitle}>♿ Wheelchair Accessibility Information</Text>
                <Text style={styles.wheelchairInfoText}>All our vehicles are equipped with wheelchair accessibility features. The same fee applies to all wheelchair types to ensure fair and transparent pricing.</Text>
              </View>
            </View>

            {/* Additional Passengers */}
            <View style={styles.passengerCounter}>
              <Text style={styles.label}>👥 Additional Passengers</Text>
              <View style={styles.counterRow}>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setAdditionalPassengers(Math.max(0, parseInt(additionalPassengers) - 1).toString())}
                >
                  <Text style={styles.counterBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.counterValue}>{additionalPassengers}</Text>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setAdditionalPassengers((parseInt(additionalPassengers) + 1).toString())}
                >
                  <Text style={styles.counterBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Notes */}
            <View style={styles.notesSection}>
              <Text style={styles.label}>📝 Trip Notes</Text>
              <TextInput
                style={styles.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder="Special instructions, medical equipment, etc."
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Your Information Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>👤 Your Information</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                <Text style={styles.editProfileLink}>Edit Profile ✏️</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.infoNotice}>
              <Text style={styles.infoNoticeText}>
                📋 This information is loaded from your profile. To update, tap "Edit Profile" above.
              </Text>
            </View>
            <Text style={styles.sectionSubtitle}>Required for accurate pricing and vehicle selection</Text>

            <View style={styles.inputCard}>
              <Text style={styles.label}>Weight (lbs) *</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyValue}>
                  {clientWeight || 'Not set'}
                </Text>
              </View>
              {clientWeight && parseInt(clientWeight) >= 400 && (
                <View style={styles.errorNotice}>
                  <Text style={styles.errorNoticeText}>🚫 Cannot accommodate rides over 400 lbs - Please contact us for alternative arrangements</Text>
                </View>
              )}
              {clientWeight && parseInt(clientWeight) >= 300 && parseInt(clientWeight) < 400 && (
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
              <Text style={styles.helpText}>Required for hospital record verification</Text>
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

          {/* Pricing Display with Breakdown */}
          {estimatedFare !== null && distanceMiles > 0 && pricingBreakdown && (
            <View style={styles.pricingCard}>
              <Text style={styles.pricingCardTitle}>Fare Estimate</Text>
              <Text style={styles.pricingCardSubtitle}>
                {isRoundTrip ? `Round Trip • ${(distanceMiles * 2).toFixed(1)} miles (${distanceMiles.toFixed(1)} mi each way)` : `One Way • ${distanceMiles.toFixed(1)} miles`}
              </Text>

              {estimatedDuration && (
                <Text style={styles.pricingCardSubtitle}>
                  Est. travel time: {isRoundTrip ? `${estimatedDuration} each way` : estimatedDuration}
                </Text>
              )}

              <Text style={styles.pricingCardTotal}>{formatCurrency(estimatedFare)}</Text>

              <TouchableOpacity
                style={styles.breakdownToggle}
                onPress={() => setShowPriceBreakdown(!showPriceBreakdown)}
              >
                <Text style={styles.breakdownToggleText}>
                  {showPriceBreakdown ? '▼' : '▶'} View price breakdown
                </Text>
              </TouchableOpacity>

              {showPriceBreakdown && (
                <View style={styles.breakdownSection}>
                  {/* Base Fare */}
                  {pricingBreakdown.basePrice > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>
                        Base fare ({isRoundTrip ? '2' : '1'} leg @ {pricingBreakdown.isBariatric ? '$150' : '$50'}/leg)
                      </Text>
                      <Text style={styles.breakdownValue}>
                        {formatCurrency(pricingBreakdown.basePrice + pricingBreakdown.roundTripPrice)}
                      </Text>
                    </View>
                  )}

                  {/* Distance Charge */}
                  {pricingBreakdown.distancePrice > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>
                        Distance charge ({countyInfo?.isInFranklinCounty ? '$3/mile (Franklin County)' : '$4/mile (Outside Franklin County)'})
                      </Text>
                      <Text style={styles.breakdownValue}>{formatCurrency(pricingBreakdown.distancePrice)}</Text>
                    </View>
                  )}

                  {/* County Surcharge */}
                  {pricingBreakdown.countyPrice > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>
                        County surcharge ({countyInfo?.countiesOut || 2} counties @ $50/county)
                      </Text>
                      <Text style={styles.breakdownValue}>{formatCurrency(pricingBreakdown.countyPrice)}</Text>
                    </View>
                  )}

                  {/* Dead Mileage */}
                  {pricingBreakdown.deadMileagePrice > 0 && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>
                        Dead mileage ({(pricingBreakdown.deadMileagePrice / 4).toFixed(1)} mi @ $4/mile)
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

              {pricingBreakdown.deadMileagePrice > 0 && (
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
            </View>
          )}

          {/* Book Button */}
          <TouchableOpacity
            style={[
              styles.bookButton,
              (loading || (clientWeight && parseInt(clientWeight) >= 400)) && styles.bookButtonDisabled
            ]}
            onPress={handleBookTrip}
            disabled={loading || !!(clientWeight && parseInt(clientWeight) >= 400)}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.bookButtonText}>
                {clientWeight && parseInt(clientWeight) >= 400 ? 'Cannot Book - Contact Us' : 'Book Trip'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 20 }} />
        </ScrollView>
      </View>

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
            <ActivityIndicator style={styles.loadingIndicator} color="#7CCFD0" />
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

      {/* Date Picker - Calendar View */}
      {showDatePicker && Platform.OS === 'ios' && (
        <Modal visible={showDatePicker} transparent animationType="slide">
          <View style={styles.pickerModalOverlay}>
            <View style={styles.calendarModalContent}>
              <View style={styles.pickerHeader}>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.pickerCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.pickerTitle}>Select Date</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={styles.pickerDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <Calendar
                current={pickupDate.toISOString().split('T')[0]}
                minDate={new Date().toISOString().split('T')[0]}
                onDayPress={(day) => {
                  // Parse date string in local timezone to avoid off-by-one errors
                  const [year, month, dayNum] = day.dateString.split('-').map(Number);
                  const selected = new Date(year, month - 1, dayNum);
                  selected.setHours(pickupDate.getHours());
                  selected.setMinutes(pickupDate.getMinutes());
                  setPickupDate(selected);
                  setShowDatePicker(false);
                }}
                markedDates={{
                  [pickupDate.toISOString().split('T')[0]]: {
                    selected: true,
                    selectedColor: '#7CCFD0',
                  }
                }}
                theme={{
                  backgroundColor: '#ffffff',
                  calendarBackground: '#ffffff',
                  textSectionTitleColor: '#2E4F54',
                  selectedDayBackgroundColor: '#7CCFD0',
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: '#7CCFD0',
                  dayTextColor: '#2E4F54',
                  textDisabledColor: '#d9e1e8',
                  dotColor: '#7CCFD0',
                  selectedDotColor: '#ffffff',
                  arrowColor: '#7CCFD0',
                  monthTextColor: '#2E4F54',
                  textDayFontWeight: '500',
                  textMonthFontWeight: 'bold',
                  textDayHeaderFontWeight: '600',
                  textDayFontSize: 16,
                  textMonthFontSize: 18,
                  textDayHeaderFontSize: 14,
                }}
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
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setPickupDate(selectedDate);
            }
          }}
          minimumDate={new Date()}
        />
      )}

      {/* Time Picker - Clean Modal */}
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
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setPickupDate(selectedDate);
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
          onChange={(event, selectedDate) => {
            setShowTimePicker(false);
            if (selectedDate) {
              setPickupDate(selectedDate);
            }
          }}
        />
      )}

      {/* Return Time Picker - Clean Modal */}
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
                onChange={(event, selectedDate) => {
                  if (selectedDate) {
                    setReturnTime(selectedDate);
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
          onChange={(event, selectedDate) => {
            setShowReturnTimePicker(false);
            if (selectedDate) {
              setReturnTime(selectedDate);
            }
          }}
        />
      )}
    </View>
  );
}

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
    maxHeight: '60%',
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
  inputCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#2E4F54',
    fontWeight: '500',
  },
  userInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editProfileButton: {
    backgroundColor: '#7CCFD0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  editProfileText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  placeholder: {
    fontSize: 16,
    color: '#999',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  half: {
    flex: 1,
  },
  optionsSection: {
    marginVertical: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#DDD',
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
    fontWeight: 'bold',
    fontSize: 16,
  },
  optionText: {
    fontSize: 16,
    color: '#2E4F54',
  },
  wheelchairOptions: {
    marginTop: 12,
  },
  wheelchairOption: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  wheelchairOptionActive: {
    borderColor: '#7CCFD0',
    backgroundColor: '#F0FAFA',
  },
  wheelchairOptionDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
    opacity: 0.6,
  },
  wheelchairOptionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#DDD',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  radioButtonActive: {
    borderColor: '#7CCFD0',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#7CCFD0',
  },
  radioButtonDisabled: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#CCC',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    marginTop: 2,
  },
  radioButtonDisabledIcon: {
    fontSize: 14,
    color: '#999',
  },
  wheelchairOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E4F54',
    marginBottom: 4,
  },
  wheelchairOptionTitleDisabled: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    marginBottom: 4,
  },
  wheelchairOptionDesc: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  wheelchairOptionNotAvailable: {
    fontSize: 13,
    color: '#FF6B35',
    fontWeight: '600',
    marginBottom: 4,
  },
  wheelchairFee: {
    fontSize: 14,
    color: '#7CCFD0',
    fontWeight: '600',
    marginTop: 4,
  },
  wheelchairFeeHighlight: {
    fontSize: 14,
    color: '#2E4F54',
    fontWeight: '600',
    marginTop: 4,
  },
  wheelchairNote: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  wheelchairNoteText: {
    fontSize: 14,
    color: '#2E4F54',
    fontWeight: '600',
    marginBottom: 6,
  },
  wheelchairNoteSubtext: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  wheelchairDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  wheelchairSectionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2E4F54',
    marginBottom: 12,
  },
  wheelchairInfoBox: {
    backgroundColor: '#E6F7F7',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#7CCFD0',
  },
  wheelchairInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E4F54',
    marginBottom: 6,
  },
  wheelchairInfoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  wheelchairRequirementsSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#7CCFD0',
  },
  wheelchairRequirementsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2E4F54',
    marginBottom: 16,
  },
  requirementOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  requirementCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#DDD',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  requirementCheckboxActive: {
    borderColor: '#7CCFD0',
    backgroundColor: '#7CCFD0',
  },
  requirementCheckmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  requirementLabel: {
    fontSize: 15,
    color: '#2E4F54',
  },
  requirementDetailsSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  requirementDetailsLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  requirementDetailsInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    padding: 12,
    fontSize: 15,
    color: '#2E4F54',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  requirementDetailsNote: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  rentalFeeBox: {
    backgroundColor: '#E6F7F7',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#7CCFD0',
  },
  rentalFeeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E4F54',
    marginBottom: 4,
  },
  rentalFeeAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#7CCFD0',
    marginBottom: 4,
  },
  rentalFeeDesc: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  bookButton: {
    backgroundColor: '#7CCFD0',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  bookButtonDisabled: {
    opacity: 0.6,
  },
  bookButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2E4F54',
  },
  modalClose: {
    fontSize: 28,
    color: '#999',
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#F8F9FA',
  },
  clientItemActive: {
    backgroundColor: '#E6F7F7',
    borderWidth: 2,
    borderColor: '#7CCFD0',
  },
  clientAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#7CCFD0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clientAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E4F54',
  },
  clientPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
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
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  pickerModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
  },
  calendarModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
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
  pricingCard: {
    backgroundColor: '#E6F7F7',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  pricingLabel: {
    fontSize: 14,
    color: '#666',
  },
  pricingValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2E4F54',
  },
  pricingDivider: {
    height: 1,
    backgroundColor: '#7CCFD0',
    marginVertical: 8,
  },
  pricingTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E4F54',
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
  pricingDisclaimer: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    lineHeight: 16,
  },
  passengerCounter: {
    marginTop: 16,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  counterBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7CCFD0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBtnText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
  },
  counterValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2E4F54',
    marginHorizontal: 24,
    minWidth: 40,
    textAlign: 'center',
  },
  notesSection: {
    marginTop: 16,
  },
  notesInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#2E4F54',
    marginTop: 8,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  detailInput: {
    fontSize: 15,
    color: '#2E4F54',
    marginTop: 8,
  },
  optionSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E4F54',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  textInput: {
    fontSize: 15,
    color: '#2E4F54',
    marginTop: 8,
    paddingVertical: 4,
  },
  warningText: {
    fontSize: 13,
    color: '#FF6B35',
    marginTop: 8,
    fontWeight: '600',
  },
  errorNotice: {
    backgroundColor: '#FFE5E5',
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
  },
  errorNoticeText: {
    fontSize: 14,
    color: '#991B1B',
    lineHeight: 20,
    fontWeight: '600',
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  textInputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  editProfileLink: {
    fontSize: 13,
    color: '#7CCFD0',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  infoNotice: {
    backgroundColor: '#E0F7F7',
    borderLeftWidth: 4,
    borderLeftColor: '#7CCFD0',
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
  },
  infoNoticeText: {
    fontSize: 13,
    color: '#2E4F54',
    lineHeight: 18,
  },
  readOnlyField: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
});

