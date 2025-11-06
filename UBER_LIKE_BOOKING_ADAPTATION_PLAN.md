# UberLikeBookingScreen Adaptation Plan
## Adapting facility_mobile booking UI for booking_mobile (individual users)

### Key Differences Between Apps

#### facility_mobile (Facilities):
- Books trips for **multiple clients** (facility_managed_clients table)
- Has client selector UI
- Bill-to options: facility or client
- Stores managed_client_id in trips table

#### booking_mobile (Individual Users):
- Books trips for **themselves** (self-booking)
- No client selector needed
- Always bill to the user
- Stores user_id in trips table (no managed_client_id)

### Required Changes

#### 1. Data Loading (loadData function)
**OLD (facility_mobile):**
```javascript
const loadData = async () => {
  // Load profile and facility clients
  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, facility_id, first_name, last_name')
    .eq('id', user.id)
    .single();
  
  setProfile(profileData);
  
  // Load clients for facility
  const { data: clientsData } = await supabase
    .from('facility_managed_clients')
    .select('*')
    .eq('facility_id', profileData.facility_id);
  
  setClients(clientsData || []);
};
```

**NEW (booking_mobile):**
```javascript
const loadData = async () => {
  // Load user's own profile - they are the passenger
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  const { data: profileData } = await supabase
    .from('profiles')
    .select('*, client_profiles(*)')
    .eq('id', user.id)
    .single();
  
  setProfile(profileData);
  
  // Auto-populate user info
  if (profileData?.client_profiles) {
    const clientProfile = profileData.client_profiles;
    setClientWeight(clientProfile.weight?.toString() || '');
    setClientHeightFeet(clientProfile.height_feet?.toString() || '');
    setClientHeightInches(clientProfile.height_inches?.toString() || '');
    setClientDOB(clientProfile.date_of_birth || '');
    setClientEmail(profileData.email || '');
  }
};
```

#### 2. Remove Client Selection UI
**Remove:**
- `selectedClient` state
- `showClientSelector` modal
- Client selector button and modal UI
- Client pre-selection logic from route params

**Replace Passenger Display:**
```javascript
// OLD: Show selected client
{selectedClient && (
  <Text>{selectedClient.first_name} {selectedClient.last_name}</Text>
)}

// NEW: Show current user
{profile && (
  <Text>{profile.first_name} {profile.last_name}</Text>
)}
```

#### 3. Simplify Bill-To Logic
**Remove:**
- `billTo` state
- Bill-to selector UI (facility vs client)

**Always bill to user** in trip submission

#### 4. Trip Submission Changes
**OLD (facility_mobile):**
```javascript
const tripData = {
  facility_id: profile.facility_id,
  managed_client_id: selectedClient.id,
  user_id: null, // Managed clients don't have user_id
  booked_by: profile.id,
  bill_to: billTo,
  // ...
};
```

**NEW (booking_mobile):**
```javascript
const tripData = {
  user_id: profile.id, // User books for themselves
  managed_client_id: null,
  facility_id: null,
  booked_by: profile.id, // Same as user_id
  // bill_to removed - always user
  // ...
};
```

#### 5. Enhanced Client Information Fields
**Keep these fields** but auto-populate from user's profile:
- Weight (from client_profiles.weight)
- Height (from client_profiles.height_feet, height_inches)
- DOB (from client_profiles.date_of_birth)
- Email (from profiles.email)

#### 6. State Variables to Remove/Modify

**Remove:**
- `clients` - array of facility clients
- `selectedClient` - selected client object
- `showClientSelector` - client picker modal
- `billTo` - billing target

**Keep all other state:**
- Address fields
- Date/time pickers
- Wheelchair options
- Trip notes
- Pricing
- Map state
- etc.

### Implementation Steps

1. ✅ Copy UberLikeBookingScreen.js to booking_mobile
2. ⏳ Modify loadData function
3. ⏳ Remove client selection UI components
4. ⏳ Update passenger display section
5. ⏳ Simplify trip submission
6. ⏳ Test all functionality

### UI Sections to Keep (No Changes)

✅ Map view
✅ Address input with autocomplete
✅ Apartment/Suite and Building/Room fields
✅ Date/Time pickers
✅ Round trip toggle
✅ Emergency trip toggle
✅ Wheelchair transportation section
✅ Enhanced client information section
✅ Additional passengers
✅ Trip notes
✅ Fare estimate display
✅ Pricing breakdown

### UI Sections to Remove/Modify

❌ Client selector button
❌ Client selector modal
❌ "Select a client" prompt
❌ Bill-to selector
✏️ Passenger info (show current user instead)

### Expected Result

A beautiful, Uber-like booking interface for individual users that:
- Shows the user as the passenger automatically
- Has all the enhanced UI from facility_mobile
- Books trips for the logged-in user
- Maintains all functionality (wheelchair, pricing, etc.)
- Matches the screenshot UI exactly
