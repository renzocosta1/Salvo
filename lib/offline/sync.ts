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
  
  console.log(`📤 Syncing ${pending.length} pending check-ins...`);
  
  try {
    // Batch insert to Supabase
    const { data, error } = await supabase
      .from('check_ins')
      .insert(
        pending.map(ci => ({
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
    const ids = pending.map(ci => ci.id!);
    await markCheckInsSynced(ids);
    
    console.log(`✅ Synced ${pending.length} check-ins successfully`);
    return pending.length;
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
  
  console.log(`📤 Syncing ${pending.length} pending salvos...`);
  
  try {
    // Batch insert to Supabase
    const { data, error } = await supabase
      .from('salvos')
      .insert(
        pending.map(salvo => ({
          directive_id: salvo.directive_id,
          user_id: salvo.user_id,
        }))
      )
      .select('id');
    
    if (error) {
      console.error('❌ Failed to sync salvos:', error);
      throw error;
    }
    
    // Mark as synced in SQLite
    const ids = pending.map(salvo => salvo.id!);
    await markSalvosSynced(ids);
    
    console.log(`✅ Synced ${pending.length} salvos successfully`);
    return pending.length;
  } catch (error) {
    console.error('Sync salvos error:', error);
    throw error;
  }
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
