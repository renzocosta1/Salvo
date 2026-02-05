/**
 * Maryland District Lookup Utility
 * 
 * Maps lat/lng coordinates to Maryland County, Legislative District, and Congressional District
 * Uses simple bounding box matching for Alpha (Montgomery County focus)
 * 
 * Future: Can be enhanced with full GeoJSON polygons for precise district boundaries
 */

import districtData from './maryland_districts.json';

export interface DistrictInfo {
  county: string;
  legislativeDistrict: string;
  legislativeDistrictCode: string;
  congressionalDistrict: string;
  majorCities: string[];
}

export interface LookupResult {
  success: boolean;
  district?: DistrictInfo;
  error?: string;
  confidence: 'high' | 'medium' | 'low'; // high = exact match, medium = county match, low = no match
}

/**
 * Lookup district from latitude and longitude coordinates
 * 
 * @param lat Latitude
 * @param lng Longitude
 * @returns District information or error
 */
export function lookupDistrict(lat: number, lng: number): LookupResult {
  // Validate coordinates
  if (!isValidLatLng(lat, lng)) {
    return {
      success: false,
      error: 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.',
      confidence: 'low',
    };
  }

  // Check Maryland general bounds (approximate)
  if (!isInMaryland(lat, lng)) {
    return {
      success: false,
      error: 'Coordinates appear to be outside Maryland. Please verify your address.',
      confidence: 'low',
    };
  }

  // Search for matching district
  for (const [countyKey, countyData] of Object.entries(districtData.counties)) {
    for (const district of countyData.legislativeDistricts) {
      // If district has approximate bounds, check if coordinates fall within
      if (district.approximateBounds) {
        const bounds = district.approximateBounds;
        
        if (
          lat >= bounds.south &&
          lat <= bounds.north &&
          lng >= bounds.west &&
          lng <= bounds.east
        ) {
          return {
            success: true,
            district: {
              county: countyData.name,
              legislativeDistrict: district.districtName,
              legislativeDistrictCode: district.districtCode,
              congressionalDistrict: district.congressionalDistrict,
              majorCities: district.majorCities,
            },
            confidence: 'high',
          };
        }
      }
    }
  }

  // Fallback: Check if at least in a county (for districts without precise bounds)
  const county = findCountyByProximity(lat, lng);
  if (county) {
    return {
      success: false,
      error: `Found ${county} county but could not determine legislative district. Please select manually.`,
      confidence: 'medium',
    };
  }

  return {
    success: false,
    error: 'Could not determine district from coordinates. Please select manually.',
    confidence: 'low',
  };
}

/**
 * Get all districts for a specific county
 * Useful for manual fallback selection
 */
export function getDistrictsForCounty(countyName: string): DistrictInfo[] {
  const county = districtData.counties[countyName as keyof typeof districtData.counties];
  
  if (!county) {
    return [];
  }

  return county.legislativeDistricts.map(district => ({
    county: county.name,
    legislativeDistrict: district.districtName,
    legislativeDistrictCode: district.districtCode,
    congressionalDistrict: district.congressionalDistrict,
    majorCities: district.majorCities,
  }));
}

/**
 * Get all Maryland counties (for dropdown fallback)
 */
export function getAllCounties(): string[] {
  return Object.values(districtData.counties).map(county => county.name);
}

/**
 * Get metadata about Maryland districts
 */
export function getMetadata() {
  return districtData.metadata;
}

/**
 * Validate lat/lng coordinates
 */
function isValidLatLng(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !isNaN(lat) &&
    !isNaN(lng)
  );
}

/**
 * Check if coordinates are approximately in Maryland
 * Maryland bounds: ~37.9°N to 39.7°N, ~75.0°W to 79.5°W
 */
function isInMaryland(lat: number, lng: number): boolean {
  return (
    lat >= 37.8 &&
    lat <= 39.8 &&
    lng >= -79.6 &&
    lng <= -74.9
  );
}

/**
 * Find county by proximity (fallback when exact district match fails)
 * Uses simple distance to county centers
 */
function findCountyByProximity(lat: number, lng: number): string | null {
  // Montgomery County approximate center
  const montgomeryCenterLat = 39.10;
  const montgomeryCenterLng = -77.15;
  const distance = Math.sqrt(
    Math.pow(lat - montgomeryCenterLat, 2) + Math.pow(lng - montgomeryCenterLng, 2)
  );

  // If within ~0.3 degrees (~20 miles), likely Montgomery County
  if (distance < 0.3) {
    return 'Montgomery';
  }

  // Can add more county centers here for expansion
  
  return null;
}

/**
 * Test function to verify district lookup with known coordinates
 * Example: Gaithersburg, MD (District 15)
 */
export function testLookup() {
  // Test coordinates for Gaithersburg, MD (should be District 15, MD-6)
  const gaithersburg = { lat: 39.1434, lng: -77.2014 };
  const result = lookupDistrict(gaithersburg.lat, gaithersburg.lng);
  
  console.log('Test: Gaithersburg, MD');
  console.log('Result:', result);
  
  return result;
}
