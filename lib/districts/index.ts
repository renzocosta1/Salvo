/**
 * Maryland District Lookup
 * 
 * Utilities for mapping coordinates to Maryland legislative and congressional districts
 */

export {
  lookupDistrict,
  getDistrictsForCounty,
  getAllCounties,
  getMetadata,
  testLookup,
} from './districtLookup';

export type { DistrictInfo, LookupResult } from './districtLookup';
