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
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';

const ProfileScreen = ({ navigation }) => {
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
    weight: '',
    height_feet: '',
    height_inches: '',
    date_of_birth: '',
    address: '',
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setProfile({
          full_name: data.full_name || '',
          phone: data.phone_number || '', // Map phone_number to phone
          weight: data.weight?.toString() || '',
          height_feet: data.height_feet?.toString() || '',
          height_inches: data.height_inches?.toString() || '',
          date_of_birth: data.date_of_birth || '',
          address: data.address || '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile.full_name || !profile.phone) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setSaving(true);

    try {
      // Split full_name into first_name and last_name
      const nameParts = profile.full_name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const { error} = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          first_name: firstName,
          last_name: lastName,
          // full_name is auto-generated, don't include it
          phone_number: profile.phone, // Map phone to phone_number
          weight: profile.weight ? parseFloat(profile.weight) : null,
          height_feet: profile.height_feet ? parseInt(profile.height_feet) : null,
          height_inches: profile.height_inches ? parseInt(profile.height_inches) : null,
          date_of_birth: profile.date_of_birth || null,
          address: profile.address || null,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            const { error } = await signOut();
            if (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5fbfc0" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile.full_name?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.emailText}>{user.email}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full name"
            value={profile.full_name}
            onChangeText={(text) => setProfile({ ...profile, full_name: text })}
          />

          <Text style={styles.label}>Phone Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your phone number"
            value={profile.phone}
            onChangeText={(text) => setProfile({ ...profile, phone: text })}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Weight (lbs)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your weight in pounds"
            value={profile.weight}
            onChangeText={(text) => setProfile({ ...profile, weight: text })}
            keyboardType="numeric"
          />
          {profile.weight && parseFloat(profile.weight) >= 400 && (
            <View style={{backgroundColor: '#fee', borderWidth: 2, borderColor: '#f00', borderRadius: 8, padding: 12, marginTop: 8}}>
              <Text style={{fontSize: 13, color: '#c00', fontWeight: 'bold'}}>
                🚫 Cannot accommodate rides over 400 lbs - Please contact us for alternative arrangements
              </Text>
            </View>
          )}
          {profile.weight && parseFloat(profile.weight) >= 300 && parseFloat(profile.weight) < 400 && (
            <Text style={{fontSize: 13, color: '#5fbfc0', fontWeight: '600', marginTop: 5}}>
              ⚠️ Bariatric rate applies ($150 per leg)
            </Text>
          )}

          <Text style={styles.label}>Height *</Text>
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={profile.height_feet}
                  onValueChange={(value) => setProfile({ ...profile, height_feet: value })}
                  style={styles.picker}
                  itemStyle={{height: 50}}
                >
                  <Picker.Item label="Feet" value="" />
                  <Picker.Item label="4 ft" value="4" />
                  <Picker.Item label="5 ft" value="5" />
                  <Picker.Item label="6 ft" value="6" />
                  <Picker.Item label="7 ft" value="7" />
                </Picker>
              </View>
            </View>
            <View style={styles.halfWidth}>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={profile.height_inches}
                  onValueChange={(value) => setProfile({ ...profile, height_inches: value })}
                  style={styles.picker}
                  itemStyle={{height: 50}}
                >
                  <Picker.Item label="Inches" value="" />
                  {[...Array(12)].map((_, i) => (
                    <Picker.Item key={i} label={`${i} in`} value={i.toString()} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
          <Text style={styles.helperText}>Helps ensure proper vehicle and equipment selection</Text>

          <Text style={styles.label}>Date of Birth *</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={profile.date_of_birth}
            onChangeText={(text) => setProfile({ ...profile, date_of_birth: text })}
          />
          <Text style={styles.helperText}>Required for hospital record verification when needed</Text>

          <Text style={styles.label}>Your Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full address"
            value={profile.address}
            onChangeText={(text) => setProfile({ ...profile, address: text })}
            multiline
          />

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Account Created:</Text>
            <Text style={styles.infoValue}>
              {new Date(user.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>CCT Booking Mobile v1.0.0</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  content: {
    padding: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#5fbfc0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  emailText: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  halfWidth: {
    flex: 1,
  },
  picker: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    height: 50,
  },
  pickerContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    height: 50,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginBottom: 8,
  },
  saveButton: {
    backgroundColor: '#5fbfc0',
    borderRadius: 8,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#a8dfe0',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  signOutButton: {
    backgroundColor: '#E74C3C',
    borderRadius: 8,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    padding: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});

export default ProfileScreen;
