/**
 * Maryland District Lookup Utility
 * 
 * PRIMARY: Uses Google Civic Information API for authoritative district data
 * FALLBACK: Simple bounding box matching for offline/testing scenarios
 * 
 * For production voter applications, always use the Google Civic API for accuracy.
 */

import districtData from './maryland_districts.json';
import { lookupDistrictByCivicApi, type CivicDistrictInfo } from './googleCivicApi';

export interface DistrictInfo {
  county: string;
  legislativeDistrict: string;
  legislativeDistrictCode: string;
  congressionalDistrict: string;
  majorCities?: string[];
}

export interface LookupResult {
  success: boolean;
  district?: DistrictInfo;
  error?: string;
  confidence: 'high' | 'medium' | 'low'; // high = exact match, medium = county match, low = no match
  source?: 'google-civic-api' | 'bounding-box' | 'fallback';
}

/**
 * Lookup district information by address using Google Civic Information API
 * This is the PRIMARY and RECOMMENDED method for production use.
 * 
 * @param address Full address string (e.g., "8620 Jacks Reef Rd, Laurel, MD 20724")
 * @param apiKey Google API Key (optional - reads from env if not provided)
 * @returns Authoritative district information from official government data
 */
export async function lookupDistrictByAddress(
  address: string,
  apiKey?: string
): Promise<LookupResult> {
  // Get API key from parameter or environment
  const key = apiKey || process.env.GOOGLE_CIVIC_API_KEY || process.env.EXPO_PUBLIC_GOOGLE_CIVIC_API_KEY;

  if (!key) {
    return {
      success: false,
      error: 'Google Civic API key not configured. Set GOOGLE_CIVIC_API_KEY or EXPO_PUBLIC_GOOGLE_CIVIC_API_KEY in environment.',
      confidence: 'low',
      source: 'google-civic-api',
    };
  }

  try {
    const result = await lookupDistrictByCivicApi(address, key);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Failed to lookup district information',
        confidence: 'low',
        source: 'google-civic-api',
      };
    }

    // Transform Google Civic API data to our DistrictInfo format
    const civicData = result.data;
    
    // Use State Legislative Lower (House/Delegates) if available, otherwise Upper (Senate)
    const legDistrict = civicData.stateLegislativeDistrictLower || civicData.stateLegislativeDistrictUpper || 'Unknown';
    
    return {
      success: true,
      district: {
        county: civicData.county || 'Unknown',
        legislativeDistrict: legDistrict,
        legislativeDistrictCode: legDistrict, // Same value for Maryland
        congressionalDistrict: civicData.congressionalDistrict || 'Unknown',
        majorCities: [],
      },
      confidence: 'high',
      source: 'google-civic-api',
    };

  } catch (error) {
    console.error('District lookup error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      confidence: 'low',
      source: 'google-civic-api',
    };
  }
}

/**
 * LEGACY: Lookup district from latitude and longitude coordinates
 * 
 * ⚠️  WARNING: This uses approximate bounding boxes and is NOT accurate for voting applications.
 * ⚠️  Use lookupDistrictByAddress() with Google Civic API instead for production.
 * 
 * @param lat Latitude
 * @param lng Longitude
 * @returns District information or error (LOW ACCURACY)
 * @deprecated Use lookupDistrictByAddress() for accurate voter data
 */
export function lookupDistrict(lat: number, lng: number): LookupResult {
  // Validate coordinates
  if (!isValidLatLng(lat, lng)) {
    return {
      success: false,
      error: 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180.',
      confidence: 'low',
      source: 'bounding-box',
    };
  }

  // Check Maryland general bounds (approximate)
  if (!isInMaryland(lat, lng)) {
    return {
      success: false,
      error: 'Coordinates appear to be outside Maryland. Please verify your address.',
      confidence: 'low',
      source: 'bounding-box',
    };
  }

  // Search for matching district
  for (const [countyKey, countyData] of Object.entries(districtData.counties)) {
    for (const district of countyData.legislativeDistricts) {
      // If district has approximate bounds, check if coordinates fall within
      if ('approximateBounds' in district && district.approximateBounds) {
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
            confidence: 'medium', // Downgraded from 'high' because bounding boxes are imprecise
            source: 'bounding-box',
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
      error: `Found ${county} county but could not determine legislative district. Use lookupDistrictByAddress() for accurate data.`,
      confidence: 'low',
      source: 'fallback',
    };
  }

  return {
    success: false,
    error: 'Could not determine district from coordinates. Use lookupDistrictByAddress() for accurate data.',
    confidence: 'low',
    source: 'bounding-box',
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
