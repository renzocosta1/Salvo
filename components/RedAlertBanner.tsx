import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated } from 'react-native';
import { getAlertMessage, getAlertSeverity, type AlertWithMarket } from '@/lib/alerts/oddsAlerts';

interface RedAlertBannerProps {
  alerts: AlertWithMarket[];
  onDismiss: (alertId: string) => void;
}

export default function RedAlertBanner({ alerts, onDismiss }: RedAlertBannerProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (alerts.length > 0) {
      // Pulse animation for critical alerts
      const hasCritical = alerts.some((a) => getAlertSeverity(a) === 'critical');
      
      if (hasCritical) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.05,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }
    }

    return () => {
      pulseAnim.setValue(1);
    };
  }, [alerts]);

  if (alerts.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {alerts.map((alert) => {
        const severity = getAlertSeverity(alert);
        const message = getAlertMessage(alert);

        return (
          <Animated.View
            key={alert.id}
            style={[
              styles.alertCard,
              severity === 'critical' && styles.alertCritical,
              severity === 'warning' && styles.alertWarning,
              severity === 'info' && styles.alertInfo,
              severity === 'critical' && { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <View style={styles.alertContent}>
              <Text
                style={[
                  styles.alertText,
                  severity === 'critical' && styles.alertTextCritical,
                ]}
              >
                {message}
              </Text>
              <Text style={styles.alertTime}>
                {new Date(alert.triggered_at).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            <Pressable
              onPress={() => onDismiss(alert.id)}
              style={styles.dismissButton}
            >
              <Text style={styles.dismissText}>✕</Text>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    backgroundColor: '#1a1f26',
  },
  alertCritical: {
    borderColor: '#ff0000',
    backgroundColor: '#2a0000',
  },
  alertWarning: {
    borderColor: '#ff9500',
    backgroundColor: '#2a1a00',
  },
  alertInfo: {
    borderColor: '#39FF14',
    backgroundColor: '#001a00',
  },
  alertContent: {
    flex: 1,
  },
  alertText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  alertTextCritical: {
    color: '#ff4444',
  },
  alertTime: {
    fontSize: 11,
    color: '#888',
  },
  dismissButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  dismissText: {
    fontSize: 20,
    color: '#888',
    fontWeight: 'bold',
  },
});
