import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform, Pressable, Linking } from 'react-native';

export default function PwaStandaloneWarning() {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    // Check if running as standalone PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                         (window.navigator as any).standalone === true ||
                         document.referrer.includes('android-app://');

    // Show warning if NOT in standalone mode
    if (!isStandalone) {
      setShowWarning(true);
    }
  }, []);

  if (!showWarning) return null;

  const handleInstall = () => {
    if (typeof window !== 'undefined') {
      alert(
        '📱 HOW TO INSTALL PROPERLY:\n\n' +
        '1. Tap the Share button (box with arrow)\n' +
        '2. Scroll and tap "Add to Home Screen"\n' +
        '3. Make sure "Open as Web App" is ON\n' +
        '4. Tap "Add"\n' +
        '5. CLOSE Safari completely\n' +
        '6. Tap the Salvo icon on your HOME SCREEN\n\n' +
        'The app should open WITHOUT Safari buttons!'
      );
    }
  };

  return (
    <View style={styles.overlay}>
      <View style={styles.warningBox}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>Not Installed as PWA</Text>
        <Text style={styles.message}>
          This app is running in Safari browser mode.{'\n\n'}
          For full functionality (Maps, Photo Upload, Push Notifications), you must install it as a PWA.{'\n\n'}
          Tap below for instructions.
        </Text>
        <Pressable style={styles.button} onPress={handleInstall}>
          <Text style={styles.buttonText}>📱 How to Install</Text>
        </Pressable>
        <Pressable style={styles.dismissButton} onPress={() => setShowWarning(false)}>
          <Text style={styles.dismissText}>Continue Anyway</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: 20,
  },
  warningBox: {
    backgroundColor: '#1a1f26',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#ff6b35',
    maxWidth: 400,
    width: '100%',
  },
  icon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ff6b35',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: '#ffffff',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#00ff00',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f1419',
    textAlign: 'center',
  },
  dismissButton: {
    paddingVertical: 10,
  },
  dismissText: {
    fontSize: 14,
    color: '#8b98a5',
    textAlign: 'center',
  },
});
