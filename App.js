import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StripeProvider } from '@stripe/stripe-react-native';
import { AuthProvider, useAuth } from './src/hooks/useAuth';
import { useNotifications } from './src/hooks/useNotifications';
import AppNavigator from './src/navigation/AppNavigator';

const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

// Component that uses auth context to get user and enable notifications
function AppContent() {
  const { user } = useAuth();
  
  // Enable notifications when user is logged in
  useNotifications(user?.id);

  return (
    <>
      <AppNavigator />
      <StatusBar style="auto" />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StripeProvider publishableKey={STRIPE_PUBLISHABLE_KEY}>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </StripeProvider>
    </SafeAreaProvider>
  );
}
