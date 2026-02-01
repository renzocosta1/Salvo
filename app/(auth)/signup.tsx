import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';

WebBrowser.maybeCompleteAuthSession();

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSignup = async () => {
    if (!email || !password) {
      Alert.alert('Missing Information', 'Please enter email and password');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName || email.split('@')[0],
          },
          emailRedirectTo: undefined, // Disable email confirmation for smoother flow
        },
      });

      if (error) {
        Alert.alert('Signup Failed', error.message);
      } else if (data.user && !data.session) {
        // Email confirmation required (if enabled in Supabase)
        Alert.alert(
          'Check Your Email',
          'We sent you a confirmation email. Please check your inbox.',
          [{ text: 'OK' }]
        );
      }
      // If session exists, AuthProvider will automatically handle navigation to Oath screen
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Signup error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSocialLoading('google');
    try {
      // Use explicit custom scheme instead of exp:// for reliable redirects
      // exp:// doesn't work with ASWebAuthenticationSession on iOS
      const redirectUrl = 'salvo://auth-callback';
      console.log('[Google OAuth] Step 1: Using custom scheme redirect URL:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true, // We handle the redirect manually
        },
      });

      if (error) {
        console.error('[Google OAuth] Step 2: Supabase error:', error);
        Alert.alert('Google Sign-In Failed', error.message);
        setSocialLoading(null);
        return;
      }

      if (data?.url) {
        console.log('[Google OAuth] Step 3: Opening browser with auth URL...');
        console.log('[Google OAuth] Auth URL:', data.url.substring(0, 100) + '...');
        
        // Open the OAuth URL in browser
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl,
          {
            showInRecents: false,
          }
        );
        
        console.log('[Google OAuth] Step 4: Browser returned, result type:', result.type);
        
        if (result.type === 'success' && result.url) {
          console.log('[Google OAuth] Step 5: SUCCESS! Got callback URL');
          console.log('[Google OAuth] Callback URL length:', result.url.length);
          console.log('[Google OAuth] Callback URL preview:', result.url.substring(0, 100) + '...');
          
          // Extract tokens directly from the callback URL
          const url = result.url;
          let access_token = null;
          let refresh_token = null;
          
          // Try hash fragment first (#access_token=...)
          if (url.includes('#')) {
            const hashPart = url.split('#')[1];
            const hashParams = new URLSearchParams(hashPart);
            access_token = hashParams.get('access_token');
            refresh_token = hashParams.get('refresh_token');
            console.log('[Google OAuth] Extracted tokens from hash fragment');
          }
          
          // Try query params as fallback (?access_token=...)
          if (!access_token && url.includes('?')) {
            const urlObj = new URL(url);
            access_token = urlObj.searchParams.get('access_token');
            refresh_token = urlObj.searchParams.get('refresh_token');
            console.log('[Google OAuth] Extracted tokens from query params');
          }
          
          if (access_token && refresh_token) {
            console.log('[Google OAuth] Step 6: Setting session with extracted tokens...');
            const { error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            
            if (sessionError) {
              console.error('[Google OAuth] Session error:', sessionError);
              Alert.alert('Authentication Error', sessionError.message);
            } else {
              console.log('[Google OAuth] ✅ SUCCESS! Signed in with Google');
              // AuthProvider will handle navigation
            }
          } else {
            console.error('[Google OAuth] No tokens found in callback URL');
            Alert.alert('Authentication Error', 'Failed to get authentication tokens from Google');
          }
        } else if (result.type === 'cancel') {
          console.log('[Google OAuth] User cancelled authentication');
        } else if (result.type === 'dismiss') {
          console.log('[Google OAuth] Browser dismissed without completing');
        }
      }
    } catch (error: any) {
      console.error('[Google OAuth] Unexpected error:', error);
      Alert.alert('Error', error?.message || 'Failed to sign in with Google');
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join the mission</Text>
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
            <Text style={styles.dividerText}>or sign up with email</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Display Name (Optional)</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your warrior name"
                placeholderTextColor="#666"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="warrior@hardparty.com"
                placeholderTextColor="#666"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Minimum 6 characters"
                  placeholderTextColor="#666"
                  secureTextEntry={!showPassword}
                  autoComplete="password-new"
                  textContentType="newPassword"
                  passwordRules="minlength: 6;"
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

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter your password"
                  placeholderTextColor="#666"
                  secureTextEntry={!showConfirmPassword}
                  autoComplete="password-new"
                  textContentType="newPassword"
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  <Ionicons
                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                    size={24}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Create Account Button */}
          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading || socialLoading !== null}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.primaryButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Sign In Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.linkText}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 40,
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
    marginBottom: 20,
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
    marginBottom: 20,
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
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2a3744',
  },
  dividerText: {
    fontSize: 12,
    color: '#8b98a5',
    marginHorizontal: 12,
  },
});
