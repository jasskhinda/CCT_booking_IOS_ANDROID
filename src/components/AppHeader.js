import React, { useState, useEffect } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const AppHeader = () => {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user?.id) {
      console.log('🔔 AppHeader: Setting up notification subscription for user:', user.id);
      fetchUnreadCount();
      
      // Subscribe to notification changes
      const subscription = supabase
        .channel(`header-notifications-${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('🔔 AppHeader: Notification change detected:', payload);
            console.log('🔔 AppHeader: Fetching new unread count...');
            fetchUnreadCount();
          }
        )
        .subscribe((status) => {
          console.log('🔔 AppHeader: Subscription status:', status);
        });

      return () => {
        console.log('🔔 AppHeader: Cleaning up notification subscription');
        subscription.unsubscribe();
      };
    }
  }, [user?.id]);

  const fetchUnreadCount = async () => {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('app_type', 'booking')
        .eq('read', false);

      if (error) throw error;
      setUnreadCount(count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const handleNotificationPress = async () => {
    // Navigate to Notifications screen
    navigation.navigate('Notifications');
  };

  return (
    <View style={styles.header}>
      <Image
        source={require('../../assets/CCTbooking.webp')}
        style={styles.logo}
        resizeMode="contain"
      />
      
      <TouchableOpacity
        style={styles.notificationButton}
        onPress={handleNotificationPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="notifications-outline" size={28} color="#333" />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingTop: 55,
    paddingBottom: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 110,
  },
  logo: {
    width: 140,
    height: 140,
  },
  notificationButton: {
    padding: 8,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
});

export default AppHeader;
