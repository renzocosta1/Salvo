/**
 * Example: How to use H3 Utils with Mapbox in the Fog of War Map
 * 
 * This file demonstrates the integration between H3 utilities and Mapbox
 * for the Fog of War feature in Task 8.
 */

import React, { useState, useEffect } from 'react';
import MapboxGL from '@rnmapbox/maps';
import { coordsToH3, h3ArrayToGeoJSON } from '../h3Utils';

/**
 * Example 1: Converting user location to H3 and displaying on map
 */
export function UserLocationToH3Example() {
  const [userH3Index, setUserH3Index] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState({ lat: 38.9907, lng: -77.0261 });

  useEffect(() => {
    // When user location changes, calculate the H3 index
    const h3Index = coordsToH3(userLocation.lat, userLocation.lng);
    setUserH3Index(h3Index);
    console.log(`User is in H3 hexagon: ${h3Index}`);
  }, [userLocation.lat, userLocation.lng]);

  return userH3Index;
}

/**
 * Example 2: Rendering revealed H3 hexagons on Mapbox
 */
export function RevealedHexagonsExample() {
  // Simulated revealed tiles from database
  const [revealedTiles, setRevealedTiles] = useState<string[]>([
    '89283082c3fffff', // Example H3 indices
    '89283082c7fffff',
  ]);

  // Convert H3 indices to GeoJSON for Mapbox
  const revealedGeoJSON = h3ArrayToGeoJSON(revealedTiles);

  return (
    <MapboxGL.ShapeSource id="revealed-hexagons" shape={revealedGeoJSON}>
      <MapboxGL.FillLayer
        id="revealed-fill"
        style={{
          fillColor: '#00ff88', // Hard Party Green
          fillOpacity: 0.3,
        }}
      />
      <MapboxGL.LineLayer
        id="revealed-outline"
        style={{
          lineColor: '#00ff88',
          lineWidth: 2,
        }}
      />
    </MapboxGL.ShapeSource>
  );
}

/**
 * Example 3: Complete Fog of War integration flow
 */
export function FogOfWarExample() {
  const [userLat] = useState(38.9907);
  const [userLng] = useState(-77.0261);
  const [revealedH3Tiles, setRevealedH3Tiles] = useState<string[]>([]);

  // Simulate checking in at current location
  const checkInAtCurrentLocation = async () => {
    // 1. Get H3 index for current location
    const h3Index = coordsToH3(userLat, userLng);
    
    // 2. Save to Supabase (would trigger database function)
    // await supabase.from('check_ins').insert({ h3_index: h3Index, ... })
    
    // 3. Add to revealed tiles (in real app, this comes from Supabase Realtime)
    setRevealedH3Tiles(prev => [...new Set([...prev, h3Index])]);
    
    console.log(`Revealed new hexagon: ${h3Index}`);
    console.log(`Total revealed: ${revealedH3Tiles.length + 1}`);
  };

  // Convert revealed tiles to GeoJSON
  const geoJSON = h3ArrayToGeoJSON(revealedH3Tiles);

  return {
    geoJSON,
    checkInAtCurrentLocation,
    revealedCount: revealedH3Tiles.length,
  };
}

/**
 * Example 4: Fetching revealed tiles from Supabase
 */
export async function fetchRevealedTilesFromDatabase(
  supabase: any,
  userId: string
): Promise<GeoJSON.FeatureCollection> {
  // Query the h3_tiles table for this user's party
  const { data, error } = await supabase
    .from('h3_tiles')
    .select('h3_index')
    .eq('party_id', userId); // Assuming user's party_id

  if (error) {
    console.error('Error fetching revealed tiles:', error);
    return { type: 'FeatureCollection', features: [] };
  }

  // Extract H3 indices
  const h3Indices = data.map((row: any) => row.h3_index);
  
  // Convert to GeoJSON for Mapbox
  return h3ArrayToGeoJSON(h3Indices);
}

/**
 * Example 5: Real-time updates for newly revealed tiles
 */
export function useRealtimeH3Updates(supabase: any, partyId: string) {
  const [revealedTiles, setRevealedTiles] = useState<string[]>([]);

  useEffect(() => {
    // Subscribe to new h3_tiles insertions
    const channel = supabase
      .channel('h3-tiles-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'h3_tiles',
          filter: `party_id=eq.${partyId}`,
        },
        (payload: any) => {
          const newH3Index = payload.new.h3_index;
          console.log('🗺️ New hexagon revealed:', newH3Index);
          
          // Add to revealed tiles
          setRevealedTiles(prev => [...new Set([...prev, newH3Index])]);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [supabase, partyId]);

  return h3ArrayToGeoJSON(revealedTiles);
}

/**
 * Test data for development
 */
export const TEST_LOCATIONS = {
  silverSpring: { lat: 38.9907, lng: -77.0261 },
  bethesda: { lat: 38.9807, lng: -77.1006 },
  rockville: { lat: 39.0840, lng: -77.1528 },
};

/**
 * Quick test: Log H3 indices for test locations
 */
export function testH3Conversion() {
  console.log('\n--- H3 Conversion Test ---');
  Object.entries(TEST_LOCATIONS).forEach(([name, coords]) => {
    const h3Index = coordsToH3(coords.lat, coords.lng);
    console.log(`${name}: ${h3Index}`);
  });
}
