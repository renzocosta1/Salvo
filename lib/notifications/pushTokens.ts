/**
 * Push Token Registration Service
 * Handles Expo push notification token registration and storage
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register device for push notifications
 * @param userId - The user's profile ID
 * @returns The Expo push token, or null if registration failed
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  // Skip on web (use PWA notifications instead)
  if (Platform.OS === 'web') {
    console.log('[Push] Skipping native push registration on web');
    return null;
  }

  // TODO: Push notifications require Expo project configuration
  // For now, skip registration to avoid errors during development
  console.log('[Push] Skipping registration - requires Expo project setup');
  return null;

  /* Uncomment when Expo project is properly configured:
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('[Push] Permission denied');
      return null;
    }
    
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'YOUR_EXPO_PROJECT_UUID_HERE',
    });
    const token = tokenData.data;
    
    const { error } = await supabase
      .from('profiles')
      .update({ 
        expo_push_token: token,
        notifications_enabled: true,
      })
      .eq('id', userId);
      
    if (error) {
      console.error('[Push] Failed to save token:', error);
      return null;
    }
    
    return token;
  } catch (error) {
    console.error('[Push] Registration failed:', error);
    return null;
  }
  */
}

/**
 * Unregister device from push notifications
 * @param userId - The user's profile ID
 */
export async function unregisterPushNotifications(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        expo_push_token: null,
        notifications_enabled: false,
      })
      .eq('id', userId);
      
    if (error) {
      console.error('[Push] Failed to clear token:', error);
    } else {
      console.log('[Push] Token cleared from database');
    }
  } catch (error) {
    console.error('[Push] Unregister failed:', error);
  }
}

/**
 * Check if push notifications are enabled for this device
 */
export async function checkPushPermissions(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (Platform.OS === 'web') {
    return 'undetermined';
  }
  
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}
