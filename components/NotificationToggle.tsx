import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { useWebPush } from '@/lib/pwa/use-web-push';

export default function NotificationToggle() {
  const { isSupported, isSubscribed, permission, subscribe, unsubscribe } = useWebPush();
  const [loading, setLoading] = useState(false);

  // Only show on web
  if (Platform.OS !== 'web') {
    return null;
  }

  // Don't show if not supported
  if (!isSupported) {
    return null;
  }

  const handleToggle = async () => {
    setLoading(true);
    try {
      if (isSubscribed) {
        await unsubscribe();
      } else {
        const success = await subscribe();
        if (!success && permission === 'denied') {
          if (Platform.OS === 'web') {
            window.alert(
              'Notifications are blocked. To enable:\n\n' +
              '1. Tap the AA icon in Safari address bar\n' +
              '2. Tap "Website Settings"\n' +
              '3. Enable "Notifications"'
            );
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Push Notifications</Text>
          <Text style={styles.subtitle}>
            {isSubscribed 
              ? 'Get Election Day alerts' 
              : 'Enable alerts for important updates'}
          </Text>
        </View>
        
        <TouchableOpacity
          style={[
            styles.toggle,
            isSubscribed && styles.toggleActive,
            loading && styles.toggleDisabled,
          ]}
          onPress={handleToggle}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <View style={[styles.toggleKnob, isSubscribed && styles.toggleKnobActive]} />
          )}
        </TouchableOpacity>
      </View>
      
      {permission === 'denied' && (
        <Text style={styles.deniedText}>
          ⚠️ Notifications blocked in browser settings
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1c2631',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textContainer: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8b98a5',
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2a3744',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#39FF14',
  },
  toggleDisabled: {
    opacity: 0.6,
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#ffffff',
    transform: [{ translateX: 0 }],
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
  deniedText: {
    marginTop: 12,
    fontSize: 12,
    color: '#ff6b35',
  },
});
