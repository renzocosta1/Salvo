/**
 * Combined ballot and Polymarket odds queries
 * Matches user's ballot races with available prediction market data
 */

import { supabase } from '../supabase';
import { fetchBallotForUser, type BallotRace } from './ballot';
import { getPolymarketOdds, type PolymarketOdds } from './polymarket';

export interface RaceWithOdds extends BallotRace {
  odds: PolymarketOdds | null;
  oddsStatus: 'available' | 'no_market' | 'loading';
}

export interface UserProfile {
  id: string;
  county: string;
  legislative_district: string;
  congressional_district: string;
}

/**
 * Fetch user's ballot races with matched Polymarket odds
 */
export async function fetchBallotWithOdds(
  profile: UserProfile
): Promise<{ data: RaceWithOdds[] | null; error: Error | null }> {
  try {
    // Fetch user's ballot races
    const { data: races, error: racesError } = await fetchBallotForUser(
      profile.county,
      profile.legislative_district
    );

    if (racesError || !races) {
      return { data: null, error: racesError };
    }

    // Fetch all available odds
    const { data: allOdds, error: oddsError } = await getPolymarketOdds();

    if (oddsError) {
      console.warn('[ballotWithOdds] Failed to fetch odds, continuing without:', oddsError);
    }

    // Match races with odds based on race type and district/county filters
    const racesWithOdds: RaceWithOdds[] = races.map((race) => {
      const matchedOdds = findMatchingOdds(race, allOdds || [], profile);
      
      return {
        ...race,
        odds: matchedOdds,
        oddsStatus: matchedOdds ? 'available' : 'no_market',
      };
    });

    return { data: racesWithOdds, error: null };
  } catch (error) {
    console.error('[fetchBallotWithOdds] Exception:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Match a ballot race with its corresponding Polymarket odds
 */
function findMatchingOdds(
  race: BallotRace,
  allOdds: PolymarketOdds[],
  profile: UserProfile
): PolymarketOdds | null {
  // Try to find odds based on race title or type matching
  // This is a heuristic approach since we don't have direct race_id linking
  
  for (const odds of allOdds) {
    // Check if titles match (case-insensitive, partial match)
    const raceTitle = race.race_title.toLowerCase();
    const oddsTitle = odds.market_title.toLowerCase();
    
    // Presidential race matching
    if (race.race_type === 'federal' && raceTitle.includes('president')) {
      if (oddsTitle.includes('president') && oddsTitle.includes('maryland')) {
        return odds;
      }
    }
    
    // Governor race matching (can be 'federal' or 'state' depending on classification)
    if (raceTitle.includes('governor')) {
      if (oddsTitle.includes('governor') && oddsTitle.includes('maryland')) {
        return odds;
      }
    }
    
    // US Senate matching (handles both "U.S. Senator" and "United States Senator")
    if (race.race_type === 'federal' && (raceTitle.includes('senator') || raceTitle.includes('senate'))) {
      if (oddsTitle.includes('senate') && oddsTitle.includes('maryland')) {
        return odds;
      }
    }
    
    // US House matching (needs district)
    if (race.race_type === 'federal' && raceTitle.includes('u.s. representative')) {
      if (oddsTitle.includes('house') || oddsTitle.includes('congress') || oddsTitle.includes('representative')) {
        // Extract district number from profile (e.g., "MD-6" -> "6")
        const districtNum = profile.congressional_district.split('-')[1];
        
        // Check various district number formats (MD-6, MD-06, District 6, etc.)
        const districtMatch = oddsTitle.includes(profile.congressional_district.toLowerCase()) ||
                             oddsTitle.includes(`md-0${districtNum}`) ||
                             oddsTitle.includes(`district ${districtNum}`) ||
                             oddsTitle.includes(`district 0${districtNum}`);
        if (districtMatch) {
          return odds;
        }
      }
    }
    
    // County Executive matching
    if (race.race_type === 'county' && raceTitle.includes('county executive')) {
      if (oddsTitle.includes('county executive') && 
          oddsTitle.includes(profile.county.toLowerCase())) {
        return odds;
      }
    }
    
    // State Senator matching (needs district)
    if (race.race_type === 'state' && raceTitle.includes('state senator')) {
      if (oddsTitle.includes('state senator') || oddsTitle.includes('senate district')) {
        const districtMatch = oddsTitle.includes(`district ${profile.legislative_district}`);
        if (districtMatch) {
          return odds;
        }
      }
    }
  }
  
  return null;
}

/**
 * Get only races that have Polymarket odds (for War Room display)
 */
export async function fetchRacesWithAvailableOdds(
  profile: UserProfile
): Promise<{ data: RaceWithOdds[] | null; error: Error | null }> {
  const result = await fetchBallotWithOdds(profile);
  
  if (result.error || !result.data) {
    return result;
  }
  
  // Filter to only races with odds
  const racesWithOdds = result.data.filter((race) => race.odds !== null);
  
  return { data: racesWithOdds, error: null };
}

/**
 * Get the top candidate (highest odds) for a race
 */
export function getTopCandidate(odds: PolymarketOdds): {
  name: string;
  probability: number;
  index: number;
} | null {
  if (!odds.outcomes || odds.outcomes.length === 0) {
    return null;
  }
  
  const maxIndex = odds.prices.reduce(
    (maxIdx, price, idx, arr) => (price > arr[maxIdx] ? idx : maxIdx),
    0
  );
  
  return {
    name: odds.outcomes[maxIndex],
    probability: odds.prices[maxIndex],
    index: maxIndex,
  };
}

/**
 * Check if odds show a competitive race (within 10 percentage points)
 */
export function isCompetitiveRace(odds: PolymarketOdds): boolean {
  if (odds.prices.length < 2) return false;
  
  const sortedPrices = [...odds.prices].sort((a, b) => b - a);
  const firstPlace = sortedPrices[0];
  const secondPlace = sortedPrices[1];
  
  return Math.abs(firstPlace - secondPlace) < 0.10;
}

/**
 * Get color coding for odds display
 */
export function getOddsColorCode(probability: number): 'winning' | 'competitive' | 'losing' {
  if (probability >= 0.60) return 'winning'; // >60% = winning
  if (probability >= 0.40) return 'competitive'; // 40-60% = competitive
  return 'losing'; // <40% = losing
}
