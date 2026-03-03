/**
 * RED ALERT system for Polymarket odds shifts
 * Detects and displays critical changes in race odds
 */

import { supabase } from '../supabase';

export interface PolymarketAlert {
  id: string;
  market_slug: string;
  alert_type: 'major_shift' | 'lost_lead' | 'gained_lead';
  outcome_name: string;
  old_price: number;
  new_price: number;
  price_change: number;
  triggered_at: string;
  acknowledged_by_user_ids: string[];
  created_at: string;
}

export interface AlertWithMarket extends PolymarketAlert {
  market_title: string;
}

/**
 * Fetch active (unacknowledged) alerts for current user
 */
export async function getActiveAlerts(
  userId: string
): Promise<{ data: AlertWithMarket[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('polymarket_alerts')
      .select(`
        *,
        market:polymarket_odds!polymarket_alerts_market_slug_fkey(market_title)
      `)
      .not('acknowledged_by_user_ids', 'cs', `{${userId}}`) // Not acknowledged by this user
      .gte('triggered_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('triggered_at', { ascending: false });

    if (error) {
      console.error('[getActiveAlerts] Error:', error);
      return { data: null, error: new Error(error.message) };
    }

    if (!data) {
      return { data: [], error: null };
    }

    // Transform data
    const alerts: AlertWithMarket[] = data.map((alert: any) => ({
      id: alert.id,
      market_slug: alert.market_slug,
      alert_type: alert.alert_type,
      outcome_name: alert.outcome_name,
      old_price: alert.old_price,
      new_price: alert.new_price,
      price_change: alert.price_change,
      triggered_at: alert.triggered_at,
      acknowledged_by_user_ids: alert.acknowledged_by_user_ids || [],
      created_at: alert.created_at,
      market_title: alert.market?.market_title || 'Unknown Race',
    }));

    return { data: alerts, error: null };
  } catch (error) {
    console.error('[getActiveAlerts] Exception:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Acknowledge an alert (dismiss it)
 */
export async function acknowledgeAlert(
  alertId: string,
  userId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    // First get current acknowledged users
    const { data: alert, error: fetchError } = await supabase
      .from('polymarket_alerts')
      .select('acknowledged_by_user_ids')
      .eq('id', alertId)
      .single();

    if (fetchError) {
      return { success: false, error: new Error(fetchError.message) };
    }

    const acknowledgedUsers = alert?.acknowledged_by_user_ids || [];
    
    // Add current user if not already acknowledged
    if (!acknowledgedUsers.includes(userId)) {
      acknowledgedUsers.push(userId);
      
      const { error: updateError } = await supabase
        .from('polymarket_alerts')
        .update({ acknowledged_by_user_ids: acknowledgedUsers })
        .eq('id', alertId);

      if (updateError) {
        return { success: false, error: new Error(updateError.message) };
      }
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('[acknowledgeAlert] Exception:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Subscribe to new alerts in real-time
 */
export function subscribeToAlerts(
  userId: string,
  callback: (alert: PolymarketAlert) => void
) {
  return supabase
    .channel('polymarket_alerts_channel')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'polymarket_alerts',
      },
      (payload) => {
        const newAlert = payload.new as PolymarketAlert;
        
        // Only notify if user hasn't acknowledged
        if (!newAlert.acknowledged_by_user_ids?.includes(userId)) {
          callback(newAlert);
        }
      }
    )
    .subscribe();
}

/**
 * Get alert display message
 */
export function getAlertMessage(alert: AlertWithMarket): string {
  const percentChange = Math.abs(alert.price_change * 100).toFixed(1);
  const direction = alert.price_change > 0 ? 'UP' : 'DOWN';
  
  if (alert.alert_type === 'lost_lead') {
    return `🚨 ${alert.outcome_name} LOST LEAD in ${alert.market_title}! Dropped to ${Math.round(alert.new_price * 100)}%`;
  }
  
  if (alert.alert_type === 'gained_lead') {
    return `🎉 ${alert.outcome_name} GAINED LEAD in ${alert.market_title}! Rose to ${Math.round(alert.new_price * 100)}%`;
  }
  
  // major_shift
  return `⚠️ MAJOR SHIFT: ${alert.outcome_name} moved ${direction} ${percentChange}% in ${alert.market_title}`;
}

/**
 * Get alert severity level
 */
export function getAlertSeverity(
  alert: PolymarketAlert
): 'critical' | 'warning' | 'info' {
  if (alert.alert_type === 'lost_lead') return 'critical';
  if (Math.abs(alert.price_change) > 0.10) return 'critical'; // >10% shift
  if (Math.abs(alert.price_change) > 0.05) return 'warning'; // >5% shift
  return 'info';
}
