/**
 * Maryland District Lookup
 * 
 * PRIMARY: Google Civic Information API for authoritative voter data
 * FALLBACK: Bounding box coordinates (low accuracy, testing only)
 */

// ⭐ PRIMARY EXPORTS - Use these for production voter applications
export {
  lookupDistrictByAddress,     // Use this with full address string
} from './districtLookup';

export {
  lookupDistrictByCivicApi,    // Direct Google Civic API access
  getVoterInfo,                 // Get polling locations during elections
} from './googleCivicApi';

export type { 
  DistrictInfo, 
  LookupResult 
} from './districtLookup';

export type { 
  CivicDistrictInfo, 
  CivicApiResult 
} from './googleCivicApi';

// ⚠️  LEGACY/FALLBACK EXPORTS - Deprecated for voter applications
export {
  lookupDistrict,               // Coordinate-based (low accuracy)
  getDistrictsForCounty,
  getAllCounties,
  getMetadata,
  testLookup,
} from './districtLookup';
