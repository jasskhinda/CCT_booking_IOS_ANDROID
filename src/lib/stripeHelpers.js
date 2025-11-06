import { supabase } from './supabase';

// Use environment variable for Stripe secret key
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

/**
 * Create a Stripe setup intent for adding a payment method
 * This is a temporary solution until we set up proper backend endpoints
 */
export async function createSetupIntentMobile() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, full_name')
      .eq('id', user.id)
      .single();

    let customerId = profile?.stripe_customer_id;

    // If no customer ID, create one with Stripe
    if (!customerId) {
      const customerResponse = await fetch('https://api.stripe.com/v1/customers', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: user.email,
          name: profile?.full_name || user.email,
          'metadata[user_id]': user.id,
        }).toString(),
      });

      if (!customerResponse.ok) {
        const errorText = await customerResponse.text();
        console.error('Customer creation error:', errorText);
        throw new Error('Failed to create Stripe customer');
      }

      const customer = await customerResponse.json();
      customerId = customer.id;

      // Save customer ID to profile
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Create setup intent
    const setupIntentResponse = await fetch('https://api.stripe.com/v1/setup_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: customerId,
        'payment_method_types[]': 'card',
      }).toString(),
    });

    if (!setupIntentResponse.ok) {
      const errorText = await setupIntentResponse.text();
      console.error('Setup intent creation error:', errorText);
      throw new Error('Failed to create setup intent');
    }

    const setupIntent = await setupIntentResponse.json();
    return { clientSecret: setupIntent.client_secret };
  } catch (error) {
    console.error('Error in createSetupIntentMobile:', error);
    throw error;
  }
}

/**
 * Get all payment methods for the current user
 */
export async function getPaymentMethodsMobile() {
  try {
    console.log('[getPaymentMethodsMobile] Starting...');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    console.log('[getPaymentMethodsMobile] User ID:', user.id);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_customer_id, default_payment_method_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[getPaymentMethodsMobile] Profile error:', profileError);
      throw profileError;
    }

    console.log('[getPaymentMethodsMobile] Stripe customer ID:', profile?.stripe_customer_id);
    console.log('[getPaymentMethodsMobile] Default payment method:', profile?.default_payment_method_id);

    if (!profile?.stripe_customer_id) {
      console.log('[getPaymentMethodsMobile] No Stripe customer ID, returning empty');
      return { paymentMethods: [], defaultPaymentMethod: null };
    }

    // Get payment methods from Stripe
    console.log('[getPaymentMethodsMobile] Fetching from Stripe...');
    const response = await fetch(
      `https://api.stripe.com/v1/payment_methods?customer=${profile.stripe_customer_id}&type=card`,
      {
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[getPaymentMethodsMobile] Stripe API error:', errorText);
      throw new Error('Failed to fetch payment methods');
    }

    const data = await response.json();
    console.log('[getPaymentMethodsMobile] Payment methods count:', data.data?.length || 0);
    
    return {
      paymentMethods: data.data || [],
      defaultPaymentMethod: profile.default_payment_method_id,
    };
  } catch (error) {
    console.error('[getPaymentMethodsMobile] Error:', error);
    throw error;
  }
}

/**
 * Delete a payment method
 */
export async function deletePaymentMethodMobile(paymentMethodId) {
  try {
    const response = await fetch(
      `https://api.stripe.com/v1/payment_methods/${paymentMethodId}/detach`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to delete payment method');
    }

    // If this was the default, clear it
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('default_payment_method_id')
      .eq('id', user.id)
      .single();

    if (profile?.default_payment_method_id === paymentMethodId) {
      await supabase
        .from('profiles')
        .update({ default_payment_method_id: null })
        .eq('id', user.id);
    }

    return true;
  } catch (error) {
    console.error('Error in deletePaymentMethodMobile:', error);
    throw error;
  }
}
