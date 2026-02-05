/**
 * Google Civic Information API Integration
 * 
 * Provides authoritative voter district information from official government data.
 * API Docs: https://developers.google.com/civic-information/docs/v2
 */

export interface CivicDistrictInfo {
  // Address normalization
  normalizedAddress: string;
  
  // Location info
  county?: string;
  
  // Districts
  congressionalDistrict?: string;
  stateLegislativeDistrictUpper?: string; // State Senate
  stateLegislativeDistrictLower?: string; // State House/Delegates
  
  // Additional useful data
  pollingLocation?: {
    address: string;
    pollingHours?: string;
  };
  
  // Representatives (optional, for future use)
  representatives?: Array<{
    name: string;
    office: string;
    party?: string;
    phones?: string[];
    urls?: string[];
  }>;
}

export interface CivicApiResult {
  success: boolean;
  data?: CivicDistrictInfo;
  error?: string;
  confidence: 'high' | 'low';
  source: 'google-civic-api';
}

/**
 * Lookup voter district information using Google Civic Information API
 * 
 * @param address Full address string (e.g., "8620 Jacks Reef Rd, Laurel, MD 20724")
 * @param apiKey Google API Key with Civic Information API enabled
 * @returns District information from official government data
 */
export async function lookupDistrictByCivicApi(
  address: string,
  apiKey: string
): Promise<CivicApiResult> {
  try {
    // Input validation
    if (!address || address.trim().length === 0) {
      return {
        success: false,
        error: 'Address is required',
        confidence: 'low',
        source: 'google-civic-api',
      };
    }

    if (!apiKey || apiKey.trim().length === 0) {
      return {
        success: false,
        error: 'Google API Key is required. Set GOOGLE_CIVIC_API_KEY in environment.',
        confidence: 'low',
        source: 'google-civic-api',
      };
    }

    // Call Google Civic Information API - Divisions endpoint
    const encodedAddress = encodeURIComponent(address);
    const url = `https://civicinfo.googleapis.com/civicinfo/v2/divisionsByAddress?key=${apiKey}&address=${encodedAddress}`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 400) {
        return {
          success: false,
          error: 'Invalid address. Please verify the address is correct and complete.',
          confidence: 'low',
          source: 'google-civic-api',
        };
      }

      if (response.status === 403) {
        return {
          success: false,
          error: 'API key invalid or Civic Information API not enabled. Check Google Cloud Console.',
          confidence: 'low',
          source: 'google-civic-api',
        };
      }

      return {
        success: false,
        error: `Google Civic API error: ${response.status} ${response.statusText}`,
        confidence: 'low',
        source: 'google-civic-api',
      };
    }

    const data = await response.json();

    // Extract district information from the response
    const districtInfo = extractDistrictInfo(data);

    if (!districtInfo.congressionalDistrict && !districtInfo.county) {
      return {
        success: false,
        error: 'No district information found for this address',
        confidence: 'low',
        source: 'google-civic-api',
      };
    }

    return {
      success: true,
      data: districtInfo,
      confidence: 'high',
      source: 'google-civic-api',
    };

  } catch (error) {
    console.error('Google Civic API lookup error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      confidence: 'low',
      source: 'google-civic-api',
    };
  }
}

/**
 * Extract and normalize district information from Google Civic API response
 */
function extractDistrictInfo(apiResponse: any): CivicDistrictInfo {
  // Build normalized address from components
  const normalized = apiResponse.normalizedInput || {};
  const addressParts = [
    normalized.line1,
    normalized.city,
    normalized.state,
    normalized.zip
  ].filter(Boolean);
  
  const info: CivicDistrictInfo = {
    normalizedAddress: addressParts.join(', '),
  };

  // Extract divisions (this is where district info lives)
  const divisions = apiResponse.divisions || {};

  for (const [divisionId, divisionData] of Object.entries(divisions)) {
    const data = divisionData as any;
    
    // Congressional District (e.g., "ocd-division/country:us/state:md/cd:5")
    if (divisionId.includes('/cd:')) {
      const cdMatch = divisionId.match(/\/cd:(\d+)/);
      if (cdMatch) {
        const state = extractStateFromDivision(divisionId);
        info.congressionalDistrict = `${state}-${cdMatch[1]}`;
      }
    }

    // State Legislative Upper (State Senate) - e.g., "sldu:32"
    if (divisionId.includes('/sldu:')) {
      const slduMatch = divisionId.match(/\/sldu:(\d+)/);
      if (slduMatch) {
        info.stateLegislativeDistrictUpper = `District ${slduMatch[1]}`;
      }
    }

    // State Legislative Lower (House/Delegates) - e.g., "sldl:32"
    if (divisionId.includes('/sldl:')) {
      const sldlMatch = divisionId.match(/\/sldl:(\d+)/);
      if (sldlMatch) {
        info.stateLegislativeDistrictLower = `District ${sldlMatch[1]}`;
      }
    }

    // County (e.g., "ocd-division/country:us/state:md/county:anne_arundel")
    if (divisionId.includes('/county:')) {
      // Use the name from the data if available
      if (data.name && data.name.toLowerCase().includes('county')) {
        info.county = data.name.replace(' County', '');
      } else {
        // Fallback to parsing from ID
        const countyMatch = divisionId.match(/\/county:([^/]+)/);
        if (countyMatch) {
          const countyName = countyMatch[1]
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          info.county = countyName;
        }
      }
    }
  }

  return info;
}

/**
 * Extract state abbreviation from division ID
 */
function extractStateFromDivision(divisionId: string): string {
  const stateMatch = divisionId.match(/\/state:([a-z]{2})/);
  return stateMatch ? stateMatch[1].toUpperCase() : '';
}

/**
 * Extract representative information (for future use)
 */
function extractRepresentatives(apiResponse: any): Array<{
  name: string;
  office: string;
  party?: string;
  phones?: string[];
  urls?: string[];
}> {
  const representatives: Array<any> = [];
  const offices = apiResponse.offices || [];
  const officials = apiResponse.officials || [];

  for (const office of offices) {
    const officialIndices = office.officialIndices || [];
    
    for (const index of officialIndices) {
      const official = officials[index];
      if (official) {
        representatives.push({
          name: official.name,
          office: office.name,
          party: official.party,
          phones: official.phones,
          urls: official.urls,
        });
      }
    }
  }

  return representatives;
}

/**
 * Get voter information endpoint (includes polling location for elections)
 * This is separate from representatives endpoint and requires election context
 * 
 * @param address Voter address
 * @param apiKey Google API Key
 * @param electionId Optional election ID (defaults to upcoming election)
 */
export async function getVoterInfo(
  address: string,
  apiKey: string,
  electionId?: string
): Promise<{
  success: boolean;
  data?: {
    pollingLocation?: {
      address: string;
      pollingHours?: string;
    };
    election?: {
      name: string;
      electionDay: string;
    };
  };
  error?: string;
}> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const electionParam = electionId ? `&electionId=${electionId}` : '';
    const url = `https://www.googleapis.com/civicinfo/v2/voterinfo?address=${encodedAddress}&key=${apiKey}${electionParam}`;

    const response = await fetch(url);

    if (!response.ok) {
      // No active election is common and not an error
      if (response.status === 400) {
        return {
          success: false,
          error: 'No active election or invalid address',
        };
      }
      return {
        success: false,
        error: `API error: ${response.status}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      data: {
        pollingLocation: data.pollingLocations?.[0] ? {
          address: formatAddress(data.pollingLocations[0].address),
          pollingHours: data.pollingLocations[0].pollingHours,
        } : undefined,
        election: data.election ? {
          name: data.election.name,
          electionDay: data.election.electionDay,
        } : undefined,
      },
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Format address object to string
 */
function formatAddress(addr: any): string {
  const parts = [
    addr.line1,
    addr.line2,
    addr.line3,
    addr.city,
    `${addr.state} ${addr.zip}`,
  ].filter(Boolean);
  
  return parts.join(', ');
}
