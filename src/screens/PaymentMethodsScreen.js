import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { getPaymentMethodsMobile, deletePaymentMethodMobile } from '../lib/stripeHelpers';

const PaymentMethodsScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [defaultPaymentMethod, setDefaultPaymentMethod] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  // Listen for navigation focus to refresh when coming back from AddPaymentMethod
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('PaymentMethodsScreen focused, refreshing...');
      // Set loading to show refresh is happening
      setLoading(true);
      fetchPaymentMethods();
    });

    return unsubscribe;
  }, [navigation]);

  const fetchPaymentMethods = async () => {
    try {
      console.log('Fetching payment methods...');
      const data = await getPaymentMethodsMobile();
      console.log('Payment methods fetched:', data);
      console.log('Number of payment methods:', data.paymentMethods.length);
      setPaymentMethods(data.paymentMethods);
      setDefaultPaymentMethod(data.defaultPaymentMethod);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      Alert.alert('Error', 'Failed to load payment methods');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDeletePaymentMethod = async (paymentMethodId) => {
    // Prevent removing the default payment method
    if (defaultPaymentMethod === paymentMethodId) {
      Alert.alert(
        'Cannot Remove Default Card',
        'This is your default payment method. Please set another card as default before removing this one.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Remove Card',
      'Are you sure you want to remove this card?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePaymentMethodMobile(paymentMethodId);
              Alert.alert('Success', 'Card removed successfully');
              fetchPaymentMethods();
            } catch (error) {
              console.error('Error deleting payment method:', error);
              Alert.alert('Error', 'Failed to remove card');
            }
          },
        },
      ]
    );
  };

  const handleSetDefault = async (paymentMethodId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('profiles')
        .update({ default_payment_method_id: paymentMethodId })
        .eq('id', user.id);

      if (error) throw error;

      setDefaultPaymentMethod(paymentMethodId);
      Alert.alert('Success', 'Default payment method updated');
    } catch (error) {
      console.error('Error setting default payment method:', error);
      Alert.alert('Error', 'Failed to set default payment method');
    }
  };

  const getCardIcon = (brand) => {
    const icons = {
      visa: '💳',
      mastercard: '💳',
      amex: '💳',
      discover: '💳',
    };
    return icons[brand?.toLowerCase()] || '💳';
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchPaymentMethods();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Methods</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5fbfc0" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView style={styles.scrollContent}>

      {paymentMethods.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💳</Text>
          <Text style={styles.emptyTitle}>No payment methods</Text>
          <Text style={styles.emptyText}>
            Add a card to make booking faster and easier
          </Text>
        </View>
      ) : (
        <View style={styles.cardsList}>
          {paymentMethods.map((pm) => (
            <View key={pm.id} style={styles.cardItem}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardIcon}>{getCardIcon(pm.card.brand)}</Text>
                <View style={styles.cardDetails}>
                  <Text style={styles.cardBrand}>
                    {pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1)} ····{' '}
                    {pm.card.last4}
                  </Text>
                  <Text style={styles.cardExpiry}>
                    Expires {pm.card.exp_month}/{pm.card.exp_year}
                  </Text>
                </View>
              </View>

              {defaultPaymentMethod === pm.id && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultText}>Default</Text>
                </View>
              )}

              <View style={styles.cardActions}>
                {defaultPaymentMethod !== pm.id && (
                  <TouchableOpacity
                    style={styles.setDefaultButton}
                    onPress={() => handleSetDefault(pm.id)}
                  >
                    <Text style={styles.setDefaultText}>Set as Default</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.deleteButton,
                    defaultPaymentMethod === pm.id && styles.deleteButtonDisabled
                  ]}
                  onPress={() => handleDeletePaymentMethod(pm.id)}
                  disabled={defaultPaymentMethod === pm.id}
                >
                  <Text style={[
                    styles.deleteText,
                    defaultPaymentMethod === pm.id && styles.deleteTextDisabled
                  ]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddPaymentMethod')}
      >
        <Text style={styles.addButtonText}>+ Add New Card</Text>
      </TouchableOpacity>
      </ScrollView>
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
  scrollContent: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  cardsList: {
    padding: 20,
  },
  cardItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  cardDetails: {
    flex: 1,
  },
  cardBrand: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  cardExpiry: {
    fontSize: 14,
    color: '#666',
  },
  defaultBadge: {
    backgroundColor: '#5fbfc0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  defaultText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  setDefaultButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  setDefaultText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#fee',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  deleteButtonDisabled: {
    backgroundColor: '#f5f5f5',
    opacity: 0.5,
  },
  deleteText: {
    color: '#c00',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteTextDisabled: {
    color: '#999',
  },
  addButton: {
    backgroundColor: '#5fbfc0',
    borderRadius: 12,
    padding: 16,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default PaymentMethodsScreen;
