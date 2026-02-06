import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, Pressable } from 'react-native';

export default function PwaStandaloneCheck() {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      // Check if running in standalone mode
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone ||
                          document.referrer.includes('android-app://');
      
      if (!isStandalone) {
        console.warn('[PWA] Not running in standalone mode!');
        setShowWarning(true);
      } else {
        console.log('[PWA] ✅ Running in standalone mode');
      }
    }
  }, []);

  if (!showWarning || Platform.OS !== 'web') {
    return null;
  }

  return (
    <View style={styles.banner}>
      <View style={styles.content}>
        <Text style={styles.emoji}>⚠️</Text>
        <View style={styles.textContainer}>
          <Text style={styles.title}>Install for best experience</Text>
          <Text style={styles.subtitle}>
            Tap Share → "Add to Home Screen" to remove browser controls
          </Text>
        </View>
        <Pressable onPress={() => setShowWarning(false)} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ff6b35',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 24,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#ffffff',
    opacity: 0.9,
  },
  closeButton: {
    padding: 8,
    marginLeft: 8,
  },
  closeText: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: '700',
  },
});
