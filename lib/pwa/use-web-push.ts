/**
 * Web Push Notifications Hook
 * 
 * Handles Web Push API for PWA notifications on iOS 16.4+ and Android.
 * 
 * IMPORTANT: On iOS, the PWA must be installed to home screen first.
 * Web Push does NOT work in Safari browser tabs, only in standalone PWAs.
 */

import { useState, useEffect } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../supabase';
import { useAuth } from '../auth';

export interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function useWebPush() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    // Only run on web
    if (Platform.OS !== 'web') return;

    // Check if Web Push is supported
    const checkSupport = () => {
      const supported = 
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window;
      
      setIsSupported(supported);
      
      if (supported && 'Notification' in window) {
        setPermission(Notification.permission);
      }
    };

    checkSupport();

    // Check existing subscription (with retry logic for iOS)
    const checkSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        
        // Wait a bit for service worker to fully initialize (iOS needs this)
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const existingSub = await registration.pushManager.getSubscription();
        
        console.log('[Web Push] Checking subscription on mount:', {
          hasSubscription: !!existingSub,
          endpoint: existingSub?.endpoint,
        });
        
        if (existingSub) {
          setSubscription(existingSub);
          setIsSubscribed(true);
          console.log('[Web Push] ✅ Subscription found and restored');
        } else {
          setSubscription(null);
          setIsSubscribed(false);
          console.log('[Web Push] ❌ No subscription found');
        }
      } catch (error) {
        console.error('[Web Push] Error checking subscription:', error);
        setSubscription(null);
        setIsSubscribed(false);
      }
    };

    if (isSupported) {
      checkSubscription();
      
      // Re-check subscription after a delay (helps with iOS PWA state restoration)
      const recheckTimer = setTimeout(() => {
        checkSubscription();
      }, 1000);
      
      return () => clearTimeout(recheckTimer);
    }
  }, []);

  /**
   * Request notification permission and subscribe to push notifications
   */
  const subscribe = async (): Promise<boolean> => {
    if (!isSupported) {
      console.warn('[Web Push] Not supported on this device/browser');
      return false;
    }

    try {
      console.log('[Web Push] Subscribe called, user:', user?.id);

      // Request notification permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      console.log('[Web Push] Permission result:', permissionResult);

      if (permissionResult !== 'granted') {
        console.log('[Web Push] Notification permission denied');
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Check if already subscribed (avoid duplicate subscriptions)
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) {
        console.log('[Web Push] Already subscribed, using existing subscription');
        setSubscription(existingSub);
        setIsSubscribed(true);
        
        // Ensure it's saved to database
        if (user) {
          await saveSubscriptionToDatabase(existingSub);
        }
        return true;
      }

      // Subscribe to push notifications
      // NOTE: You need to generate VAPID keys and add your public key here
      // Generate keys at: https://vapidkeys.com/ or using web-push library
      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          // TODO: Replace with your actual VAPID public key
          process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY || 
          'YOUR_VAPID_PUBLIC_KEY_HERE'
        ),
      });

      console.log('[Web Push] Push subscription created:', pushSubscription.endpoint);

      setSubscription(pushSubscription);
      setIsSubscribed(true);

      // Save subscription to Supabase
      if (user) {
        await saveSubscriptionToDatabase(pushSubscription);
      }

      console.log('[Web Push] Successfully subscribed to push notifications');
      return true;
    } catch (error) {
      console.error('[Web Push] Subscription failed:', error);
      setSubscription(null);
      setIsSubscribed(false);
      return false;
    }
  };

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribe = async (): Promise<boolean> => {
    if (!subscription) {
      return false;
    }

    try {
      await subscription.unsubscribe();
      setSubscription(null);
      setIsSubscribed(false);

      // Remove from database
      if (user) {
        await removeSubscriptionFromDatabase(subscription);
      }

      console.log('[Web Push] Successfully unsubscribed from push notifications');
      return true;
    } catch (error) {
      console.error('[Web Push] Unsubscribe failed:', error);
      return false;
    }
  };

  /**
   * Save push subscription to Supabase
   */
  const saveSubscriptionToDatabase = async (pushSub: PushSubscription) => {
    if (!user) return;

    try {
      const subJSON = pushSub.toJSON();
      
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subJSON.endpoint,
          p256dh: subJSON.keys?.p256dh,
          auth: subJSON.keys?.auth,
          platform: 'web',
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,endpoint',
        });

      if (error) {
        console.error('[Web Push] Error saving subscription:', error);
      } else {
        console.log('[Web Push] Subscription saved to database');
      }
    } catch (error) {
      console.error('[Web Push] Error saving subscription:', error);
    }
  };

  /**
   * Remove push subscription from Supabase
   */
  const removeSubscriptionFromDatabase = async (pushSub: PushSubscription) => {
    if (!user) return;

    try {
      const subJSON = pushSub.toJSON();
      
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .match({
          user_id: user.id,
          endpoint: subJSON.endpoint,
        });

      if (error) {
        console.error('[Web Push] Error removing subscription:', error);
      }
    } catch (error) {
      console.error('[Web Push] Error removing subscription:', error);
    }
  };

  return {
    isSupported,
    isSubscribed,
    permission,
    subscribe,
    unsubscribe,
  };
}

/**
 * Convert VAPID public key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
