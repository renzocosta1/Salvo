import { supabase } from '../supabase';
import type { DirectiveWithProgress, Profile } from './types';
import { Platform } from 'react-native';

/**
 * Fetch directives for the current user's party and warrior band
 * Includes real-time salvo counts and completion status
 */
export async function fetchDirectivesForUser(
  profile: Profile
): Promise<{ data: DirectiveWithProgress[] | null; error: Error | null }> {
  try {
    if (!profile.party_id) {
      return { data: [], error: null };
    }

    // Build the query
    // Fetch directives that:
    // 1. Match user's party_id
    // 2. Either have no directive_bands entries (party-wide)
    //    OR have a directive_bands entry matching user's warrior_band_id
    
    const { data: directives, error: directivesError } = await supabase
      .from('directives')
      .select(`
        id,
        party_id,
        author_id,
        title,
        body,
        target_goal,
        mission_type,
        mission_deadline,
        requires_gps,
        created_at
      `)
      .eq('party_id', profile.party_id)
      .order('created_at', { ascending: false });

    if (directivesError) {
      console.error('Error fetching directives:', directivesError);
      return { data: null, error: new Error(directivesError.message) };
    }

    if (!directives || directives.length === 0) {
      return { data: [], error: null };
    }

    // Filter directives based on directive_bands
    // If the directive has no bands, it's party-wide
    // If it has bands, check if user's warrior_band_id is included
    const directiveIds = directives.map(d => d.id);

    const { data: directiveBands, error: bandsError } = await supabase
      .from('directive_bands')
      .select('directive_id, warrior_band_id')
      .in('directive_id', directiveIds);

    if (bandsError) {
      console.error('Error fetching directive bands:', bandsError);
      // Continue without band filtering if there's an error
    }

    // Create a map of directive_id to warrior_band_ids
    const bandMap = new Map<string, string[]>();
    directiveBands?.forEach(db => {
      const existing = bandMap.get(db.directive_id) || [];
      bandMap.set(db.directive_id, [...existing, db.warrior_band_id]);
    });

    // Filter directives based on bands
    const visibleDirectives = directives.filter(directive => {
      const bands = bandMap.get(directive.id);
      
      // No bands = party-wide directive
      if (!bands || bands.length === 0) {
        return true;
      }
      
      // Has bands = check if user's band is included
      if (profile.warrior_band_id && bands.includes(profile.warrior_band_id)) {
        return true;
      }
      
      return false;
    });

    // Fetch salvo counts for each visible directive
    const { data: salvoCounts, error: salvosError } = await supabase
      .from('salvos')
      .select('directive_id')
      .in('directive_id', visibleDirectives.map(d => d.id));

    if (salvosError) {
      console.error('Error fetching salvos:', salvosError);
    }

    // Count salvos per directive
    const salvoCountMap = new Map<string, number>();
    salvoCounts?.forEach(salvo => {
      const current = salvoCountMap.get(salvo.directive_id) || 0;
      salvoCountMap.set(salvo.directive_id, current + 1);
    });

    // Combine data
    const directivesWithProgress: DirectiveWithProgress[] = visibleDirectives.map(directive => {
      const currentSalvos = salvoCountMap.get(directive.id) || 0;
      const isCompleted = currentSalvos >= directive.target_goal;
      const isPartyWide = !bandMap.has(directive.id) || bandMap.get(directive.id)!.length === 0;

      return {
        ...directive,
        current_salvos: currentSalvos,
        is_completed: isCompleted,
        is_party_wide: isPartyWide,
      };
    });

    return { data: directivesWithProgress, error: null };
  } catch (error) {
    console.error('Unexpected error in fetchDirectivesForUser:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Subscribe to real-time salvo updates for a list of directive IDs
 */
export function subscribeToSalvos(
  directiveIds: string[],
  onUpdate: (payload: any) => void
) {
  if (directiveIds.length === 0) {
    return null;
  }

  // Create a unique channel name based on the directive IDs
  const channelName = `salvos-${directiveIds.join('-')}`;
  
  console.log(`[REALTIME] Creating channel: ${channelName} for directives:`, directiveIds);

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'salvos',
        filter: `directive_id=in.(${directiveIds.join(',')})`,
      },
      (payload) => {
        console.log(`[REALTIME] Channel ${channelName} received salvo:`, payload);
        onUpdate(payload);
      }
    )
    .subscribe((status) => {
      console.log(`[REALTIME] Channel ${channelName} subscription status:`, status);
    });

  return channel;
}

/**
 * Insert a salvo (raid action) for a directive
 * Rate limited by RLS policy: 10 salvos per 60 seconds per user per directive
 * Supports offline queueing
 */
export async function insertSalvo(
  userId: string,
  directiveId: string
): Promise<{ success: boolean; error: Error | null; queued?: boolean }> {
  try {
    // On native: use offline-aware submit function
    // On web: direct Supabase insert (no offline queue)
    if (Platform.OS !== 'web') {
      // Dynamic import to avoid bundling SQLite for web
      const { submitSalvo } = await import('../offline/actions');
      const result = await submitSalvo({
        user_id: userId,
        directive_id: directiveId,
      });

      if (!result.success) {
        // Check if it looks like a rate limit error from the error message
        if (result.error?.includes('rate limit') || result.error?.includes('42501')) {
          console.warn('[RAID] Rate limit exceeded');
          return { 
            success: false, 
            error: new Error('Rate limit exceeded. You can only raid 10 times per minute.')
          };
        }

        return { 
          success: false, 
          error: new Error(result.error || 'Failed to record raid action')
        };
      }

      return { success: true, error: null, queued: result.queued };
    } else {
      // Web: direct insert without offline queue
      const { error } = await supabase
        .from('salvos')
        .insert({
          user_id: userId,
          directive_id: directiveId,
        });

      if (error) {
        // Check for rate limit error
        if (error.code === '42501' || error.message?.includes('rate limit')) {
          console.warn('[RAID] Rate limit exceeded');
          return { 
            success: false, 
            error: new Error('Rate limit exceeded. You can only raid 10 times per minute.')
          };
        }

        return { 
          success: false, 
          error: new Error(error.message || 'Failed to record raid action')
        };
      }

      return { success: true, error: null };
    }
  } catch (error) {
    console.error('Unexpected error in insertSalvo:', error);
    return { 
      success: false, 
      error: new Error('Network error. Please try again.')
    };
  }
}

/**
 * Get a single directive by ID with progress
 */
export async function fetchDirectiveById(
  directiveId: string
): Promise<{ data: DirectiveWithProgress | null; error: Error | null }> {
  try {
    const { data: directive, error: directiveError } = await supabase
      .from('directives')
      .select('*')
      .eq('id', directiveId)
      .single();

    if (directiveError) {
      return { data: null, error: new Error(directiveError.message) };
    }

    // Count salvos
    const { count, error: countError } = await supabase
      .from('salvos')
      .select('*', { count: 'exact', head: true })
      .eq('directive_id', directiveId);

    if (countError) {
      console.error('Error counting salvos:', countError);
    }

    const currentSalvos = count || 0;
    const isCompleted = currentSalvos >= directive.target_goal;

    // Check if party-wide
    const { data: bands } = await supabase
      .from('directive_bands')
      .select('id')
      .eq('directive_id', directiveId);

    const isPartyWide = !bands || bands.length === 0;

    return {
      data: {
        ...directive,
        current_salvos: currentSalvos,
        is_completed: isCompleted,
        is_party_wide: isPartyWide,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}
