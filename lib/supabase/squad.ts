import { supabase } from '../supabase';

// =====================================================
// Types
// =====================================================

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  xp: number;
  level: number;
  missions_completed: number;
  district_rank?: number;
  county_rank?: number;
  is_leader: boolean;
  legislative_district?: string;
}

export interface SquadStats {
  squad_name: string;
  total_members: number;
  active_today: number;
  total_xp: number;
  average_level: number;
  missions_completed: number;
  top_warrior: {
    name: string;
    xp: number;
    level: number;
  };
}

export interface CheckInResult {
  success: boolean;
  base_xp?: number;
  streak_bonus?: number;
  total_xp?: number;
  new_streak?: number;
  message: string;
  error?: string;
  hours_remaining?: number;
  next_check_in_at?: string;
}

// =====================================================
// District Leaderboard
// =====================================================

export async function getDistrictLeaderboard(
  county: string,
  legislativeDistrict: string,
  limit: number = 20
): Promise<{
  data: LeaderboardEntry[] | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase.rpc('get_district_leaderboard', {
      p_county: county,
      p_legislative_district: legislativeDistrict,
      p_limit: limit,
    });

    if (error) {
      console.error('[getDistrictLeaderboard] Error:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('[getDistrictLeaderboard] Unexpected error:', error);
    return { data: null, error: error as Error };
  }
}

// =====================================================
// County Leaderboard
// =====================================================

export async function getCountyLeaderboard(
  county: string,
  limit: number = 20
): Promise<{
  data: LeaderboardEntry[] | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase.rpc('get_county_leaderboard', {
      p_county: county,
      p_limit: limit,
    });

    if (error) {
      console.error('[getCountyLeaderboard] Error:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('[getCountyLeaderboard] Unexpected error:', error);
    return { data: null, error: error as Error };
  }
}

// =====================================================
// Squad Stats
// =====================================================

export async function getSquadStats(
  county: string,
  legislativeDistrict: string
): Promise<{
  data: SquadStats | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase.rpc('get_squad_stats', {
      p_county: county,
      p_legislative_district: legislativeDistrict,
    });

    if (error) {
      console.error('[getSquadStats] Error:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as SquadStats, error: null };
  } catch (error) {
    console.error('[getSquadStats] Unexpected error:', error);
    return { data: null, error: error as Error };
  }
}

// =====================================================
// Weekly Check-In
// =====================================================

export async function claimWeeklyCheckIn(
  userId: string
): Promise<{
  data: CheckInResult | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase.rpc('claim_weekly_check_in', {
      p_user_id: userId,
    });

    if (error) {
      console.error('[claimWeeklyCheckIn] Error:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: data as CheckInResult, error: null };
  } catch (error) {
    console.error('[claimWeeklyCheckIn] Unexpected error:', error);
    return { data: null, error: error as Error };
  }
}

// =====================================================
// Get User's Rank in District
// =====================================================

export async function getMyDistrictRank(
  userId: string,
  county: string,
  legislativeDistrict: string
): Promise<{
  rank: number | null;
  total: number | null;
  error: Error | null;
}> {
  try {
    // Get full leaderboard
    const { data, error } = await getDistrictLeaderboard(county, legislativeDistrict, 999);

    if (error || !data) {
      return { rank: null, total: null, error: error || new Error('No data') };
    }

    // Find user's position
    const userIndex = data.findIndex((entry) => entry.user_id === userId);
    
    if (userIndex === -1) {
      return { rank: null, total: data.length, error: null };
    }

    return { 
      rank: userIndex + 1, 
      total: data.length, 
      error: null 
    };
  } catch (error) {
    console.error('[getMyDistrictRank] Unexpected error:', error);
    return { rank: null, total: null, error: error as Error };
  }
}

// =====================================================
// Real-Time Squad Updates
// =====================================================

export function subscribeToSquadUpdates(
  county: string,
  legislativeDistrict: string,
  callback: () => void
) {
  return supabase
    .channel(`squad_updates_${county}_${legislativeDistrict}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `county=eq.${county},legislative_district=eq.${legislativeDistrict}`,
      },
      () => {
        callback();
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'completed_missions',
      },
      () => {
        callback();
      }
    )
    .subscribe();
}
