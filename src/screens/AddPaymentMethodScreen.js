import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { CardField, useConfirmSetupIntent } from '@stripe/stripe-react-native';
import { supabase } from '../lib/supabase';
import { createSetupIntentMobile } from '../lib/stripeHelpers';

const AddPaymentMethodScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [cardComplete, setCardComplete] = useState(false);
  const { confirmSetupIntent } = useConfirmSetupIntent();

  useEffect(() => {
    createSetupIntent();
  }, []);

  const createSetupIntent = async () => {
    try {
      console.log('Creating setup intent...');
      const data = await createSetupIntentMobile();
      console.log('Setup intent created successfully');
      setClientSecret(data.clientSecret);
    } catch (error) {
      console.error('Error creating setup intent:', error);
      Alert.alert('Error', 'Failed to initialize payment form. Please try again.');
      navigation.goBack();
    }
  };

  const handleAddCard = async () => {
    if (!cardComplete) {
      Alert.alert('Incomplete', 'Please fill in all card details');
      return;
    }

    if (!clientSecret) {
      Alert.alert('Error', 'Payment form not ready. Please try again');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Get user profile for billing details
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const { setupIntent, error } = await confirmSetupIntent(clientSecret, {
        paymentMethodType: 'Card',
        paymentMethodData: {
          billingDetails: {
            name: profile?.full_name || user.email,
            email: user.email,
          },
        },
      });

      if (error) {
        console.error('Setup intent error:', error);
        Alert.alert('Error', error.message || 'Failed to add card');
        return;
      }

      if (setupIntent) {
        console.log('Setup intent completed:', setupIntent);
        const paymentMethodId = setupIntent.paymentMethod || setupIntent.paymentMethodId;
        console.log('Payment method ID:', paymentMethodId);

        // Check if this is the first payment method - if so, set it as default
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('default_payment_method_id')
          .eq('id', user.id)
          .single();

        if (!currentProfile?.default_payment_method_id && paymentMethodId) {
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ default_payment_method_id: paymentMethodId })
            .eq('id', user.id);

          if (updateError) {
            console.error('Error setting default payment method:', updateError);
          } else {
            console.log('Set as default payment method:', paymentMethodId);
          }
        }

        // Small delay to ensure Stripe has fully processed the payment method
        await new Promise(resolve => setTimeout(resolve, 500));

        Alert.alert(
          'Success',
          'Card added successfully',
          [
            {
              text: 'OK',
              onPress: () => {
                // Go back - the focus listener will handle the refresh
                navigation.goBack();
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error adding card:', error);
      Alert.alert('Error', 'Failed to add card. Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Payment Card</Text>
        <View style={styles.headerRight} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.formContainer}>
          <Text style={styles.label}>Card Information</Text>

          {!clientSecret ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color="#5fbfc0" />
              <Text style={styles.loadingText}>Loading secure form...</Text>
            </View>
          ) : (
            <View style={styles.cardFieldContainer}>
              <CardField
                postalCodeEnabled={true}
                placeholders={{
                  number: '4242 4242 4242 4242',
                }}
                cardStyle={{
                  backgroundColor: '#FFFFFF',
                  textColor: '#000000',
                  placeholderColor: '#999999',
                  borderRadius: 8,
                }}
                style={styles.cardField}
                onCardChange={(cardDetails) => {
                  setCardComplete(cardDetails.complete);
                }}
              />
            </View>
          )}

          <View style={styles.securityInfo}>
            <Text style={styles.securityIcon}>🔒</Text>
            <Text style={styles.securityText}>
              Your payment information is encrypted and secure
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.addButton,
              (!cardComplete || !clientSecret || loading) && styles.addButtonDisabled,
            ]}
            onPress={handleAddCard}
            disabled={!cardComplete || !clientSecret || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.addButtonText}>Add Card</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.testCardInfo}>
          <Text style={styles.testCardTitle}>Test Cards (Development)</Text>
          <Text style={styles.testCardText}>• 4242 4242 4242 4242 - Success</Text>
          <Text style={styles.testCardText}>• Use any future expiry date and CVC</Text>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: '#5fbfc0',
    fontWeight: '300',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerRight: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  formContainer: {
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
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  loadingCard: {
    height: 50,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  loadingText: {
    color: '#666',
    fontSize: 14,
  },
  cardFieldContainer: {
    marginBottom: 16,
  },
  cardField: {
    height: 50,
    marginVertical: 0,
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9f9',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  securityIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    color: '#2c7a7b',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#5fbfc0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonDisabled: {
    backgroundColor: '#a8dfe0',
    opacity: 0.6,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  testCardInfo: {
    backgroundColor: '#fff3cd',
    margin: 20,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  testCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 8,
  },
  testCardText: {
    fontSize: 13,
    color: '#856404',
    marginBottom: 4,
  },
});

export default AddPaymentMethodScreen;
