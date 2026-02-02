import { coordsToH3, h3ToGeoJSON, h3ArrayToGeoJSON, h3ToCenter, H3_RESOLUTION } from '../h3Utils';

describe('H3 Utils', () => {
  // Test coordinates: San Francisco
  const testLat = 37.7749;
  const testLng = -122.4194;

  describe('coordsToH3', () => {
    it('should convert lat/lng to H3 Resolution 9 index', () => {
      const h3Index = coordsToH3(testLat, testLng);
      
      // H3 indices are hexadecimal strings of length 15
      expect(h3Index).toBeDefined();
      expect(typeof h3Index).toBe('string');
      expect(h3Index.length).toBe(15);
      
      console.log(`San Francisco (${testLat}, ${testLng}) → H3: ${h3Index}`);
    });

    it('should return consistent results for the same coordinates', () => {
      const h3Index1 = coordsToH3(testLat, testLng);
      const h3Index2 = coordsToH3(testLat, testLng);
      
      expect(h3Index1).toBe(h3Index2);
    });
  });

  describe('h3ToGeoJSON', () => {
    it('should convert H3 index to valid GeoJSON Polygon', () => {
      const h3Index = coordsToH3(testLat, testLng);
      const geoJSON = h3ToGeoJSON(h3Index);
      
      // Verify GeoJSON structure
      expect(geoJSON.type).toBe('Feature');
      expect(geoJSON.geometry.type).toBe('Polygon');
      expect(geoJSON.properties?.h3Index).toBe(h3Index);
      
      // H3 hexagons have 7 coordinate pairs (6 vertices + closing point)
      expect(geoJSON.geometry.coordinates[0].length).toBe(7);
      
      // Verify coordinates are in [lng, lat] format
      const firstCoord = geoJSON.geometry.coordinates[0][0];
      expect(firstCoord.length).toBe(2);
      expect(typeof firstCoord[0]).toBe('number'); // longitude
      expect(typeof firstCoord[1]).toBe('number'); // latitude
      
      console.log('GeoJSON Feature:', JSON.stringify(geoJSON, null, 2));
    });

    it('should close the polygon (first point === last point)', () => {
      const h3Index = coordsToH3(testLat, testLng);
      const geoJSON = h3ToGeoJSON(h3Index);
      
      const coords = geoJSON.geometry.coordinates[0];
      const firstPoint = coords[0];
      const lastPoint = coords[coords.length - 1];
      
      expect(firstPoint[0]).toBe(lastPoint[0]);
      expect(firstPoint[1]).toBe(lastPoint[1]);
    });
  });

  describe('h3ArrayToGeoJSON', () => {
    it('should convert multiple H3 indices to FeatureCollection', () => {
      // Silver Spring, MD
      const silverSpring = coordsToH3(38.9907, -77.0261);
      // Bethesda, MD
      const bethesda = coordsToH3(38.9807, -77.1006);
      
      const collection = h3ArrayToGeoJSON([silverSpring, bethesda]);
      
      expect(collection.type).toBe('FeatureCollection');
      expect(collection.features.length).toBe(2);
      expect(collection.features[0].type).toBe('Feature');
      expect(collection.features[1].type).toBe('Feature');
      
      console.log(`Created FeatureCollection with ${collection.features.length} hexagons`);
    });

    it('should handle empty array', () => {
      const collection = h3ArrayToGeoJSON([]);
      
      expect(collection.type).toBe('FeatureCollection');
      expect(collection.features.length).toBe(0);
    });
  });

  describe('h3ToCenter', () => {
    it('should return the center coordinates of an H3 hexagon', () => {
      const h3Index = coordsToH3(testLat, testLng);
      const [centerLat, centerLng] = h3ToCenter(h3Index);
      
      expect(typeof centerLat).toBe('number');
      expect(typeof centerLng).toBe('number');
      
      // Center should be close to the original coordinates
      // (within the hexagon, which is ~350m across)
      const latDiff = Math.abs(centerLat - testLat);
      const lngDiff = Math.abs(centerLng - testLng);
      
      expect(latDiff).toBeLessThan(0.01); // ~1km tolerance
      expect(lngDiff).toBeLessThan(0.01);
      
      console.log(`H3 Center: (${centerLat}, ${centerLng})`);
    });
  });

  describe('Integration test', () => {
    it('should work end-to-end for Montgomery County, MD locations', () => {
      const locations = [
        { name: 'Silver Spring', lat: 38.9907, lng: -77.0261 },
        { name: 'Bethesda', lat: 38.9807, lng: -77.1006 },
        { name: 'Rockville', lat: 39.0840, lng: -77.1528 },
      ];
      
      console.log('\n--- Montgomery County, MD H3 Mapping ---');
      
      locations.forEach(location => {
        const h3Index = coordsToH3(location.lat, location.lng);
        const geoJSON = h3ToGeoJSON(h3Index);
        const [centerLat, centerLng] = h3ToCenter(h3Index);
        
        console.log(`\n${location.name}:`);
        console.log(`  Original: (${location.lat}, ${location.lng})`);
        console.log(`  H3 Index: ${h3Index}`);
        console.log(`  Center: (${centerLat.toFixed(4)}, ${centerLng.toFixed(4)})`);
        console.log(`  Hexagon vertices: ${geoJSON.geometry.coordinates[0].length - 1}`);
        
        expect(h3Index).toBeDefined();
        expect(geoJSON.geometry.coordinates[0].length).toBe(7);
      });
    });
  });
});
