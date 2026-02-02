// H3 library may not work in React Native due to WASM issues
// Use dynamic import with fallback
let h3Available = false;
let latLngToCell: any;
let cellToBoundary: any;
let cellToLatLng: any;

try {
  const h3 = require('h3-js');
  latLngToCell = h3.latLngToCell;
  cellToBoundary = h3.cellToBoundary;
  cellToLatLng = h3.cellToLatLng;
  h3Available = true;
} catch (error) {
  console.warn('⚠️ h3-js not available, H3 features will be disabled:', error);
}

/**
 * H3 Resolution 9 (~0.1 km² hexagons - perfect for city exploration)
 * About 350m across (3-4 city blocks)
 */
export const H3_RESOLUTION = 9;

/**
 * Convert latitude/longitude to H3 Resolution 9 index
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns H3 index string (e.g., "89283082c3fffff")
 */
export function coordsToH3(lat: number, lng: number): string {
  if (!h3Available || !latLngToCell) {
    // Fallback: Generate a deterministic hex-like ID from coordinates
    const latInt = Math.floor(lat * 10000);
    const lngInt = Math.floor(lng * 10000);
    return `mock_${latInt}_${lngInt}`;
  }
  return latLngToCell(lat, lng, H3_RESOLUTION);
}

/**
 * Convert H3 index to GeoJSON Polygon geometry for Mapbox
 * @param h3Index - H3 hexagon index
 * @returns GeoJSON Polygon feature
 */
export function h3ToGeoJSON(h3Index: string): GeoJSON.Feature<GeoJSON.Polygon> {
  if (!h3Available || !cellToBoundary) {
    // Fallback: Generate an approximate hexagon
    // Extract lat/lng from mock ID
    const match = h3Index.match(/mock_(-?\d+)_(-?\d+)/);
    if (match) {
      const lat = parseInt(match[1]) / 10000;
      const lng = parseInt(match[2]) / 10000;
      const size = 0.003; // ~300m hexagon
      const coordinates = generateHexagon(lng, lat, size);
      
      
      return {
        type: 'Feature',
        properties: { h3Index },
        geometry: {
          type: 'Polygon',
          coordinates: [coordinates],
        },
      };
    }
  }
  
  // Get boundary coordinates as [lat, lng] pairs
  const boundary = cellToBoundary(h3Index);
  
  // Convert to [lng, lat] for GeoJSON (note the order swap)
  const coordinates = boundary.map(([lat, lng]) => [lng, lat]);
  
  // Close the polygon by adding the first point at the end
  coordinates.push(coordinates[0]);

  return {
    type: 'Feature',
    properties: {
      h3Index,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates],
    },
  };
}

/**
 * Generate a hexagon shape centered at given coordinates
 * @param lng - Center longitude
 * @param lat - Center latitude
 * @param size - Size of hexagon (degrees)
 * @returns Array of [lng, lat] coordinates
 */
function generateHexagon(lng: number, lat: number, size: number): number[][] {
  const angles = [0, 60, 120, 180, 240, 300, 360];
  return angles.map(angle => {
    const rad = (angle * Math.PI) / 180;
    return [
      lng + size * Math.cos(rad),
      lat + size * Math.sin(rad),
    ];
  });
}

/**
 * Convert multiple H3 indices to a GeoJSON FeatureCollection
 * @param h3Indices - Array of H3 hexagon indices
 * @returns GeoJSON FeatureCollection
 */
export function h3ArrayToGeoJSON(h3Indices: string[]): GeoJSON.FeatureCollection<GeoJSON.Polygon> {
  return {
    type: 'FeatureCollection',
    features: h3Indices.map(h3ToGeoJSON),
  };
}

/**
 * Get the center point of an H3 hexagon
 * @param h3Index - H3 hexagon index
 * @returns [latitude, longitude]
 */
export function h3ToCenter(h3Index: string): [number, number] {
  if (!h3Available || !cellToLatLng) {
    // Fallback: Extract from mock ID
    const match = h3Index.match(/mock_(-?\d+)_(-?\d+)/);
    if (match) {
      const lat = parseInt(match[1]) / 10000;
      const lng = parseInt(match[2]) / 10000;
      return [lat, lng];
    }
    return [0, 0]; // Default fallback
  }
  return cellToLatLng(h3Index);
}

/**
 * Example usage:
 * 
 * // User location in Silver Spring, MD
 * const userLat = 38.9907;
 * const userLng = -77.0261;
 * 
 * // Get H3 index for this location
 * const h3Index = coordsToH3(userLat, userLng);
 * // Returns: "89283082c3fffff" (or similar)
 * 
 * // Convert to GeoJSON for Mapbox
 * const geoJSON = h3ToGeoJSON(h3Index);
 * 
 * // Or convert multiple revealed tiles
 * const revealedTiles = ['89283082c3fffff', '89283082c7fffff'];
 * const geoJSONCollection = h3ArrayToGeoJSON(revealedTiles);
 */
