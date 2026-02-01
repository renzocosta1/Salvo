import React, { useEffect, useState, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { supabase, Profile } from '../supabase';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const isFetchingProfile = useRef(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // Handle OAuth deep link callbacks (salvo://auth-callback or exp://... in dev)
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      console.log('[OAuth Deep Link] Received full URL:', url);
      
      try {
        let access_token: string | null = null;
        let refresh_token: string | null = null;
        
        // Method 1: Check hash fragment (most common for OAuth: #access_token=...&refresh_token=...)
        if (url.includes('#')) {
          const hashPart = url.split('#')[1];
          console.log('[OAuth Deep Link] Hash part:', hashPart);
          if (hashPart) {
            const hashParams = new URLSearchParams(hashPart);
            access_token = hashParams.get('access_token');
            refresh_token = hashParams.get('refresh_token');
            if (access_token) {
              console.log('[OAuth Deep Link] ✅ Tokens found in hash fragment');
            }
          }
        }
        
        // Method 2: Check search params (?access_token=...&refresh_token=...)
        if (!access_token && url.includes('?')) {
          try {
            const urlObj = new URL(url);
            access_token = urlObj.searchParams.get('access_token');
            refresh_token = urlObj.searchParams.get('refresh_token');
            if (access_token) {
              console.log('[OAuth Deep Link] ✅ Tokens found in search params');
            }
          } catch (urlError) {
            // URL parsing failed, try manual extraction
            const queryPart = url.split('?')[1]?.split('#')[0];
            if (queryPart) {
              const queryParams = new URLSearchParams(queryPart);
              access_token = queryParams.get('access_token');
              refresh_token = queryParams.get('refresh_token');
              if (access_token) {
                console.log('[OAuth Deep Link] ✅ Tokens found via manual extraction');
              }
            }
          }
        }
        
        if (access_token && refresh_token) {
          console.log('[OAuth Deep Link] 🔐 Setting session with tokens...');
          setLoading(true);
          
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          
          if (error) {
            console.error('[OAuth Deep Link] ❌ Error setting session:', error.message);
          } else {
            console.log('[OAuth Deep Link] ✅ Session set successfully:', data.session?.user?.email);
            // onAuthStateChange will automatically trigger and fetch profile
          }
        } else {
          console.log('[OAuth Deep Link] ❌ No OAuth tokens found in URL');
          console.log('[OAuth Deep Link] URL structure:', {
            hasHash: url.includes('#'),
            hasQuery: url.includes('?'),
            urlLength: url.length
          });
        }
      } catch (error) {
        console.error('[OAuth Deep Link] ❌ Error parsing callback URL:', error);
      }
    };

    // Listen for deep link events
    const linkingSubscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  const fetchProfile = async (userId: string, retryCount = 0) => {
    const MAX_RETRIES = 3; // Reduced from 5 to 3 for faster cleanup
    const RETRY_DELAY = 800; // Reduced from 1500ms to 800ms
    
    // Ensure loading state is maintained during profile fetch
    if (!isFetchingProfile.current) {
      isFetchingProfile.current = true;
      setLoading(true);
    }
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, party:parties(*), rank:ranks(*)')
        .eq('id', userId)
        .single();

      if (error) {
        // Only log actual errors, not "profile not found" which is expected for orphaned sessions
        if (error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
        }
        
        // Profile might not exist yet due to trigger delay
        // Retry up to MAX_RETRIES times
        if (retryCount < MAX_RETRIES) {
          // Silence the retry logs - they're noisy and expected
          setTimeout(() => fetchProfile(userId, retryCount + 1), RETRY_DELAY);
          return;
        }
        
        // Max retries reached - profile truly doesn't exist
        // This is an orphaned session from a previous sign-in - clean it up silently
        isFetchingProfile.current = false;
        setProfile(null);
        setLoading(false);
        
        // Auto sign out orphaned session (silently)
        await signOut();
        return;
      }

      console.log('Profile fetched successfully:', data);
      setProfile(data as Profile);
      isFetchingProfile.current = false;
      setLoading(false);
    } catch (error) {
      console.error('Unexpected error fetching profile:', error);
      isFetchingProfile.current = false;
      setProfile(null);
      setLoading(false);
      
      // Sign out on unexpected errors too
      await signOut();
    }
  };

  const signOut = async () => {
    // Clear Supabase session
    await supabase.auth.signOut();
    
    // Clear local state
    setSession(null);
    setProfile(null);
    isFetchingProfile.current = false;
    
    // Clear AsyncStorage (Supabase stores session here)
    try {
      await AsyncStorage.removeItem('supabase.auth.token');
      await AsyncStorage.clear(); // Nuclear option - clear everything
    } catch (error) {
      console.error('Error clearing AsyncStorage:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading: loading || isFetchingProfile.current,
        refetchProfile: fetchProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
