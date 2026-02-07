import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

export default function TestNotificationButton() {
  const { user } = useAuth();
  const [sending, setSending] = useState(false);

  const sendTestNotification = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: {
          title: '🎯 Test Notification',
          body: 'This is a test push notification from Salvo!',
          icon: '/icon-192.png',
          data: {
            type: 'test',
            timestamp: Date.now(),
          },
          // Send to all users (or specify userIds: [user.id] to send only to yourself)
        },
      });

      if (error) throw error;

      console.log('Notification result:', data);
      
      Alert.alert(
        'Notification Sent!',
        `Sent: ${data.sent || 0}\nFailed: ${data.failed || 0}\nTotal subscriptions: ${data.total || 0}`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error sending notification:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to send notification. Make sure the Edge Function is deployed.'
      );
    } finally {
      setSending(false);
    }
  };

  const sendToSelfOnly = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: {
          title: '👋 Personal Test',
          body: 'This notification is only for you!',
          icon: '/icon-192.png',
          data: {
            type: 'test',
            timestamp: Date.now(),
          },
          userIds: [user.id], // Send only to yourself
        },
      });

      if (error) throw error;

      console.log('Notification result:', data);
      
      Alert.alert(
        'Sent to You!',
        `${data.sent > 0 ? 'Check your notifications!' : 'Make sure you\'ve subscribed to notifications first.'}`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Error sending notification:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to send notification'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Test Push Notifications</Text>
      <Text style={styles.subtitle}>
        Make sure you've enabled notifications first!
      </Text>

      <Pressable
        style={[styles.button, sending && styles.buttonDisabled]}
        onPress={sendToSelfOnly}
        disabled={sending}
      >
        <Ionicons name="person" size={20} color="#ffffff" />
        <Text style={styles.buttonText}>
          {sending ? 'Sending...' : 'Send to Me'}
        </Text>
      </Pressable>

      <Pressable
        style={[styles.button, styles.buttonSecondary, sending && styles.buttonDisabled]}
        onPress={sendTestNotification}
        disabled={sending}
      >
        <Ionicons name="people" size={20} color="#ffffff" />
        <Text style={styles.buttonText}>
          {sending ? 'Sending...' : 'Send to All'}
        </Text>
      </Pressable>

      <View style={styles.info}>
        <Ionicons name="information-circle-outline" size={16} color="#8b98a5" />
        <Text style={styles.infoText}>
          On iOS, you must add the PWA to home screen first
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1c2631',
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#2a3744',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8b98a5',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#3498db',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonSecondary: {
    backgroundColor: '#9b59b6',
  },
  buttonDisabled: {
    backgroundColor: '#2a3744',
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2a3744',
  },
  infoText: {
    fontSize: 12,
    color: '#8b98a5',
    flex: 1,
  },
});
