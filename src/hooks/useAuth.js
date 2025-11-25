import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        // This is expected on first load or after token expiry - not an error
        if (error.message?.includes('Refresh Token Not Found') || 
            error.message?.includes('Invalid Refresh Token')) {
          console.log('ℹ️ No existing session found (expected on first load)');
        } else {
          console.log('⚠️ Session error:', error.message);
        }
      } else if (session) {
        console.log('✅ Session restored for user:', session.user.email);
      } else {
        console.log('ℹ️ No active session - user needs to log in');
      }
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      setLoading(false);
    }).catch((error) => {
      console.log('⚠️ Session fetch error:', error.message);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        // If profile doesn't exist (code PGRST116), it's likely deleted - don't log error
        if (error.code !== 'PGRST116') {
          console.error('Error fetching user profile:', error);
        }
        return;
      }
      setUserProfile(data);
    } catch (error) {
      if (error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error);
      }
    }
  };

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // Check if user profile exists (account might be deleted)
      if (data.user) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError && profileError.code === 'PGRST116') {
          // Profile doesn't exist - account was deleted
          await supabase.auth.signOut();
          throw new Error('This account has been deleted. Please create a new account.');
        }
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signUp = async (email, password, fullName, phone) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined, // Disable email confirmation for mobile app
          data: {
            full_name: fullName,
            ...(phone && { phone: phone }), // Only include if provided
          },
        },
      });

      // If there's an email error but user was created, treat as success
      if (authError) {
        // Check if user was actually created despite email error
        if (authError.message?.includes('confirmation email') && authData?.user) {
          console.log('⚠️ Email error but user created:', authData.user.id);
          // Continue to create profile
        } else {
          throw authError;
        }
      }

      // Create profile with client role (phone is stored in user metadata, not profiles table)
      if (authData.user) {
        // Split full name into first and last name
        const nameParts = fullName.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authData.user.id,
              email: email,
              first_name: firstName,
              last_name: lastName,
              ...(phone && { phone_number: phone }), // Only include if provided
              role: 'client',
            },
          ]);

        if (profileError) {
          // If profile already exists, that's okay
          if (!profileError.message?.includes('duplicate key')) {
            throw profileError;
          }
        }
      }

      // Return success even if there was an email error
      return { data: authData, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUserProfile(null);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const value = {
    user,
    session,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
