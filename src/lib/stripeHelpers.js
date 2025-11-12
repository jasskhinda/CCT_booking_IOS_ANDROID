import { supabase } from './supabase';
import { Alert, Platform } from 'react-native';

// Use backend API URL instead of calling Stripe directly
// This is more secure - keeps Stripe secret key on the server
// FALLBACK: If EXPO_PUBLIC_API_URL is not set, use production URL (for app store builds)
// For local development, set EXPO_PUBLIC_API_URL=http://localhost:3000 in .env.local
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://book.compassionatecaretransportation.com';

/**
 * Validate API URL configuration
 * For physical devices/simulators, localhost won't work - need computer's IP
 */
function validateApiUrl() {
  if (!API_URL) {
    console.error('[Stripe] EXPO_PUBLIC_API_URL is not configured!');
    console.error('[Stripe] Please set it in .env.local file');
    return false;
  }

  if (API_URL.includes('localhost') || API_URL.includes('127.0.0.1')) {
    console.warn('[Stripe] ⚠️ WARNING: Using localhost URL. This will NOT work on physical devices!');
    console.warn('[Stripe] For iOS Simulator: Use http://localhost:3000');
    console.warn('[Stripe] For Android Emulator: Use http://10.0.2.2:3000');
    console.warn('[Stripe] For Physical Device: Use http://YOUR_COMPUTER_IP:3000');
    console.warn('[Stripe] Current URL:', API_URL);
  }

  return true;
}

/**
 * Create a Stripe setup intent for adding a payment method
 * Uses backend API endpoint (booking_app) instead of direct Stripe calls
 */
export async function createSetupIntentMobile() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('User not authenticated');
    }

    console.log('[createSetupIntentMobile] Calling backend API:', `${API_URL}/api/stripe/setup-intent`);

    // Call backend API to create setup intent
    const response = await fetch(`${API_URL}/api/stripe/setup-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        paymentMethodType: 'card'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[createSetupIntentMobile] Backend API error:', errorText);
      throw new Error('Failed to create setup intent');
    }

    const data = await response.json();
    console.log('[createSetupIntentMobile] Success, got client secret');

    return {
      clientSecret: data.clientSecret,
      publishableKey: data.publishableKey
    };
  } catch (error) {
    console.error('[createSetupIntentMobile] Error:', error);
    throw error;
  }
}

/**
 * Get all payment methods for the current user
 * Uses backend API endpoint (booking_app) for secure access
 */
export async function getPaymentMethodsMobile() {
  try {
    console.log('[getPaymentMethodsMobile] Starting...');

    // Validate API URL configuration
    if (!validateApiUrl()) {
      throw new Error('API URL not configured. Please check .env.local file.');
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('User not authenticated');
    }

    console.log('[getPaymentMethodsMobile] User authenticated, calling backend API:', `${API_URL}/api/stripe/payment-methods`);

    // Call backend API to get payment methods
    const response = await fetch(`${API_URL}/api/stripe/payment-methods`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[getPaymentMethodsMobile] Backend API error:', response.status, errorText);
      throw new Error(`Failed to fetch payment methods: ${response.status}`);
    }

    const data = await response.json();
    console.log('[getPaymentMethodsMobile] Payment methods count:', data.paymentMethods?.length || 0);

    // Get default payment method from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('default_payment_method_id')
      .eq('id', session.user.id)
      .single();

    return {
      paymentMethods: data.paymentMethods || [],
      defaultPaymentMethod: profile?.default_payment_method_id || null,
    };
  } catch (error) {
    console.error('[getPaymentMethodsMobile] Error:', error);

    // Provide helpful error message for network failures
    if (error.message?.includes('Network request failed')) {
      console.error('[getPaymentMethodsMobile] 🔴 NETWORK ERROR - Cannot reach backend API!');
      console.error('[getPaymentMethodsMobile] Current API_URL:', API_URL);
      console.error('[getPaymentMethodsMobile] Solutions:');
      console.error('[getPaymentMethodsMobile]   1. Make sure booking_app is running (npm run dev)');
      console.error('[getPaymentMethodsMobile]   2. For iOS Simulator: Use http://localhost:3000');
      console.error('[getPaymentMethodsMobile]   3. For Android Emulator: Use http://10.0.2.2:3000');
      console.error('[getPaymentMethodsMobile]   4. For Physical Device: Use http://YOUR_IP:3000');
      console.error('[getPaymentMethodsMobile]   5. Check firewall/network settings');
    }

    throw error;
  }
}

/**
 * Delete a payment method
 * Uses backend API endpoint (booking_app) for secure deletion
 */
export async function deletePaymentMethodMobile(paymentMethodId) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('User not authenticated');
    }

    console.log('[deletePaymentMethodMobile] Deleting payment method:', paymentMethodId);

    // Call backend API to delete payment method
    const response = await fetch(`${API_URL}/api/stripe/payment-methods`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        paymentMethodId
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[deletePaymentMethodMobile] Backend API error:', errorText);
      throw new Error('Failed to delete payment method');
    }

    console.log('[deletePaymentMethodMobile] Successfully deleted');

    // If this was the default, clear it from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('default_payment_method_id')
      .eq('id', session.user.id)
      .single();

    if (profile?.default_payment_method_id === paymentMethodId) {
      await supabase
        .from('profiles')
        .update({ default_payment_method_id: null })
        .eq('id', session.user.id);
    }

    return true;
  } catch (error) {
    console.error('[deletePaymentMethodMobile] Error:', error);
    throw error;
  }
}

/**
 * Set a payment method as default
 */
export async function setDefaultPaymentMethodMobile(paymentMethodId) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('User not authenticated');
    }

    console.log('[setDefaultPaymentMethodMobile] Setting default:', paymentMethodId);

    // Update in profiles table
    const { error } = await supabase
      .from('profiles')
      .update({ default_payment_method_id: paymentMethodId })
      .eq('id', session.user.id);

    if (error) {
      console.error('[setDefaultPaymentMethodMobile] Database error:', error);
      throw error;
    }

    console.log('[setDefaultPaymentMethodMobile] Successfully set as default');
    return true;
  } catch (error) {
    console.error('[setDefaultPaymentMethodMobile] Error:', error);
    throw error;
  }
}
