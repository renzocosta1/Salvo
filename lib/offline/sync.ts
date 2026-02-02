/**
 * Offline Sync Service
 * 
 * Monitors network connectivity and syncs queued actions to Supabase
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../supabase';
import { 
  getPendingCheckIns, 
  getPendingSalvos, 
  markCheckInsSynced, 
  markSalvosSynced,
  cleanupSyncedItems,
  getQueueStats,
} from './queue';

let isSyncing = false;
let syncInterval: NodeJS.Timeout | null = null;

/**
 * Sync all pending check-ins to Supabase
 */
async function syncCheckIns(): Promise<number> {
  const pending = await getPendingCheckIns();
  
  if (pending.length === 0) {
    return 0;
  }
  
  // Get current authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('❌ Not authenticated, cannot sync check-ins');
    return 0;
  }
  
  // Filter to only check-ins for the current user (RLS requirement)
  const userCheckIns = pending.filter(ci => ci.user_id === user.id);
  
  if (userCheckIns.length === 0) {
    console.log('📊 No check-ins to sync for current user');
    return 0;
  }
  
  console.log(`📤 Syncing ${userCheckIns.length} pending check-ins for user ${user.id}...`);
  
  try {
    // Batch insert to Supabase
    const { data, error } = await supabase
      .from('check_ins')
      .insert(
        userCheckIns.map(ci => ({
          user_id: ci.user_id,
          h3_index: ci.h3_index,
          event_type: ci.event_type,
          region: ci.region,
        }))
      )
      .select('id');
    
    if (error) {
      console.error('❌ Failed to sync check-ins:', error);
      throw error;
    }
    
    // Mark as synced in SQLite
    const ids = userCheckIns.map(ci => ci.id!);
    await markCheckInsSynced(ids);
    
    console.log(`✅ Synced ${userCheckIns.length} check-ins successfully`);
    return userCheckIns.length;
  } catch (error) {
    console.error('Sync check-ins error:', error);
    throw error;
  }
}

/**
 * Sync all pending salvos to Supabase
 */
async function syncSalvos(): Promise<number> {
  const pending = await getPendingSalvos();
  
  if (pending.length === 0) {
    return 0;
  }
  
  // Get current authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error('❌ Not authenticated, cannot sync salvos');
    return 0;
  }
  
  // Filter to only salvos for the current user (RLS requirement)
  const userSalvos = pending.filter(salvo => salvo.user_id === user.id);
  
  if (userSalvos.length === 0) {
    console.log('📊 No salvos to sync for current user');
    return 0;
  }
  
  console.log(`📤 Syncing ${userSalvos.length} pending salvos for user ${user.id}...`);
  
  // Insert salvos one at a time to handle rate limits gracefully
  const syncedIds: number[] = [];
  let successCount = 0;
  
  for (const salvo of userSalvos) {
    try {
      const { error } = await supabase
        .from('salvos')
        .insert({
          directive_id: salvo.directive_id,
          user_id: salvo.user_id,
        });
      
      if (error) {
        // Check if it's a rate limit error
        if (error.code === '42501' || error.message?.includes('rate limit')) {
          console.warn(`⏸️ Rate limit hit for salvo ${salvo.id}, will retry later`);
          // Don't mark as synced, leave in queue for next sync
          continue;
        }
        
        // Other errors (RLS violation, etc.)
        console.error(`❌ Failed to sync salvo ${salvo.id}:`, error);
        // Don't mark as synced, leave in queue
        continue;
      }
      
      // Success! Mark for synced
      syncedIds.push(salvo.id!);
      successCount++;
    } catch (err) {
      console.error(`❌ Unexpected error syncing salvo ${salvo.id}:`, err);
      // Don't mark as synced
    }
  }
  
  // Mark successfully synced salvos
  if (syncedIds.length > 0) {
    await markSalvosSynced(syncedIds);
    console.log(`✅ Synced ${successCount} salvos successfully`);
  }
  
  if (successCount < userSalvos.length) {
    console.log(`⚠️ ${userSalvos.length - successCount} salvos remain in queue (rate limited or errors)`);
  }
  
  return successCount;
}

/**
 * Main sync function - syncs all pending items
 */
export async function syncOfflineQueue(): Promise<void> {
  // Prevent concurrent syncs
  if (isSyncing) {
    console.log('⏳ Sync already in progress, skipping...');
    return;
  }
  
  // Check if we have network
  const state = await NetInfo.fetch();
  if (!state.isConnected || state.isInternetReachable === false) {
    console.log('📡 No network connection, skipping sync');
    return;
  }
  
  isSyncing = true;
  
  try {
    console.log('🔄 Starting offline queue sync...');
    
    // Get queue stats before sync
    const statsBefore = await getQueueStats();
    console.log(`📊 Queue before sync: ${statsBefore.checkIns} check-ins, ${statsBefore.salvos} salvos`);
    
    if (statsBefore.checkIns === 0 && statsBefore.salvos === 0) {
      console.log('✨ Queue is empty, nothing to sync');
      return;
    }
    
    // Sync check-ins
    let checkInsSynced = 0;
    try {
      checkInsSynced = await syncCheckIns();
    } catch (error) {
      console.error('Check-ins sync failed, continuing with salvos...', error);
    }
    
    // Sync salvos
    let salvosSynced = 0;
    try {
      salvosSynced = await syncSalvos();
    } catch (error) {
      console.error('Salvos sync failed', error);
    }
    
    // Cleanup old synced items
    await cleanupSyncedItems();
    
    console.log(`✅ Sync complete: ${checkInsSynced} check-ins, ${salvosSynced} salvos`);
    
    // Get final stats
    const statsAfter = await getQueueStats();
    console.log(`📊 Queue after sync: ${statsAfter.checkIns} check-ins, ${statsAfter.salvos} salvos remaining`);
  } catch (error) {
    console.error('❌ Sync failed:', error);
  } finally {
    isSyncing = false;
  }
}

/**
 * Start monitoring network status and sync when online
 */
export function startSyncService(): () => void {
  console.log('🚀 Starting offline sync service...');
  
  // Sync on network state change
  const unsubscribeNetInfo = NetInfo.addEventListener((state: NetInfoState) => {
    console.log('📡 Network state changed:', {
      isConnected: state.isConnected,
      type: state.type,
      isInternetReachable: state.isInternetReachable,
    });
    
    // If we just went online, trigger sync
    if (state.isConnected && state.isInternetReachable !== false) {
      console.log('🌐 Device is online, triggering sync...');
      syncOfflineQueue();
    }
  });
  
  // Sync when app comes to foreground
  const appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      console.log('📱 App became active, checking for pending sync...');
      syncOfflineQueue();
    }
  });
  
  // Periodic sync every 5 minutes (as backup)
  syncInterval = setInterval(() => {
    console.log('⏰ Periodic sync check...');
    syncOfflineQueue();
  }, 5 * 60 * 1000); // 5 minutes
  
  // Initial sync on service start
  syncOfflineQueue();
  
  // Return cleanup function
  return () => {
    console.log('🛑 Stopping offline sync service...');
    unsubscribeNetInfo();
    appStateSubscription.remove();
    if (syncInterval) {
      clearInterval(syncInterval);
      syncInterval = null;
    }
  };
}
