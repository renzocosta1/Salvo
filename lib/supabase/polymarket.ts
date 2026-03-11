import { supabase } from '../supabase';

export interface PolymarketOdds {
  id: string;
  market_slug: string;
  market_title: string;
  market_id: string | null;
  event_id: string | null;
  outcomes: string[];
  prices: number[];
  volume_24hr: number | null;
  last_fetched_at: string;
  created_at: string;
  updated_at: string;
}

export interface TrackedMarket {
  id: string;
  slug: string;
  display_name: string;
  category: string;
  priority: number;
  active: boolean;
  created_at: string;
}

/**
 * Fetch cached Polymarket odds for all tracked markets
 */
export async function getPolymarketOdds(): Promise<{
  data: PolymarketOdds[] | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('polymarket_odds')
      .select('*')
      .order('market_slug');

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Fetch cached odds for a specific market
 */
export async function getMarketOdds(slug: string): Promise<{
  data: PolymarketOdds | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('polymarket_odds')
      .select('*')
      .eq('market_slug', slug)
      .single();

    if (error) {
      // PGRST116 = not found, which is ok
      if (error.code === 'PGRST116') {
        return { data: null, error: null };
      }
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Get all tracked markets
 */
export async function getTrackedMarkets(): Promise<{
  data: TrackedMarket[] | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('polymarket_tracked_markets')
      .select('*')
      .eq('active', true)
      .order('priority');

    if (error) {
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}

/**
 * Manually trigger Polymarket odds refresh (calls Edge Function)
 */
export async function refreshPolymarketOdds(): Promise<{
  success: boolean;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase.functions.invoke('fetch-polymarket-odds');

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    if (!data || !data.success) {
      return { success: false, error: new Error('Failed to refresh odds') };
    }

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

/**
 * Subscribe to real-time odds updates
 */
export function subscribeToOddsUpdates(
  callback: (odds: PolymarketOdds) => void
) {
  return supabase
    .channel('polymarket_odds_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'polymarket_odds',
      },
      (payload) => {
        if (payload.new) {
          callback(payload.new as PolymarketOdds);
        }
      }
    )
    .subscribe();
}
