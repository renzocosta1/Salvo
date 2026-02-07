import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import { cleanStart, debugAuthState } from '@/lib/auth/cleanStart';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  const handleTitlePress = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);
    
    if (newCount >= 5) {
      // Show developer menu after 5 taps
      Alert.alert(
        '🛠️ Developer Menu',
        'What would you like to do?',
        [
          {
            text: '🧹 Clean Start (Wipe All Auth Data)',
            style: 'destructive',
            onPress: async () => {
              try {
                await cleanStart();
                Alert.alert('✅ Success', 'All auth data wiped! Fresh start ready.');
                setTapCount(0);
              } catch (error) {
                Alert.alert('❌ Error', 'Failed to clean start: ' + error);
              }
            },
          },
          {
            text: '🔍 Debug Auth State',
            onPress: async () => {
              await debugAuthState();
              Alert.alert('🔍 Debug', 'Check console for auth state details');
              setTapCount(0);
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setTapCount(0),
          },
        ]
      );
    }
    
    // Reset tap count after 2 seconds
    setTimeout(() => setTapCount(0), 2000);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Information', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        // Provide clearer error messages
        if (error.message.includes('Invalid login credentials')) {
          Alert.alert(
            'Login Failed',
            'Email or password is incorrect. If you signed up with Google, please use "Continue with Google" instead.'
          );
        } else if (error.message.includes('Email not confirmed')) {
          Alert.alert(
            'Email Not Confirmed',
            'Please check your email and confirm your account before signing in.'
          );
        } else {
          Alert.alert('Login Failed', error.message);
        }
      } else if (data.session) {
        console.log('[Email Login] Success:', data.session.user.email);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSocialLoading('google');
    try {
      // WEB: Use direct redirect to keep PWA in standalone mode
      if (Platform.OS === 'web') {
        console.log('[Google OAuth Web] Using direct redirect to preserve PWA standalone mode');
        
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
            skipBrowserRedirect: false, // Let Supabase handle the redirect
            queryParams: {
              access_type: 'offline',
              prompt: 'select_account', // Force account selection every time
            },
          },
        });

        if (error) {
          console.error('[Google OAuth Web] Error:', error);
          if (Platform.OS === 'web') {
            window.alert('Google Sign-In Failed: ' + error.message);
          } else {
            Alert.alert('Google Sign-In Failed', error.message);
          }
          setSocialLoading(null);
        }
        // Supabase will handle the redirect and auth state change
        return;
      }
      
      // NATIVE: Use WebBrowser for OAuth (existing flow)
      const redirectUrl = 'salvo://auth-callback';
      console.log('[Google OAuth Native] Using custom scheme redirect URL:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        console.error('[Google OAuth Native] Supabase error:', error);
        Alert.alert('Google Sign-In Failed', error.message);
        setSocialLoading(null);
        return;
      }

      if (data?.url) {
        console.log('[Google OAuth Native] Opening browser with auth URL...');
        
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl,
          {
            showInRecents: false,
          }
        );
        
        console.log('[Google OAuth Native] Browser returned, result type:', result.type);
        
        if (result.type === 'success' && (result as any).url) {
          const url = (result as any).url;
          console.log('[Google OAuth Native] SUCCESS! Got callback URL');
          
          let access_token = null;
          let refresh_token = null;
          
          if (url.includes('#')) {
            const hashPart = url.split('#')[1];
            const hashParams = new URLSearchParams(hashPart);
            access_token = hashParams.get('access_token');
            refresh_token = hashParams.get('refresh_token');
            console.log('[Google OAuth Native] Extracted tokens from hash fragment');
          }
          
          if (!access_token && url.includes('?')) {
            const urlObj = new URL(url);
            access_token = urlObj.searchParams.get('access_token');
            refresh_token = urlObj.searchParams.get('refresh_token');
            console.log('[Google OAuth Native] Extracted tokens from query params');
          }
          
          if (access_token && refresh_token) {
            console.log('[Google OAuth Native] Setting session with extracted tokens...');
            const { error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            
            if (sessionError) {
              console.error('[Google OAuth Native] Session error:', sessionError);
              Alert.alert('Authentication Error', sessionError.message);
            } else {
              console.log('[Google OAuth Native] ✅ SUCCESS! Signed in with Google');
            }
          } else {
            console.error('[Google OAuth Native] No tokens found in callback URL');
            Alert.alert('Authentication Error', 'Failed to get authentication tokens from Google');
          }
        } else if (result.type === 'cancel') {
          console.log('[Google OAuth Native] User cancelled authentication');
        } else if (result.type === 'dismiss') {
          console.log('[Google OAuth Native] Browser dismissed without completing');
        }
      }
    } catch (error: any) {
      console.error('[Google OAuth] Unexpected error:', error);
      if (Platform.OS === 'web') {
        window.alert('Error: ' + (error?.message || 'Failed to sign in with Google'));
      } else {
        Alert.alert('Error', error?.message || 'Failed to sign in with Google');
      }
    } finally {
      setSocialLoading(null);
    }
  };

  const handleAppleSignIn = async () => {
    setSocialLoading('apple');
    try {
      // Use explicit custom scheme instead of exp:// for reliable redirects
      const redirectUrl = 'salvo://auth-callback';
      console.log('[Apple OAuth] Using custom scheme redirect URL:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true, // We handle the redirect manually
        },
      });

      if (error) {
        console.error('[Apple OAuth] Supabase error:', error);
        Alert.alert('Apple Sign-In Failed', error.message);
        setSocialLoading(null);
        return;
      }

      if (data?.url) {
        console.log('[Apple OAuth] Opening browser with auth URL...');
        
        // Open the OAuth URL in browser
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl,
          {
            showInRecents: false,
          }
        );
        
        console.log('[Apple OAuth] Browser returned, result type:', result.type);
        
        if (result.type === 'success' && (result as any).url) {
          const url = (result as any).url;
          console.log('[Apple OAuth] SUCCESS! Got callback URL');
          
          // Extract tokens directly from the callback URL
          let access_token = null;
          let refresh_token = null;
          
          // Try hash fragment first (#access_token=...)
          if (url.includes('#')) {
            const hashPart = url.split('#')[1];
            const hashParams = new URLSearchParams(hashPart);
            access_token = hashParams.get('access_token');
            refresh_token = hashParams.get('refresh_token');
            console.log('[Apple OAuth] Extracted tokens from hash fragment');
          }
          
          // Try query params as fallback (?access_token=...)
          if (!access_token && url.includes('?')) {
            const urlObj = new URL(url);
            access_token = urlObj.searchParams.get('access_token');
            refresh_token = urlObj.searchParams.get('refresh_token');
            console.log('[Apple OAuth] Extracted tokens from query params');
          }
          
          if (access_token && refresh_token) {
            console.log('[Apple OAuth] Setting session with extracted tokens...');
            const { error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            
            if (sessionError) {
              console.error('[Apple OAuth] Session error:', sessionError);
              Alert.alert('Authentication Error', sessionError.message);
            } else {
              console.log('[Apple OAuth] ✅ SUCCESS! Signed in with Apple');
            }
          } else {
            console.error('[Apple OAuth] No tokens found in callback URL');
            Alert.alert('Authentication Error', 'Failed to get authentication tokens from Apple');
          }
        } else if (result.type === 'cancel') {
          console.log('[Apple OAuth] User cancelled authentication');
        } else if (result.type === 'dismiss') {
          console.log('[Apple OAuth] Browser dismissed without completing');
        }
      }
    } catch (error: any) {
      console.error('[Apple OAuth] Unexpected error:', error);
      Alert.alert('Error', error?.message || 'Failed to sign in with Apple');
    } finally {
      setSocialLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleTitlePress} activeOpacity={0.9}>
              <Text style={styles.title}>Welcome to Salvo</Text>
            </TouchableOpacity>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                placeholderTextColor="#666"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor="#666"
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  textContentType="password"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={24}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Social Sign-In Buttons */}
          <View style={styles.socialContainer}>
            <TouchableOpacity
              style={[styles.socialButton, socialLoading === 'google' && styles.buttonDisabled]}
              onPress={handleGoogleSignIn}
              disabled={socialLoading !== null}
            >
              {socialLoading === 'google' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.socialButtonIcon}>G</Text>
                  <Text style={styles.socialButtonText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Apple Sign-In temporarily disabled - requires Apple Developer account */}
            {/* <TouchableOpacity
              style={[styles.socialButton, socialLoading === 'apple' && styles.buttonDisabled]}
              onPress={handleAppleSignIn}
              disabled={socialLoading !== null}
            >
              {socialLoading === 'apple' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.socialButtonIcon}></Text>
                  <Text style={styles.socialButtonText}>Continue with Apple</Text>
                </>
              )}
            </TouchableOpacity> */}
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Email Sign In Button */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading || socialLoading !== null}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In with Email</Text>
            )}
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity>
                <Text style={styles.linkText}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419', // Citizen-style dark blue/black
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8b98a5',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1c2631',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#2a3744',
  },
  passwordContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordInput: {
    flex: 1,
    backgroundColor: '#1c2631',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingRight: 56,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#2a3744',
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    padding: 8,
  },
  primaryButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#8b98a5',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  socialContainer: {
    marginBottom: 24,
  },
  socialButton: {
    backgroundColor: '#1c2631',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a3744',
  },
  socialButtonIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginRight: 12,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2a3744',
  },
  dividerText: {
    fontSize: 14,
    color: '#8b98a5',
    marginHorizontal: 16,
  },
});
