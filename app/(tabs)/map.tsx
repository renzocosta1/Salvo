import * as Constants from 'expo-constants';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

let Location: any = null;
let locationAvailable = false;

try {
  Location = require('expo-location');
  locationAvailable = true;
} catch (error) {
  console.warn('⚠️ Location module not available:', error);
}

import { coordsToH3, h3ArrayToGeoJSON } from '../../lib/h3Utils';
import { supabase } from '../../lib/supabase';
import { submitCheckIn } from '../../lib/offline/actions';

let Mapbox: any = null;
let mapboxAvailable = false;

try {
  Mapbox = require('@rnmapbox/maps').default;
  mapboxAvailable = true;
} catch (error) {
  console.warn('⚠️ Mapbox not available:', error);
}

const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

// Initialize Mapbox if available
if (mapboxAvailable && Mapbox) {
  try {
    Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);
  } catch (error) {
    console.error('Failed to set Mapbox token:', error);
  }
}

export default function MapScreen() {
  const [mapReady, setMapReady] = useState(false);
  const [revealedH3Tiles, setRevealedH3Tiles] = useState<string[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [tilesRevealed, setTilesRevealed] = useState(0);
  const isExpoGo = Constants.default?.executionEnvironment === 'storeClient';

  // Request location permissions and get user location
  useEffect(() => {
    if (!locationAvailable || !Location) {
      console.log('⚠️ Location module not available');
      return;
    }

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
          console.log('Location permission denied');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        const coords: [number, number] = [
          location.coords.longitude,
          location.coords.latitude,
        ];
        setUserLocation(coords);
        console.log('📍 User location:', coords);
      } catch (error) {
        console.error('Location error:', error);
      }
    })();
  }, []);

  // Subscribe to Supabase realtime updates for h3_tiles
  useEffect(() => {
    // Fetch initial revealed tiles
    const fetchRevealedTiles = async () => {
      const { data, error } = await supabase.from('h3_tiles').select('h3_index');

      if (error) {
        console.error('Error fetching tiles:', error);
        return;
      }

      if (data) {
        const indices = data.map((row) => row.h3_index);
        setRevealedH3Tiles(indices);
        setTilesRevealed(indices.length);
        console.log(`🗺️ Loaded ${indices.length} revealed tiles`);
      }
    };

    fetchRevealedTiles();

    // Subscribe to new tiles
    const channel = supabase
      .channel('h3-tiles-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'h3_tiles',
        },
        (payload: any) => {
          const newH3Index = payload.new.h3_index;
          console.log('🆕 New tile revealed:', newH3Index);
          setRevealedH3Tiles((prev) => {
            const updated = [...new Set([...prev, newH3Index])];
            return updated;
          });
          setTilesRevealed((prev) => prev + 1);
        }
      )
      .subscribe((status: string) => {
        console.log('🔔 Realtime subscription status:', status);
      });

    return () => {
      channel.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!MAPBOX_ACCESS_TOKEN) {
      console.error('❌ MAPBOX_ACCESS_TOKEN is not set in .env file');
    } else {
      console.log('✅ Mapbox token available');
    }
  }, []);

  // Check-in function to reveal tile at current location
  const handleCheckIn = async () => {
    if (!userLocation) {
      Alert.alert('Location Required', 'Please enable location services');
      return;
    }

    const [lng, lat] = userLocation;
    const h3Index = coordsToH3(lat, lng);

    console.log(`🎯 Checking in at H3: ${h3Index}`);

    // Get current user ID
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }

    // Use offline-aware submit function
    const result = await submitCheckIn({
      user_id: user.id,
      h3_index: h3Index,
      event_type: 'check_in',
    });

    if (!result.success) {
      Alert.alert('Check-in Failed', result.error || 'Unknown error');
      return;
    }

    if (result.queued) {
      // Queued offline
      Alert.alert('📡 Queued Offline', `Check-in saved locally. Will sync when online.`, [
        { text: 'OK' },
      ]);
    } else {
      // Submitted online successfully
      console.log('✅ Check-in successful!');
      Alert.alert('✅ Area Revealed!', `You discovered hexagon ${h3Index.slice(0, 8)}...`, [
        { text: 'OK' },
      ]);

      // Manually refetch tiles as a backup (in case realtime doesn't fire)
      setTimeout(async () => {
        const { data: tilesData } = await supabase.from('h3_tiles').select('h3_index');
        if (tilesData) {
          const indices = tilesData.map((row) => row.h3_index);
          setRevealedH3Tiles(indices);
          setTilesRevealed(indices.length);
          console.log(`🔄 Manually refetched ${indices.length} tiles`);
        }
      }, 1000);
    }
  };

  // Starting location: Silver Spring, MD (or user location)
  const centerCoordinate: [number, number] = userLocation || [-77.0261, 38.9907];

  // If Mapbox isn't available (Expo Go mode), show instructions
  if (!mapboxAvailable || isExpoGo) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.errorScrollContent}>
          <Text style={styles.errorEmoji}>🗺️</Text>
          <Text style={styles.errorTitle}>Development Build Required</Text>
          <Text style={styles.errorText}>Mapbox requires native code that isn't available in Expo Go.</Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>📱 Why This Happened:</Text>
            <Text style={styles.infoText}>
              • Mapbox uses native modules{'\n'}• Expo Go only supports built-in modules{'\n'}• You need a custom
              development build
            </Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>🔧 How to Fix:</Text>
            <Text style={styles.infoText}>
              1. Run: npx expo prebuild{'\n'}2. Run: npx expo run:android (or run:ios){'\n'}3. Wait for build to
              complete{'\n'}4. Map will work! 🎯
            </Text>
          </View>
          <Pressable
            style={styles.docsButton}
            onPress={() =>
              Linking.openURL('https://docs.expo.dev/develop/development-builds/introduction/')
            }
          >
            <Text style={styles.docsButtonText}>📚 Read Expo Dev Build Docs</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }

  // If no token, show token error
  if (!MAPBOX_ACCESS_TOKEN) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>⚠️ Mapbox Token Missing</Text>
          <Text style={styles.errorText}>
            Add EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN to your .env file
          </Text>
        </View>
      </View>
    );
  }

  // Convert revealed H3 tiles to GeoJSON
  const revealedGeoJSON = h3ArrayToGeoJSON(revealedH3Tiles);

  // Mapbox is available, render the map
  return (
    <View style={styles.container}>
      {/* Clean Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Map</Text>
        <View style={styles.headerRight}>
          <View style={styles.tilesCounter}>
            <Text style={styles.tilesCounterText}>{tilesRevealed} revealed</Text>
          </View>
        </View>
      </View>

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

        {/* Revealed Hexagon Tiles (Soft Blue) */}
        <Mapbox.ShapeSource id="revealed-hexagons" shape={revealedGeoJSON}>
          <Mapbox.FillLayer
            id="revealed-fill"
            style={{
              fillColor: '#2196f3',
              fillOpacity: 0.25,
            }}
          />
          <Mapbox.LineLayer
            id="revealed-outline"
            style={{
              lineColor: '#2196f3',
              lineWidth: 2,
              lineOpacity: 0.6,
            }}
          />
        </Mapbox.ShapeSource>

        {/* User Location Marker */}
        {userLocation && (
          <Mapbox.PointAnnotation id="user-location" coordinate={userLocation}>
            <View style={styles.userMarker}>
              <View style={styles.userMarkerDot} />
            </View>
          </Mapbox.PointAnnotation>
        )}
      </Mapbox.MapView>

      {/* Reveal Area Button */}
      <View style={styles.buttonContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.revealButton,
            !userLocation && styles.revealButtonDisabled,
            pressed && styles.revealButtonPressed,
          ]}
          onPress={handleCheckIn}
          disabled={!userLocation}
        >
          <Text style={styles.revealButtonText}>
            {userLocation ? 'Reveal Area' : 'Locating...'}
            </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1419',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: '#0f1419',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#2a3744',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tilesCounter: {
    backgroundColor: '#1c2631',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tilesCounterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3498db',
  },
  map: {
    flex: 1,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  revealButton: {
    backgroundColor: '#3498db',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  revealButtonPressed: {
    opacity: 0.8,
  },
  revealButtonDisabled: {
    backgroundColor: '#2a3744',
  },
  revealButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  userMarker: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userMarkerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2196f3',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  errorScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  errorTitle: {
    color: '#1c1c1e',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorText: {
    color: '#757575',
    fontSize: 15,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  infoBox: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '100%',
  },
  infoTitle: {
    color: '#2196f3',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  infoText: {
    color: '#424242',
    fontSize: 14,
    lineHeight: 20,
  },
  docsButton: {
    backgroundColor: '#2196f3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 10,
  },
  docsButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
