import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function EmptyFeed() {
  return (
    <View style={styles.container}>
      {/* Icon/Visual */}
      <View style={styles.iconContainer}>
        <Text style={styles.iconText}>📋</Text>
      </View>

      {/* Heading */}
      <Text style={styles.heading}>No Active Directives</Text>

      {/* Subtext */}
      <Text style={styles.subtext}>
        Command feed is empty. Await orders from your General or Captain.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#0f1419',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1c2631',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconText: {
    fontSize: 40,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtext: {
    fontSize: 15,
    color: '#8b98a5',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
});
