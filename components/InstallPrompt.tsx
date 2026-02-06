/**
 * InstallPrompt Component
 * 
 * Shows iOS/Android users how to install Salvo as a PWA to their home screen.
 * Appears once per session for mobile web users who haven't installed yet.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const INSTALL_PROMPT_KEY = 'salvo-install-prompt-shown';

interface InstallPromptProps {
  onDismiss?: () => void;
}

export default function InstallPrompt({ onDismiss }: InstallPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Only run on web
    if (Platform.OS !== 'web') return;

    const checkInstallPrompt = async () => {
      try {
        // Check if already shown this session
        const hasShown = await AsyncStorage.getItem(INSTALL_PROMPT_KEY);
        if (hasShown === 'true') return;

        // Check if running in standalone mode (already installed)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
          (window.navigator as any).standalone === true;
        
        if (isStandalone) return;

        // Detect platform
        const userAgent = window.navigator.userAgent.toLowerCase();
        const ios = /iphone|ipad|ipod/.test(userAgent);
        const android = /android/.test(userAgent);

        setIsIOS(ios);
        setIsAndroid(android);

        // Show prompt if on mobile
        if (ios || android) {
          setShowPrompt(true);
        }
      } catch (error) {
        console.error('Error checking install prompt:', error);
      }
    };

    // Listen for beforeinstallprompt (Android Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsAndroid(true);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    checkInstallPrompt();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Android Chrome native prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      setDeferredPrompt(null);
    }
    
    // Mark as shown
    await AsyncStorage.setItem(INSTALL_PROMPT_KEY, 'true');
    setShowPrompt(false);
    onDismiss?.();
  };

  const handleDismiss = async () => {
    await AsyncStorage.setItem(INSTALL_PROMPT_KEY, 'true');
    setShowPrompt(false);
    onDismiss?.();
  };

  if (!showPrompt) return null;

  return (
    <Modal
      visible={showPrompt}
      transparent
      animationType="slide"
      onRequestClose={handleDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>📱 Install Salvo</Text>
            <Text style={styles.subtitle}>
              Add Salvo to your home screen for the best experience
            </Text>
          </View>

          {/* Benefits */}
          <View style={styles.benefits}>
            <Text style={styles.benefit}>✓ Election Day push notifications</Text>
            <Text style={styles.benefit}>✓ Offline access to your missions</Text>
            <Text style={styles.benefit}>✓ Un-bannable direct access</Text>
            <Text style={styles.benefit}>✓ Faster loading & better performance</Text>
          </View>

          {/* iOS Instructions */}
          {isIOS && (
            <View style={styles.instructions}>
              <Text style={styles.instructionsTitle}>3 Easy Steps:</Text>
              <View style={styles.stepContainer}>
                <Text style={styles.stepNumber}>1</Text>
                <Text style={styles.stepText}>
                  Look at the <Text style={styles.bold}>bottom of Safari</Text> and tap the{' '}
                  <Text style={styles.bold}>Share button</Text> (square box with arrow pointing up ⬆️)
                </Text>
              </View>
              <View style={styles.stepContainer}>
                <Text style={styles.stepNumber}>2</Text>
                <Text style={styles.stepText}>
                  Scroll down the menu and tap{' '}
                  <Text style={styles.bold}>"Add to Home Screen"</Text> (it has a plus + icon)
                </Text>
              </View>
              <View style={styles.stepContainer}>
                <Text style={styles.stepNumber}>3</Text>
                <Text style={styles.stepText}>
                  Tap <Text style={styles.bold}>"Add"</Text> in the top right corner
                </Text>
              </View>
              <Text style={styles.note}>✅ Done! Find the green Salvo icon on your home screen</Text>
            </View>
          )}

          {/* Android Instructions */}
          {isAndroid && !deferredPrompt && (
            <View style={styles.instructions}>
              <Text style={styles.instructionsTitle}>How to Install on Android:</Text>
              <Text style={styles.step}>1. Tap the <Text style={styles.bold}>menu (⋮)</Text> in the browser</Text>
              <Text style={styles.step}>2. Tap <Text style={styles.bold}>"Add to Home screen"</Text></Text>
              <Text style={styles.step}>3. Tap <Text style={styles.bold}>"Add"</Text></Text>
              <Text style={styles.note}>📌 Look for the Salvo icon on your home screen!</Text>
            </View>
          )}

          {/* Android Native Install Button */}
          {isAndroid && deferredPrompt && (
            <TouchableOpacity style={styles.installButton} onPress={handleInstallClick}>
              <Text style={styles.installButtonText}>Install Now</Text>
            </TouchableOpacity>
          )}

          {/* Dismiss Button */}
          <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
            <Text style={styles.dismissButtonText}>
              {deferredPrompt ? 'Maybe Later' : 'Got It'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#0f1419',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 2,
    borderTopColor: '#39FF14',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8b98a5',
    lineHeight: 22,
  },
  benefits: {
    backgroundColor: '#1c2631',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  benefit: {
    fontSize: 15,
    color: '#39FF14',
    marginBottom: 8,
    lineHeight: 20,
  },
  instructions: {
    backgroundColor: '#1c2631',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#39FF14',
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#39FF14',
    marginBottom: 16,
    textAlign: 'center',
  },
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  stepNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#39FF14',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0f1419',
    textAlign: 'center',
    lineHeight: 32,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#39FF14',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: '#ffffff',
    lineHeight: 22,
  },
  step: {
    fontSize: 14,
    color: '#8b98a5',
    marginBottom: 8,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
    color: '#ffffff',
  },
  note: {
    fontSize: 14,
    color: '#39FF14',
    marginTop: 8,
    fontWeight: '600',
  },
  installButton: {
    backgroundColor: '#39FF14',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  installButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f1419',
  },
  dismissButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a3744',
  },
  dismissButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8b98a5',
  },
});
