/**
 * Command Center Operations for Generals and Captains
 */

import { supabase } from '../supabase';

/**
 * Create a new directive (General only)
 */
export async function createDirective(
  partyId: string,
  authorId: string,
  title: string,
  body: string | null,
  targetGoal: number
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const { data, error } = await supabase
      .from('directives')
      .insert({
        party_id: partyId,
        author_id: authorId,
        title,
        body,
        target_goal: targetGoal,
      })
      .select()
      .single();

    if (error) {
      console.error('[createDirective] Error:', error);
      return { success: false, error: error.message };
    }

    console.log('[createDirective] Directive created:', data);
    return { success: true, data };
  } catch (err) {
    console.error('[createDirective] Unexpected error:', err);
    return { success: false, error: 'Failed to create directive' };
  }
}

/**
 * Create a new warrior band (Captain only)
 */
export async function createWarriorBand(
  partyId: string,
  name: string,
  captainId: string
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const { data, error } = await supabase
      .from('warrior_bands')
      .insert({
        party_id: partyId,
        name,
        captain_id: captainId,
      })
      .select()
      .single();

    if (error) {
      console.error('[createWarriorBand] Error:', error);
      return { success: false, error: error.message };
    }

    console.log('[createWarriorBand] Band created:', data);
    return { success: true, data };
  } catch (err) {
    console.error('[createWarriorBand] Unexpected error:', err);
    return { success: false, error: 'Failed to create warrior band' };
  }
}

/**
 * Get all warrior bands for a party
 */
export async function getWarriorBands(
  partyId: string
): Promise<{ success: boolean; error?: string; data?: any[] }> {
  try {
    const { data, error } = await supabase
      .from('warrior_bands')
      .select(`
        id,
        name,
        created_at,
        captain:captain_id (
          id,
          display_name
        )
      `)
      .eq('party_id', partyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getWarriorBands] Error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    console.error('[getWarriorBands] Unexpected error:', err);
    return { success: false, error: 'Failed to fetch warrior bands' };
  }
}

/**
 * Assign a user to a warrior band (Captain only)
 */
export async function assignUserToBand(
  userId: string,
  bandId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ warrior_band_id: bandId })
      .eq('id', userId);

    if (error) {
      console.error('[assignUserToBand] Error:', error);
      return { success: false, error: error.message };
    }

    console.log('[assignUserToBand] User assigned to band');
    return { success: true };
  } catch (err) {
    console.error('[assignUserToBand] Unexpected error:', err);
    return { success: false, error: 'Failed to assign user to band' };
  }
}

/**
 * Scope a directive to specific warrior bands (General only)
 */
export async function scopeDirectiveToBands(
  directiveId: string,
  bandIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Insert directive_bands rows
    const rows = bandIds.map((bandId) => ({
      directive_id: directiveId,
      warrior_band_id: bandId,
    }));

    const { error } = await supabase
      .from('directive_bands')
      .insert(rows);

    if (error) {
      console.error('[scopeDirectiveToBands] Error:', error);
      return { success: false, error: error.message };
    }

    console.log('[scopeDirectiveToBands] Directive scoped to bands:', bandIds);
    return { success: true };
  } catch (err) {
    console.error('[scopeDirectiveToBands] Unexpected error:', err);
    return { success: false, error: 'Failed to scope directive to bands' };
  }
}
