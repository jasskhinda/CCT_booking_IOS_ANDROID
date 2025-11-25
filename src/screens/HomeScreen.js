import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { supabase } from '../lib/supabase';
import AppHeader from '../components/AppHeader';

const HomeScreen = ({ navigation }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          // If profile doesn't exist (deleted account), don't log error
          if (error.code !== 'PGRST116') {
            console.error('Error fetching profile:', error);
          }
          return;
        }
        setProfile(data);
      }
    } catch (error) {
      // Only log errors that aren't about deleted profiles
      if (error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <AppHeader />

      <View style={styles.welcomeCard}>
        <Text style={styles.welcomeTitle}>
          Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}!
        </Text>
        <Text style={styles.welcomeText}>
          Your personal dashboard for managing rides and account settings.
        </Text>
      </View>

      <View style={styles.cardsContainer}>
        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Book')}
        >
          <View style={styles.cardIcon}>
            <Text style={styles.iconText}>📅</Text>
          </View>
          <Text style={styles.cardTitle}>Book a Ride</Text>
          <Text style={styles.cardDescription}>
            Schedule a new ride with one of our compassionate drivers.
          </Text>
          <View style={styles.cardButton}>
            <Text style={styles.cardButtonText}>Book Now</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Trips')}
        >
          <View style={styles.cardIcon}>
            <Text style={styles.iconText}>🚗</Text>
          </View>
          <Text style={styles.cardTitle}>My Trips</Text>
          <Text style={styles.cardDescription}>
            View and manage your completed and upcoming trips.
          </Text>
          <View style={styles.cardButton}>
            <Text style={styles.cardButtonText}>View Trips</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate('Profile')}
        >
          <View style={styles.cardIcon}>
            <Text style={styles.iconText}>👤</Text>
          </View>
          <Text style={styles.cardTitle}>Profile</Text>
          <Text style={styles.cardDescription}>
            Update your profile information and preferences.
          </Text>
          <View style={styles.cardButton}>
            <Text style={styles.cardButtonText}>Manage Profile</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>How It Works</Text>
        <View style={styles.stepContainer}>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepTitle}>Book Your Ride</Text>
            <Text style={styles.stepText}>
              Enter your pickup and destination, select date and time.
            </Text>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepTitle}>Get Assigned</Text>
            <Text style={styles.stepText}>
              A compassionate driver will be assigned to your trip.
            </Text>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepTitle}>Enjoy Your Journey</Text>
            <Text style={styles.stepText}>
              Your driver will arrive and safely transport you to your destination.
            </Text>
          </View>
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
  welcomeCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  welcomeText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  cardsContainer: {
    padding: 20,
    paddingTop: 0,
  },
  card: {
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
  cardIcon: {
    marginBottom: 15,
  },
  iconText: {
    fontSize: 40,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
  },
  cardButton: {
    backgroundColor: '#5fbfc0',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  cardButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoSection: {
    backgroundColor: '#fff',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    marginBottom: 40,
  },
  infoTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  stepContainer: {
    gap: 20,
  },
  step: {
    alignItems: 'center',
    marginBottom: 15,
  },
  stepNumber: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  stepText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default HomeScreen;
