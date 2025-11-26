import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import OneSignalService from '../../services/onesignalService';

// Configure notification handler (for local notifications)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Initialize OneSignal - call this at app startup
export function initializeOneSignal() {
  OneSignalService.initialize();
}

// Login to OneSignal with user ID
export function loginOneSignal(userId) {
  if (userId) {
    OneSignalService.login(userId);
    OneSignalService.addTags({
      user_id: userId,
      app_type: 'booking',
      role: 'client'
    });
  }
}

// Logout from OneSignal
export function logoutOneSignal() {
  OneSignalService.logout();
}

// Get OneSignal player ID
export async function getOneSignalPlayerId() {
  return await OneSignalService.getPlayerId();
}

// Request notification permissions
export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#5fbfc0',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permissions not granted');
      return null;
    }

    console.log('Notification permissions granted');

    // OneSignal handles push tokens automatically
    // We still try to get Expo token for backwards compatibility
    try {
      const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
      if (projectId) {
        token = (await Notifications.getExpoPushTokenAsync({
          projectId: projectId,
        })).data;
        console.log('Expo push token:', token);
      } else {
        // OneSignal will handle push notifications
        token = 'ONESIGNAL_MANAGED';
      }
    } catch (error) {
      console.log('Could not get Expo push token, OneSignal will handle push:', error.message);
      token = 'ONESIGNAL_MANAGED';
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

// Save push token to database
export async function savePushToken(userId, token) {
  try {
    const { error } = await supabase
      .from('push_tokens')
      .upsert({
        user_id: userId,
        app_type: 'booking',  // This is the booking app
        push_token: token,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,app_type,platform'
      });

    if (error) throw error;
    console.log('✅ Push token saved successfully');
  } catch (error) {
    console.error('Error saving push token:', error);
  }
}

// Schedule a local notification
export async function scheduleLocalNotification(title, body, data = {}, triggerSeconds = null) {
  try {
    console.log('📨 scheduleLocalNotification called with:', { title, body, data, triggerSeconds });

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        color: '#5fbfc0',
      },
      trigger: triggerSeconds ? { seconds: triggerSeconds } : null,
    });

    console.log('✅ Notification scheduled with ID:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('❌ Error scheduling notification:', error);
    throw error;
  }
}

// Cancel all scheduled notifications
export async function cancelAllScheduledNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Get notification badge count
export async function getBadgeCount() {
  return await Notifications.getBadgeCountAsync();
}

// Set notification badge count
export async function setBadgeCount(count) {
  await Notifications.setBadgeCountAsync(count);
}

// Trip status notification messages
export function getTripNotificationMessage(status, tripDetails = {}) {
  const messages = {
    pending: {
      title: '🚗 Trip Booked!',
      body: `Your trip has been submitted and is pending approval.`,
    },
    confirmed: {
      title: '✅ Trip Confirmed',
      body: `Your trip on ${tripDetails.pickup_time ? new Date(tripDetails.pickup_time).toLocaleDateString() : 'the scheduled date'} has been confirmed!`,
    },
    approved: {
      title: '✅ Trip Approved',
      body: `Your trip has been approved and scheduled!`,
    },
    assigned: {
      title: '🚗 Driver Assigned',
      body: `A driver has been assigned to your trip${tripDetails.driver_name ? ': ' + tripDetails.driver_name : ''}`,
    },
    'in-progress': {
      title: '🛣️ Trip In Progress',
      body: `Your trip is now in progress. Driver is on the way!`,
    },
    completed: {
      title: '✅ Trip Completed',
      body: 'Your trip has been completed. Thank you for using our service!',
    },
    cancelled: {
      title: '❌ Trip Cancelled',
      body: tripDetails.cancelled_reason || 'Your trip has been cancelled.',
    },
    rejected: {
      title: '❌ Trip Request Denied',
      body: tripDetails.rejection_reason || 'Unfortunately, your trip request could not be accommodated at this time.',
    },
  };

  return messages[status] || {
    title: 'Trip Update',
    body: `Your trip status has been updated to: ${status}`,
  };
}

// Save notification to history
export async function saveNotificationToHistory(userId, title, body, data = {}) {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        app_type: 'booking',  // This is the booking app
        notification_type: data.type || 'general',
        title,
        body,
        data,
        read: false,
      });

    if (error) throw error;
    console.log('✅ Notification saved to history');
  } catch (error) {
    console.error('Error saving notification to history:', error);
  }
}
