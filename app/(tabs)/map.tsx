import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import Mapbox from '@rnmapbox/maps';

const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

// Initialize Mapbox
Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

export default function MapScreen() {
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!MAPBOX_ACCESS_TOKEN) {
      console.error('❌ MAPBOX_ACCESS_TOKEN is not set in .env file');
    } else {
      console.log('✅ Mapbox initialized');
    }
  }, []);

  // Starting location: Silver Spring, MD
  const centerCoordinate: [number, number] = [-77.0261, 38.9907];

  return (
    <View style={styles.container}>
      {!MAPBOX_ACCESS_TOKEN ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ MAPBOX TOKEN MISSING</Text>
          <Text style={styles.errorSubtext}>
            Add EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN to your .env file
          </Text>
        </View>
      ) : (
        <Mapbox.MapView
          style={styles.map}
          styleURL="mapbox://styles/mapbox/dark-v11"
          onDidFinishLoadingMap={() => {
            setMapReady(true);
            console.log('🗺️ Map loaded successfully');
          }}
        >
          <Mapbox.Camera
            zoomLevel={14}
            pitch={50}
            centerCoordinate={centerCoordinate}
            animationDuration={1000}
          />
        </Mapbox.MapView>
      )}

      {/* Tactical HUD Overlay */}
      <View style={styles.hudOverlay}>
        <View style={styles.hudHeader}>
          <Text style={styles.hudTitle}>FOG OF WAR</Text>
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, mapReady && styles.statusDotActive]} />
            <Text style={styles.statusText}>
              {mapReady ? 'TACTICAL VIEW ONLINE' : 'INITIALIZING...'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  map: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  errorSubtext: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
  hudOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  hudHeader: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#00ff88',
  },
  hudTitle: {
    color: '#00ff88',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 2,
    marginBottom: 8,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#666',
    marginRight: 8,
  },
  statusDotActive: {
    backgroundColor: '#00ff88',
  },
  statusText: {
    color: '#888',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
