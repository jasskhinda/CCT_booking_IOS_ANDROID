import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '../lib/supabase';

const TripsScreen = ({ navigation }) => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    fetchTrips();
    fetchUserProfile();

    // Set up real-time subscription
    const subscription = supabase
      .channel('trips_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trips',
        },
        () => {
          fetchTrips();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (data) {
        setUserName(data.full_name || 'User');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchTrips = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('user_id', user.id)
        .order('pickup_time', { ascending: false });

      if (error) throw error;

      setTrips(data || []);
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTrips();
  };

  const getFilteredTrips = () => {
    if (selectedFilter === 'all') return trips;
    if (selectedFilter === 'upcoming') {
      return trips.filter(t => t.status === 'pending' || t.status === 'upcoming');
    }
    return trips.filter(t => t.status === selectedFilter);
  };

  const getStatusCount = (status) => {
    if (status === 'all') return trips.length;
    if (status === 'upcoming') {
      return trips.filter(t => t.status === 'pending' || t.status === 'upcoming').length;
    }
    return trips.filter(t => t.status === status).length;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
      case 'upcoming':
        return '#5fbfc0';
      case 'completed':
        return '#4CAF50';
      case 'cancelled':
        return '#FF5252';
      default:
        return '#5fbfc0';
    }
  };

  const getStatusBadgeText = (status) => {
    switch (status) {
      case 'pending':
        return 'UPCOMING';
      case 'upcoming':
        return 'UPCOMING';
      case 'completed':
        return 'COMPLETED';
      case 'cancelled':
        return 'CANCELLED';
      default:
        return status.toUpperCase();
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const month = date.toLocaleString('en', { month: 'short' }).toUpperCase();
    const day = date.getDate();
    return { month, day };
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const renderTripItem = ({ item }) => {
    const { month, day } = formatDate(item.pickup_time);
    const time = formatTime(item.pickup_time);
    const statusColor = getStatusColor(item.status);
    const statusText = getStatusBadgeText(item.status);

    return (
      <TouchableOpacity
        style={styles.tripCard}
        onPress={() => navigation.navigate('TripDetails', { tripId: item.id })}
      >
        <View style={styles.dateBox}>
          <Text style={styles.dateMonth}>{month}</Text>
          <Text style={styles.dateDay}>{day}</Text>
        </View>

        <View style={styles.tripContent}>
          <View style={styles.tripHeader}>
            <Text style={styles.clientName}>{userName}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{statusText}</Text>
            </View>
          </View>

          <Text style={styles.tripTime}>{time}</Text>

          <View style={styles.locationRow}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.locationText} numberOfLines={1}>
              {item.pickup_address}
            </Text>
          </View>

          <View style={styles.locationRow}>
            <Text style={styles.locationIcon}>🏁</Text>
            <Text style={styles.locationText} numberOfLines={1}>
              {item.destination_address}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredTrips = getFilteredTrips();

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#5fbfc0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Trips</Text>
        <Text style={styles.headerSubtitle}>Your Trips</Text>
      </View>

      <View style={styles.statsContainer}>
        <TouchableOpacity
          style={[styles.statCard, selectedFilter === 'all' && styles.statCardActive]}
          onPress={() => setSelectedFilter('all')}
        >
          <Text style={[styles.statLabel, selectedFilter === 'all' && styles.statLabelActive]}>
            All
          </Text>
          <Text style={[styles.statValue, selectedFilter === 'all' && styles.statValueActive]}>
            {getStatusCount('all')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, selectedFilter === 'pending' && styles.statCardActive]}
          onPress={() => setSelectedFilter('pending')}
        >
          <Text style={[styles.statLabel, selectedFilter === 'pending' && styles.statLabelActive]}>
            Pending
          </Text>
          <Text style={[styles.statValue, selectedFilter === 'pending' && styles.statValueActive]}>
            {getStatusCount('pending')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, selectedFilter === 'upcoming' && styles.statCardActive]}
          onPress={() => setSelectedFilter('upcoming')}
        >
          <Text style={[styles.statLabel, selectedFilter === 'upcoming' && styles.statLabelActive]}>
            Upcoming
          </Text>
          <Text style={[styles.statValue, selectedFilter === 'upcoming' && styles.statValueActive]}>
            {getStatusCount('upcoming')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <TouchableOpacity
          style={[styles.statCard, selectedFilter === 'completed' && styles.statCardActive]}
          onPress={() => setSelectedFilter('completed')}
        >
          <Text style={[styles.statLabel, selectedFilter === 'completed' && styles.statLabelActive]}>
            Completed
          </Text>
          <Text style={[styles.statValue, selectedFilter === 'completed' && styles.statValueActive]}>
            {getStatusCount('completed')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.statCard, selectedFilter === 'cancelled' && styles.statCardActive]}
          onPress={() => setSelectedFilter('cancelled')}
        >
          <Text style={[styles.statLabel, selectedFilter === 'cancelled' && styles.statLabelActive]}>
            Cancelled
          </Text>
          <Text style={[styles.statValue, selectedFilter === 'cancelled' && styles.statValueActive]}>
            {getStatusCount('cancelled')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bookTripButton}
          onPress={() => navigation.navigate('Booking')}
        >
          <Text style={styles.bookIcon}>📅</Text>
          <Text style={styles.bookTripText}>Book Trip</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTrips}
        renderItem={renderTripItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#5fbfc0"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No trips found</Text>
          </View>
        }
      />
    </View>
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#5fbfc0',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 30,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statCardActive: {
    backgroundColor: '#5fbfc0',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    fontWeight: '500',
  },
  statLabelActive: {
    color: '#fff',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#5fbfc0',
  },
  statValueActive: {
    color: '#fff',
  },
  bookTripButton: {
    flex: 1,
    backgroundColor: '#5fbfc0',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  bookIcon: {
    fontSize: 20,
    marginBottom: 3,
  },
  bookTripText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  listContent: {
    padding: 15,
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dateBox: {
    backgroundColor: '#5fbfc0',
    borderRadius: 10,
    width: 60,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  dateMonth: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
  },
  dateDay: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  tripContent: {
    flex: 1,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
  },
  tripTime: {
    fontSize: 16,
    color: '#666',
    marginBottom: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  locationIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});

export default TripsScreen;
