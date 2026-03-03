import { useAuth } from '@/lib/auth';
import WarRoomHUD from '@/components/WarRoomHUD';
import React from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';

export default function WarRoomScreen() {
  const { profile } = useAuth();

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#39FF14" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!profile.party_id) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorEmoji}>⚠️</Text>
        <Text style={styles.errorTitle}>No Party Assigned</Text>
        <Text style={styles.errorText}>
          Complete onboarding to access the War Room.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WarRoomHUD />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#39FF14',
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
});
