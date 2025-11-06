#!/usr/bin/env node

/**
 * Adapt UberLikeBookingScreen from facility_mobile to booking_mobile
 * 
 * Changes:
 * 1. Remove client selection (user books for themselves)
 * 2. Auto-load current user profile
 * 3. Remove facility-specific fields
 * 4. Simplify trip submission
 */

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'screens', 'UberLikeBookingScreen.js');

console.log('🔧 Adapting UberLikeBookingScreen for booking_mobile...\n');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Track changes
let changes = [];

// 1. Update imports - remove facility-specific, keep pricing
content = content.replace(
  /const API_URL = process\.env\.EXPO_PUBLIC_API_URL;/,
  `const API_URL = process.env.EXPO_PUBLIC_API_URL;\n\n// Import auth hook for current user\nimport { useAuth } from '../hooks/useAuth';`
);
changes.push('✅ Added useAuth import');

// 2. Remove clients state, add useAuth
content = content.replace(
  /const \[profile, setProfile\] = useState\(null\);/,
  `const { user } = useAuth(); // Get current logged-in user\n  const [profile, setProfile] = useState(null);`
);
changes.push('✅ Added useAuth hook to get current user');

// 3. Simplify loadData function - remove client fetching
const loadDataOld = /const loadData = async \(\) => {[\s\S]*?};/m;
const loadDataNew = `const loadData = async () => {
    try {
      setLoading(true);

      // Get current user's profile (they are booking for themselves)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        console.error('No authenticated user found');
        Alert.alert('Error', 'You must be logged in to book a trip');
        navigation.navigate('Login');
        return;
      }

      // Fetch user's profile
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        Alert.alert('Error', 'Could not load your profile');
        return;
      }

      setProfile(userProfile);

      // Auto-populate user information
      if (userProfile) {
        if (userProfile.email) setClientEmail(userProfile.email);
        if (userProfile.weight) setClientWeight(userProfile.weight.toString());
        if (userProfile.height_feet) setClientHeightFeet(userProfile.height_feet.toString());
        if (userProfile.height_inches) setClientHeightInches(userProfile.height_inches.toString());
        if (userProfile.date_of_birth) setClientDOB(userProfile.date_of_birth);
        
        console.log('✅ User profile loaded:', userProfile.first_name, userProfile.last_name);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load your profile');
    } finally {
      setLoading(false);
    }
  };`;

if (loadDataOld.test(content)) {
  content = content.replace(loadDataOld, loadDataNew);
  changes.push('✅ Simplified loadData function (removed client fetching)');
}

// 4. Remove client pre-selection useEffect
content = content.replace(
  /\/\/ Pre-select client if passed from navigation[\s\S]*?}, \[route\?\.\params\?\clientId, clients\]\);/,
  '// Client selection removed - user books for themselves'
);
changes.push('✅ Removed client pre-selection useEffect');

// 5. Remove showClientSelector state and modal
content = content.replace(
  /const \[showClientSelector, setShowClientSelector\] = useState\(false\);/,
  '// Client selector removed - user books for themselves'
);
changes.push('✅ Removed showClientSelector state');

// 6. Update handleBookTrip to use current user instead of selected client
const handleBookTripOld = /const handleBookTrip = async \(\) => {[\s\S]*?};/m;
const handleBookTripNew = `const handleBookTrip = async () => {
    try {
      // Validation
      if (!profile) {
        Alert.alert('Error', 'Your profile could not be loaded. Please try again.');
        return;
      }

      if (!pickupAddress || !destinationAddress) {
        Alert.alert('Error', 'Please enter both pickup and destination addresses');
        return;
      }

      if (!pickupDate) {
        Alert.alert('Error', 'Please select a pickup date and time');
        return;
      }

      if (!clientWeight || parseFloat(clientWeight) < 50 || parseFloat(clientWeight) > 1000) {
        Alert.alert('Error', 'Please enter a valid weight (50-1000 lbs)');
        return;
      }

      setLoading(true);

      // Prepare trip data for INDIVIDUAL USER (not facility client)
      const tripData = {
        user_id: profile.id,           // Current user
        facility_id: null,             // NULL for individual bookings
        managed_client_id: null,       // NULL for individual bookings
        pickup_address: pickupAddress,
        destination_address: destinationAddress,
        pickup_details: pickupDetails,
        destination_details: destinationDetails,
        pickup_date: pickupDate.toISOString(),
        pickup_time: pickupDate.toISOString(),
        return_time: isRoundTrip ? returnTime.toISOString() : null,
        is_round_trip: isRoundTrip,
        is_emergency: isEmergency,
        wheelchair_type: wheelchairType,
        wheelchair_requirements: JSON.stringify(wheelchairRequirements),
        additional_passengers: parseInt(additionalPassengers) || 0,
        notes: notes,
        status: 'pending',
        
        // Enhanced client information
        client_weight: parseFloat(clientWeight),
        client_height_feet: clientHeightFeet ? parseInt(clientHeightFeet) : null,
        client_height_inches: clientHeightInches ? parseInt(clientHeightInches) : null,
        client_dob: clientDOB || null,
        client_email: clientEmail || profile.email,
        
        // Pricing information
        estimated_price: estimatedFare,
        distance_miles: distanceMiles,
        pricing_breakdown: pricingBreakdown ? JSON.stringify(pricingBreakdown) : null,
      };

      // Insert trip into database
      const { data: newTrip, error: insertError } = await supabase
        .from('trips')
        .insert([tripData])
        .select()
        .single();

      if (insertError) {
        console.error('Error creating trip:', insertError);
        Alert.alert('Error', \`Failed to book trip: \${insertError.message}\`);
        return;
      }

      console.log('✅ Trip created successfully:', newTrip.id);

      // Show success message
      Alert.alert(
        'Trip Booked!',
        'Your trip has been successfully booked. You will receive a confirmation shortly.',
        [
          {
            text: 'View Trips',
            onPress: () => navigation.navigate('Trips')
          },
          {
            text: 'Book Another',
            onPress: () => {
              // Reset form
              setPickupAddress('');
              setDestinationAddress('');
              setPickupCoords(null);
              setDestinationCoords(null);
              setNotes('');
              setIsRoundTrip(false);
              setIsEmergency(false);
              setWheelchairType('none');
              setAdditionalPassengers('0');
            }
          }
        ]
      );

    } catch (error) {
      console.error('Error in handleBookTrip:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };`;

if (handleBookTripOld.test(content)) {
  content = content.replace(handleBookTripOld, handleBookTripNew);
  changes.push('✅ Updated handleBookTrip for individual users');
}

// 7. Remove billTo state (always individual for booking_mobile)
content = content.replace(
  /const \[billTo, setBillTo\] = useState\('facility'\);/,
  '// billTo removed - always billed to individual user'
);
changes.push('✅ Removed billTo state');

// 8. Update passenger display section
content = content.replace(
  /{\/\* Passenger Selection \*\/}[\s\S]*?{\/\* End Passenger Selection \*\/}/,
  `{/* Passenger Information */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>👤</Text>
            <Text style={styles.sectionTitle}>Passenger</Text>
          </View>
          
          <View style={styles.passengerCard}>
            <View style={styles.passengerInfo}>
              <Text style={styles.passengerName}>
                {profile?.first_name} {profile?.last_name}
              </Text>
              <Text style={styles.passengerEmail}>{profile?.email}</Text>
              {profile?.phone_number && (
                <Text style={styles.passengerPhone}>{profile?.phone_number}</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* End Passenger Information */}`
);
changes.push('✅ Updated passenger display (removed client selector)');

// 9. Remove client selector modal
content = content.replace(
  /{\/\* Client Selection Modal \*\/}[\s\S]*?{\/\* End Client Selection Modal \*\/}/,
  '// Client selector modal removed - not needed for individual bookings'
);
changes.push('✅ Removed client selector modal');

// Write the updated content
fs.writeFileSync(filePath, content, 'utf8');

// Print summary
console.log('\n📋 Changes Summary:\n');
changes.forEach(change => console.log(change));

console.log('\n✅ Adaptation complete!');
console.log('\n📁 File updated:', filePath);
console.log('\n🎯 Next steps:');
console.log('   1. Test the booking screen');
console.log('   2. Verify user profile loads correctly');
console.log('   3. Test trip creation');
console.log('   4. Check that trips appear in "My Trips" tab');
console.log('');
