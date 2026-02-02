import * as Constants from 'expo-constants';
import React, { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

// #region agent log
fetch('http://127.0.0.1:7242/ingest/5f41651f-fc97-40d7-bb16-59b10a371800',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'map.tsx:6',message:'Map module import start',data:{platform:Platform.OS},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H5'})}).catch(()=>{});
// #endregion

let Mapbox: any = null;
let mapboxAvailable = false;

try {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/5f41651f-fc97-40d7-bb16-59b10a371800',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'map.tsx:14',message:'Attempting Mapbox import',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  
  Mapbox = require('@rnmapbox/maps').default;
  mapboxAvailable = true;
  
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/5f41651f-fc97-40d7-bb16-59b10a371800',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'map.tsx:21',message:'Mapbox import SUCCESS',data:{mapboxAvailable:true,hasSetAccessToken:typeof Mapbox?.setAccessToken==='function'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
} catch (error) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/5f41651f-fc97-40d7-bb16-59b10a371800',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'map.tsx:27',message:'Mapbox import FAILED',data:{error:error?.toString(),mapboxAvailable:false},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  console.warn('⚠️ Mapbox not available:', error);
}

const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';

// Initialize Mapbox if available
if (mapboxAvailable && Mapbox) {
  try {
    Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5f41651f-fc97-40d7-bb16-59b10a371800',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'map.tsx:41',message:'Mapbox token set',data:{hasToken:!!MAPBOX_ACCESS_TOKEN},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5f41651f-fc97-40d7-bb16-59b10a371800',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'map.tsx:46',message:'Mapbox setAccessToken failed',data:{error:error?.toString()},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
  }
}

export default function MapScreen() {
  const [mapReady, setMapReady] = useState(false);
  const isExpoGo = Constants.default?.executionEnvironment === 'storeClient';

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/5f41651f-fc97-40d7-bb16-59b10a371800',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'map.tsx:58',message:'MapScreen mounted',data:{mapboxAvailable,isExpoGo,executionEnv:Constants.default?.executionEnvironment,hasToken:!!MAPBOX_ACCESS_TOKEN},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1,H4'})}).catch(()=>{});
    // #endregion
    
    if (!MAPBOX_ACCESS_TOKEN) {
      console.error('❌ MAPBOX_ACCESS_TOKEN is not set in .env file');
    } else {
      console.log('✅ Mapbox token available');
    }
  }, []);

  // Starting location: Silver Spring, MD
  const centerCoordinate: [number, number] = [-77.0261, 38.9907];

  // If Mapbox isn't available (Expo Go mode), show instructions
  if (!mapboxAvailable || isExpoGo) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.errorContainer}>
          <Text style={styles.errorEmoji}>🗺️</Text>
          <Text style={styles.errorTitle}>Development Build Required</Text>
          <Text style={styles.errorText}>
            Mapbox requires native code that isn't available in Expo Go.
          </Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>📱 Why This Happened:</Text>
            <Text style={styles.infoText}>
              • Mapbox uses native modules{'\n'}
              • Expo Go only supports built-in modules{'\n'}
              • You need a custom development build
            </Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>🔧 How to Fix:</Text>
            <Text style={styles.infoText}>
              1. Run: npx expo prebuild{'\n'}
              2. Run: npx expo run:android (or run:ios){'\n'}
              3. Wait for build to complete{'\n'}
              4. Map will work! 🎯
            </Text>
          </View>
          <Pressable
            style={styles.docsButton}
            onPress={() => Linking.openURL('https://docs.expo.dev/develop/development-builds/introduction/')}
          >
            <Text style={styles.docsButtonText}>📚 Read Expo Dev Build Docs</Text>
          </Pressable>
          <View style={styles.debugInfo}>
            <Text style={styles.debugText}>Debug Info:</Text>
            <Text style={styles.debugText}>• Expo Go: {isExpoGo ? 'YES' : 'NO'}</Text>
            <Text style={styles.debugText}>• Mapbox Available: {mapboxAvailable ? 'YES' : 'NO'}</Text>
            <Text style={styles.debugText}>• Token: {MAPBOX_ACCESS_TOKEN ? 'SET' : 'MISSING'}</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  // If no token, show token error
  if (!MAPBOX_ACCESS_TOKEN) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ MAPBOX TOKEN MISSING</Text>
          <Text style={styles.errorSubtext}>
            Add EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN to your .env file
          </Text>
        </View>
      </View>
    );
  }

  // Mapbox is available, render the map
  return (
    <View style={styles.container}>
      <Mapbox.MapView
        style={styles.map}
        styleURL="mapbox://styles/mapbox/dark-v11"
        onDidFinishLoadingMap={() => {
          setMapReady(true);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/5f41651f-fc97-40d7-bb16-59b10a371800',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'map.tsx:141',message:'Map loaded successfully',data:{mapReady:true},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H4'})}).catch(()=>{});
          // #endregion
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
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  errorEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  errorTitle: {
    color: '#00ff88',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  errorSubtext: {
    color: '#888',
    fontSize: 14,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    width: '100%',
  },
  infoTitle: {
    color: '#00ff88',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  infoText: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  docsButton: {
    backgroundColor: '#00ff88',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  docsButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  debugInfo: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#222',
    borderRadius: 8,
    width: '100%',
  },
  debugText: {
    color: '#666',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginBottom: 5,
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
