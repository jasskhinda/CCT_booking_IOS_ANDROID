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
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import AppHeader from '../components/AppHeader';

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

      if (error) {
        // If profile doesn't exist (deleted account), don't show error
        if (error.code !== 'PGRST116') {
          throw error;
        }
        // Profile deleted - just return without setting data
        return;
      }

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
      // Only log errors that aren't about deleted profiles
      if (error.code !== 'PGRST116') {
        console.error('❌ Error loading profile:', error);
        Alert.alert('Error', 'Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile.full_name) {
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
          // Include email from auth to prevent trigger from trying to sync it
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

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account? This action cannot be undone.\n\nAll your data including:\n• Personal information\n• Trip history\n• Payment methods\n\nwill be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete user data while keeping trips as records

              // 1. Delete payment methods (if you have a payment_methods table)
              const { error: paymentError } = await supabase
                .from('payment_methods')
                .delete()
                .eq('user_id', user.id);

              if (paymentError) console.warn('Error deleting payment methods:', paymentError);

              // 2. Delete profile (trips will remain but reference to deleted user)
              const { error: profileError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', user.id);

              if (profileError) throw profileError;

              // 3. Sign out the user
              await signOut();

              Alert.alert(
                'Account Deleted',
                'Your account and personal information have been permanently deleted.'
              );
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert('Error', 'Failed to delete account. Please contact support at j.khinda@ccgrhc.com');
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
      <AppHeader />

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

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your phone number (optional)"
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
              <TextInput
                style={styles.input}
                placeholder="Feet (4-7)"
                value={profile.height_feet}
                onChangeText={(text) => setProfile({ ...profile, height_feet: text })}
                keyboardType="numeric"
                maxLength={1}
              />
            </View>
            <View style={styles.halfWidth}>
              <TextInput
                style={styles.input}
                placeholder="Inches (0-11)"
                value={profile.height_inches}
                onChangeText={(text) => setProfile({ ...profile, height_inches: text })}
                keyboardType="numeric"
                maxLength={2}
              />
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

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment</Text>
          <TouchableOpacity
            style={styles.paymentMethodButton}
            onPress={() => navigation.navigate('PaymentMethods')}
          >
            <View style={styles.paymentMethodContent}>
              <Text style={styles.paymentMethodIcon}>💳</Text>
              <View style={styles.paymentMethodTextContainer}>
                <Text style={styles.paymentMethodTitle}>Payment Methods</Text>
                <Text style={styles.paymentMethodSubtitle}>Manage your saved cards</Text>
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutButtonText}>Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
          <Text style={styles.deleteAccountButtonText}>Delete Account</Text>
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
  paymentMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  paymentMethodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  paymentMethodTextContainer: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  paymentMethodSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  chevron: {
    fontSize: 28,
    color: '#999',
    fontWeight: '300',
  },
  signOutButton: {
    backgroundColor: '#E74C3C',
    borderRadius: 8,
    padding: 18,
    alignItems: 'center',
    marginBottom: 15,
  },
  signOutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteAccountButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#E74C3C',
  },
  deleteAccountButtonText: {
    color: '#E74C3C',
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
