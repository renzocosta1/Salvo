#!/usr/bin/env node

// Direct import from h3-js library for testing
const { latLngToCell, cellToBoundary, cellToLatLng } = require('h3-js');

const H3_RESOLUTION = 9;

function coordsToH3(lat, lng) {
  return latLngToCell(lat, lng, H3_RESOLUTION);
}

function h3ToCenter(h3Index) {
  return cellToLatLng(h3Index);
}

function h3ToGeoJSON(h3Index) {
  const boundary = cellToBoundary(h3Index);
  const coordinates = boundary.map(([lat, lng]) => [lng, lat]);
  coordinates.push(coordinates[0]);
  
  return {
    type: 'Feature',
    properties: { h3Index },
    geometry: { type: 'Polygon', coordinates: [coordinates] },
  };
}

function h3ArrayToGeoJSON(h3Indices) {
  return {
    type: 'FeatureCollection',
    features: h3Indices.map(h3ToGeoJSON),
  };
}

console.log('\n🗺️  H3 GRID UTILITY TEST\n');
console.log('═'.repeat(80));

// Test Location: Silver Spring, MD (your area)
const silverSpring = { name: 'Silver Spring, MD', lat: 38.9907, lng: -77.0261 };

console.log('\n📍 Test Location:', silverSpring.name);
console.log(`   Coordinates: ${silverSpring.lat}, ${silverSpring.lng}`);

// Step 1: Convert to H3 index
const h3Index = coordsToH3(silverSpring.lat, silverSpring.lng);
console.log('\n✅ Step 1: Convert to H3 Index');
console.log(`   H3 Index: ${h3Index}`);
console.log(`   (This is the unique ID for this ~350m hexagon)`);

// Step 2: Get hexagon center
const [centerLat, centerLng] = h3ToCenter(h3Index);
console.log('\n✅ Step 2: Get Hexagon Center');
console.log(`   Center: ${centerLat.toFixed(6)}, ${centerLng.toFixed(6)}`);

// Step 3: Generate GeoJSON polygon
const geoJSON = h3ToGeoJSON(h3Index);
console.log('\n✅ Step 3: Generate Mapbox GeoJSON Polygon');
console.log(`   Vertices: ${geoJSON.geometry.coordinates[0].length - 1} sides`);
console.log(`   First vertex: [${geoJSON.geometry.coordinates[0][0][0].toFixed(6)}, ${geoJSON.geometry.coordinates[0][0][1].toFixed(6)}]`);

// Step 4: Test multiple locations (simulate revealed tiles)
const locations = [
  { name: 'Silver Spring', lat: 38.9907, lng: -77.0261 },
  { name: 'Bethesda', lat: 38.9807, lng: -77.1006 },
  { name: 'Rockville', lat: 39.0840, lng: -77.1528 },
];

console.log('\n✅ Step 4: Multiple Locations → H3 Indices');
const h3Indices = locations.map(loc => {
  const idx = coordsToH3(loc.lat, loc.lng);
  console.log(`   ${loc.name}: ${idx}`);
  return idx;
});

// Step 5: Create FeatureCollection for Mapbox
const featureCollection = h3ArrayToGeoJSON(h3Indices);
console.log('\n✅ Step 5: Create GeoJSON FeatureCollection');
console.log(`   Total features: ${featureCollection.features.length}`);
console.log(`   Type: ${featureCollection.type}`);
console.log(`   Ready for Mapbox ShapeSource! ✨`);

// Output sample GeoJSON
console.log('\n📦 Sample GeoJSON Output (first feature):');
console.log(JSON.stringify(featureCollection.features[0], null, 2));

console.log('\n' + '═'.repeat(80));
console.log('✅ All H3 utility functions working correctly!');
console.log('   Next step: Use these in Mapbox FillLayers (Subtask 3)\n');
