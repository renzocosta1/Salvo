/**
 * Ballot operations - fetch races and candidates for user's district
 */

import { supabase } from '../supabase';

export interface BallotRace {
  id: string;
  ballot_id: string;
  race_title: string;
  race_type: 'federal' | 'state' | 'county' | 'local' | 'judicial' | 'ballot_question';
  position_order: number;
  candidates: BallotCandidate[];
}

export interface BallotCandidate {
  id: string;
  race_id: string;
  candidate_name: string;
  candidate_party: string;
  hard_party_endorsed: boolean;
  candidate_order: number;
}

export interface UserBallotCommitment {
  id: string;
  user_id: string;
  race_id: string;
  candidate_id: string;
  committed_at: string;
}

/**
 * Fetch ballot data for user's district
 */
export async function fetchBallotForUser(
  county: string,
  legislative_district: string
): Promise<{ data: BallotRace[] | null; error: Error | null }> {
  try {
    console.log('[fetchBallotForUser] Fetching ballot for:', { county, legislative_district });

    // 1. Get the ballot ID for this user's district
    const { data: ballotData, error: ballotError } = await supabase
      .from('md_ballots')
      .select('id')
      .eq('county', county)
      .eq('legislative_district', legislative_district)
      .single();

    if (ballotError) {
      console.error('[fetchBallotForUser] Error fetching ballot:', ballotError);
      return { data: null, error: new Error('Ballot not found for your district') };
    }

    if (!ballotData) {
      console.log('[fetchBallotForUser] No ballot found for district');
      return { data: [], error: null };
    }

    // 2. Get all races for this ballot with candidates
    const { data: racesData, error: racesError } = await supabase
      .from('md_ballot_races')
      .select(`
        id,
        ballot_id,
        race_title,
        race_type,
        position_order,
        md_ballot_candidates (
          id,
          race_id,
          candidate_name,
          candidate_party,
          hard_party_endorsed,
          candidate_order
        )
      `)
      .eq('ballot_id', ballotData.id)
      .order('position_order', { ascending: true });

    if (racesError) {
      console.error('[fetchBallotForUser] Error fetching races:', racesError);
      return { data: null, error: new Error('Failed to load ballot races') };
    }

    // Transform data
    const races: BallotRace[] = (racesData || []).map((race: any) => ({
      id: race.id,
      ballot_id: race.ballot_id,
      race_title: race.race_title,
      race_type: race.race_type,
      position_order: race.position_order,
      candidates: (race.md_ballot_candidates || [])
        .sort((a: any, b: any) => a.candidate_order - b.candidate_order)
        .map((candidate: any) => ({
          id: candidate.id,
          race_id: candidate.race_id,
          candidate_name: candidate.candidate_name,
          candidate_party: candidate.candidate_party,
          hard_party_endorsed: candidate.hard_party_endorsed,
          candidate_order: candidate.candidate_order,
        })),
    }));

    console.log('[fetchBallotForUser] Fetched', races.length, 'races');
    return { data: races, error: null };
  } catch (err) {
    console.error('[fetchBallotForUser] Unexpected error:', err);
    return { data: null, error: err as Error };
  }
}

/**
 * Fetch user's ballot commitments
 */
export async function fetchUserCommitments(
  userId: string
): Promise<{ data: UserBallotCommitment[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('user_ballot_commitments')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('[fetchUserCommitments] Error:', error);
      return { data: null, error };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('[fetchUserCommitments] Unexpected error:', err);
    return { data: null, error: err as Error };
  }
}

/**
 * Commit to vote for a candidate
 */
export async function commitToCandidate(
  userId: string,
  raceId: string,
  candidateId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('user_ballot_commitments')
      .upsert(
        {
          user_id: userId,
          race_id: raceId,
          candidate_id: candidateId,
        },
        {
          onConflict: 'user_id,race_id',
        }
      );

    if (error) {
      console.error('[commitToCandidate] Error:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('[commitToCandidate] Unexpected error:', err);
    return { success: false, error: err as Error };
  }
}

/**
 * Remove commitment for a race
 */
export async function removeCommitment(
  userId: string,
  raceId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('user_ballot_commitments')
      .delete()
      .eq('user_id', userId)
      .eq('race_id', raceId);

    if (error) {
      console.error('[removeCommitment] Error:', error);
      return { success: false, error };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('[removeCommitment] Unexpected error:', err);
    return { success: false, error: err as Error };
  }
}
