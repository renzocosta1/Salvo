/**
 * Offline-Aware Action Handlers
 * 
 * Intercepts check-ins and salvos, queuing them locally when offline
 */

import NetInfo from '@react-native-community/netinfo';
import { supabase } from '../supabase';
import { queueCheckIn, queueSalvo } from './queue';

/**
 * Check if device is currently online
 */
export async function isOnline(): Promise<boolean> {
  const state = await NetInfo.fetch();
  return state.isConnected === true && state.isInternetReachable !== false;
}

/**
 * Submit a check-in (online or offline)
 * 
 * If online: Inserts directly to Supabase
 * If offline: Queues locally in SQLite
 */
export async function submitCheckIn(params: {
  user_id: string;
  h3_index: string;
  event_type?: string;
  region?: string;
}): Promise<{ success: boolean; queued?: boolean; error?: string }> {
  try {
    const online = await isOnline();
    
    if (!online) {
      // OFFLINE: Queue locally
      console.log('📡 Device offline, queuing check-in...');
      await queueCheckIn(params);
      return { success: true, queued: true };
    }
    
    // ONLINE: Submit directly to Supabase
    const { error } = await supabase
      .from('check_ins')
      .insert({
        user_id: params.user_id,
        h3_index: params.h3_index,
        event_type: params.event_type || 'check_in',
        region: params.region,
      });
    
    if (error) {
      // If Supabase fails, queue it as fallback
      console.warn('⚠️ Supabase check-in failed, queuing locally:', error);
      await queueCheckIn(params);
      return { success: true, queued: true };
    }
    
    console.log('✅ Check-in submitted successfully (online)');
    return { success: true, queued: false };
  } catch (error) {
    console.error('❌ Check-in error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Submit a salvo/raid (online or offline)
 * 
 * If online: Inserts directly to Supabase
 * If offline: Queues locally in SQLite
 */
export async function submitSalvo(params: {
  directive_id: string;
  user_id: string;
}): Promise<{ success: boolean; queued?: boolean; error?: string }> {
  try {
    const online = await isOnline();
    
    if (!online) {
      // OFFLINE: Queue locally
      console.log('📡 Device offline, queuing salvo...');
      await queueSalvo(params);
      return { success: true, queued: true };
    }
    
    // ONLINE: Submit directly to Supabase
    const { error } = await supabase
      .from('salvos')
      .insert({
        directive_id: params.directive_id,
        user_id: params.user_id,
      });
    
    if (error) {
      // If Supabase fails, queue it as fallback
      console.warn('⚠️ Supabase salvo failed, queuing locally:', error);
      await queueSalvo(params);
      return { success: true, queued: true };
    }
    
    console.log('✅ Salvo submitted successfully (online)');
    return { success: true, queued: false };
  } catch (error) {
    console.error('❌ Salvo error:', error);
    return { success: false, error: String(error) };
  }
}
