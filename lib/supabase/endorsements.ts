/**
 * Endorsement management for leaders
 * Handles candidate endorsement updates and impact tracking
 */

import { supabase } from '../supabase';
import { BallotRace, BallotCandidate } from './ballot';

export interface EndorsementChange {
  candidateId: string;
  candidateName: string;
  raceId: string;
  raceTitle: string;
  endorsed: boolean;
}

export interface EndorsementAuditLog {
  id: string;
  changed_by_user_id: string;
  candidate_id: string;
  race_id: string;
  previous_endorsed: boolean;
  new_endorsed: boolean;
  affected_geography: string;
  estimated_users_affected: number;
  change_notes?: string;
  created_at: string;
}

/**
 * Update a candidate's endorsement status
 */
export async function updateEndorsement(
  candidateId: string,
  endorsed: boolean,
  leaderId: string,
  affectedGeography: string,
  estimatedUsersAffected: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Get current endorsement status
    const { data: candidate, error: fetchError } = await supabase
      .from('md_ballot_candidates')
      .select('hard_party_endorsed, race_id, candidate_name')
      .eq('id', candidateId)
      .single();

    if (fetchError || !candidate) {
      return { success: false, error: 'Candidate not found' };
    }

    const previousEndorsed = candidate.hard_party_endorsed;

    // 2. Update endorsement
    const { error: updateError } = await supabase
      .from('md_ballot_candidates')
      .update({ hard_party_endorsed: endorsed })
      .eq('id', candidateId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // 3. Log the change in audit table
    const { error: auditError } = await supabase
      .from('endorsement_audit_log')
      .insert({
        changed_by_user_id: leaderId,
        candidate_id: candidateId,
        race_id: candidate.race_id,
        previous_endorsed: previousEndorsed,
        new_endorsed: endorsed,
        affected_geography: affectedGeography,
        estimated_users_affected: estimatedUsersAffected,
      });

    if (auditError) {
      console.warn('Failed to log endorsement change:', auditError);
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating endorsement:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * For single-select races, un-endorse all other candidates when endorsing one
 */
export async function setExclusiveEndorsement(
  raceId: string,
  candidateId: string,
  leaderId: string,
  affectedGeography: string,
  estimatedUsersAffected: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Un-endorse all candidates in this race
    const { error: clearError } = await supabase
      .from('md_ballot_candidates')
      .update({ hard_party_endorsed: false })
      .eq('race_id', raceId);

    if (clearError) {
      return { success: false, error: clearError.message };
    }

    // 2. Endorse the selected candidate
    return await updateEndorsement(
      candidateId,
      true,
      leaderId,
      affectedGeography,
      estimatedUsersAffected
    );
  } catch (error) {
    console.error('Error setting exclusive endorsement:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get count of users affected by an endorsement change
 * Based on race geography (statewide, county, district)
 */
export async function getAffectedUserCount(
  race: BallotRace,
  county: string,
  legislativeDistrict: string,
  congressionalDistrict: string
): Promise<{ count: number; geography: string }> {
  try {
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    let geography = '';

    // Filter based on race type
    if (race.race_type === 'federal') {
      // Federal races: filter by congressional district
      if (race.race_title.toLowerCase().includes('representative')) {
        query = query.eq('congressional_district', congressionalDistrict);
        geography = congressionalDistrict;
      } else if (race.race_title.toLowerCase().includes('governor')) {
        // Governor is statewide
        geography = 'Maryland (Statewide)';
      }
    } else if (race.race_type === 'state') {
      if (race.race_title.toLowerCase().includes('governor')) {
        // Governor is statewide
        geography = 'Maryland (Statewide)';
      } else {
        // State Senator, House of Delegates: filter by legislative district
        query = query
          .eq('county', county)
          .eq('legislative_district', legislativeDistrict);
        geography = `${county} County, District ${legislativeDistrict}`;
      }
    } else if (race.race_type === 'county') {
      // County races: filter by county only
      query = query.eq('county', county);
      geography = `${county} County`;
    } else if (race.race_type === 'local' || race.race_type === 'judicial' || race.race_type === 'ballot_question') {
      // Local/judicial/ballot questions: filter by county and district
      query = query
        .eq('county', county)
        .eq('legislative_district', legislativeDistrict);
      geography = `${county} County, District ${legislativeDistrict}`;
    }

    const { count, error } = await query;

    if (error) {
      console.error('Error counting affected users:', error);
      return { count: 0, geography };
    }

    return { count: count || 0, geography };
  } catch (error) {
    console.error('Error in getAffectedUserCount:', error);
    return { count: 0, geography: 'Unknown' };
  }
}

/**
 * Fetch races for a specific geography (for admin UI)
 */
export async function fetchRacesForGeography(
  county: string,
  legislativeDistrict: string
): Promise<{ data: BallotRace[] | null; error: Error | null }> {
  try {
    // Get ballot ID
    const { data: ballot, error: ballotError } = await supabase
      .from('md_ballots')
      .select('id')
      .eq('county', county)
      .eq('legislative_district', legislativeDistrict)
      .single();

    if (ballotError || !ballot) {
      return { data: null, error: new Error('No ballot found for this geography') };
    }

    // Get races with candidates
    const { data: races, error: racesError } = await supabase
      .from('md_ballot_races')
      .select(`
        id,
        ballot_id,
        race_title,
        race_type,
        position_order,
        incumbent_name,
        max_selections,
        md_ballot_candidates (
          id,
          race_id,
          candidate_name,
          candidate_party,
          hard_party_endorsed,
          candidate_order,
          is_placeholder
        )
      `)
      .eq('ballot_id', ballot.id)
      .order('position_order', { ascending: true });

    if (racesError) {
      return { data: null, error: new Error(racesError.message) };
    }

    // Transform to BallotRace format
    const transformedRaces: BallotRace[] = races.map((race: any) => ({
      id: race.id,
      ballot_id: race.ballot_id,
      race_title: race.race_title,
      race_type: race.race_type,
      position_order: race.position_order,
      incumbent_name: race.incumbent_name,
      max_selections: race.max_selections,
      candidates: (race.md_ballot_candidates || []).sort(
        (a: any, b: any) => a.candidate_order - b.candidate_order
      ),
    }));

    return { data: transformedRaces, error: null };
  } catch (error) {
    console.error('Error fetching races for geography:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get recent endorsement changes (for undo feature)
 */
export async function getRecentEndorsementChanges(
  leaderId: string,
  limit: number = 10
): Promise<{ data: EndorsementAuditLog[] | null; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('endorsement_audit_log')
      .select('*')
      .eq('changed_by_user_id', leaderId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as EndorsementAuditLog[], error: undefined };
  } catch (error) {
    console.error('Error fetching recent changes:', error);
    return { data: null, error: String(error) };
  }
}

export interface PendingEndorsement {
  candidateId: string;
  endorsed: boolean;
  candidateName: string;
  raceTitle: string;
}

/**
 * Batch update multiple endorsements in a single transaction
 * This is more efficient than updating one-by-one
 */
export async function batchUpdateEndorsements(
  changes: PendingEndorsement[],
  races: BallotRace[],
  leaderId: string,
  affectedGeography: string,
  estimatedUsersAffected: number
): Promise<{ success: boolean; error?: string }> {
  try {
    if (changes.length === 0) {
      return { success: true };
    }

    console.log(`[batchUpdateEndorsements] Processing ${changes.length} changes...`);

    // Group changes by race for single-select handling
    const changesByRace = new Map<string, PendingEndorsement[]>();
    for (const change of changes) {
      const race = races.find((r) =>
        r.candidates.some((c) => c.id === change.candidateId)
      );
      if (race) {
        if (!changesByRace.has(race.id)) {
          changesByRace.set(race.id, []);
        }
        changesByRace.get(race.id)!.push(change);
      }
    }

    // Process each race
    for (const [raceId, raceChanges] of changesByRace.entries()) {
      const race = races.find((r) => r.id === raceId);
      if (!race) continue;

      const isSingleSelect = (race.max_selections || 1) === 1;

      if (isSingleSelect) {
        // For single-select races, first clear all endorsements
        const endorsedChange = raceChanges.find((c) => c.endorsed);
        if (endorsedChange) {
          // Clear all endorsements in this race first
          const { error: clearError } = await supabase
            .from('md_ballot_candidates')
            .update({ hard_party_endorsed: false })
            .eq('race_id', raceId);

          if (clearError) {
            console.error(`Failed to clear race ${raceId}:`, clearError);
            return { success: false, error: clearError.message };
          }

          // Then set the one endorsement
          const { error: updateError } = await supabase
            .from('md_ballot_candidates')
            .update({ hard_party_endorsed: true })
            .eq('id', endorsedChange.candidateId);

          if (updateError) {
            console.error(`Failed to endorse candidate ${endorsedChange.candidateId}:`, updateError);
            return { success: false, error: updateError.message };
          }

          // Log the change
          await supabase.from('endorsement_audit_log').insert({
            changed_by_user_id: leaderId,
            candidate_id: endorsedChange.candidateId,
            race_id: raceId,
            previous_endorsed: false,
            new_endorsed: true,
            affected_geography: affectedGeography,
            estimated_users_affected: estimatedUsersAffected,
            change_notes: `Batch update (single-select race)`,
          });
        } else {
          // No endorsement - clear all
          await supabase
            .from('md_ballot_candidates')
            .update({ hard_party_endorsed: false })
            .eq('race_id', raceId);
        }
      } else {
        // For multi-select races, update each candidate individually
        for (const change of raceChanges) {
          const { error: updateError } = await supabase
            .from('md_ballot_candidates')
            .update({ hard_party_endorsed: change.endorsed })
            .eq('id', change.candidateId);

          if (updateError) {
            console.error(`Failed to update candidate ${change.candidateId}:`, updateError);
            return { success: false, error: updateError.message };
          }

          // Log the change
          await supabase.from('endorsement_audit_log').insert({
            changed_by_user_id: leaderId,
            candidate_id: change.candidateId,
            race_id: raceId,
            previous_endorsed: !change.endorsed,
            new_endorsed: change.endorsed,
            affected_geography: affectedGeography,
            estimated_users_affected: estimatedUsersAffected,
            change_notes: `Batch update (multi-select race)`,
          });
        }
      }
    }

    console.log(`[batchUpdateEndorsements] Successfully processed all changes`);
    return { success: true };
  } catch (error) {
    console.error('[batchUpdateEndorsements] Error:', error);
    return { success: false, error: String(error) };
  }
}
