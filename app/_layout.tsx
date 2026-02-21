import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider, useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { registerServiceWorker, isStandalone } from '@/lib/pwa/register-sw';
import InstallPrompt from '@/components/InstallPrompt';
import PwaStandaloneCheck from '@/components/PwaStandaloneCheck';
import PwaStandaloneWarning from '@/components/PwaStandaloneWarning';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      
      // Initialize PWA features (web only)
      if (Platform.OS === 'web') {
        registerServiceWorker().catch(err => {
          console.error('Failed to register service worker:', err);
        });
      }
      
      // Initialize offline database and start sync service (native only - SQLite doesn't work on web)
      if (Platform.OS !== 'web') {
        // Dynamic import to avoid bundling SQLite for web
        import('@/lib/offline/database').then(({ initDatabase }) => {
          return initDatabase();
        }).then(() => {
          return import('@/lib/offline/sync');
        }).then(({ startSyncService }) => {
          const cleanup = startSyncService();
          return cleanup;
        }).catch(err => {
          console.error('Failed to initialize offline systems:', err);
        });
      }
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { session, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    if (loading) {
      // Still loading - don't navigate yet
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const inGatesGroup = segments[0] === '(gates)';
    const inOnboardingGroup = segments[0] === '(onboarding)';
    const inTabsGroup = segments[0] === '(tabs)';

    console.log('[Auth Guard]', {
      session: !!session,
      profile: !!profile,
      oath: profile?.oath_signed_at,
      onboarding: profile?.onboarding_completed_at,
      currentSegment: segments[0],
    });

    // Rule 1: No session → Login (or Signup if referral code present)
    if (!session) {
      if (!inAuthGroup) {
        // Check for referral code in URL
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          const refCode = urlParams.get('ref');
          if (refCode) {
            console.log('[Auth Guard] Referral code detected, redirecting to signup:', refCode);
            router.replace(`/(auth)/signup?ref=${refCode}`);
            return;
          }
        }
        console.log('[Auth Guard] No session, redirecting to login');
        router.replace('/(auth)/login');
      }
      return;
    }

    // Rule 2: Session but no profile → Wait (AuthProvider is fetching or will sign out)
    if (session && !profile) {
      console.log('[Auth Guard] Session exists but no profile yet - waiting...');
      // AuthProvider will handle signing out if profile doesn't exist after retries
      return;
    }

    // Rule 3: Session + Profile but no oath → Oath screen
    if (session && profile && !profile.oath_signed_at) {
      if (!inGatesGroup) {
        console.log('[Auth Guard] Profile exists but no oath, redirecting to oath');
        router.replace('/(gates)/oath');
      }
      return;
    }

    // Rule 4: Session + Profile + Oath but no onboarding → Onboarding flow
    if (session && profile && profile.oath_signed_at && !profile.onboarding_completed_at) {
      if (!inOnboardingGroup) {
        console.log('[Auth Guard] Oath signed but onboarding not complete, redirecting to onboarding');
        router.replace('/(onboarding)/personal-details');
      }
      return;
    }

    // Rule 5: Session + Profile + Oath + Onboarding → Main app
    if (session && profile && profile.oath_signed_at && profile.onboarding_completed_at) {
      if (inAuthGroup || inGatesGroup || inOnboardingGroup) {
        console.log('[Auth Guard] Onboarding complete, redirecting to main app');
        router.replace('/(tabs)');
      }
      return;
    }
  }, [session, profile, loading, segments, router]);

  // Show loading screen while checking auth state
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#00ff88" />
        <Text style={{ color: '#a0a0a0', marginTop: 16, fontSize: 12, letterSpacing: 2 }}>
          LOADING...
        </Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(gates)" options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
      </Stack>
      
      {/* PWA Install Prompt (web only) */}
      {Platform.OS === 'web' && !isStandalone() && (
        <InstallPrompt onDismiss={() => setShowInstallPrompt(false)} />
      )}
      
      {/* PWA Standalone Check (web only) */}
      {Platform.OS === 'web' && <PwaStandaloneCheck />}
      
      {/* PWA Standalone Warning - Shows if Safari UI is visible */}
      {Platform.OS === 'web' && <PwaStandaloneWarning />}
    </ThemeProvider>
  );
}
