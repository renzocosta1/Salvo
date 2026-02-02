/**
 * Offline Queue Management
 * 
 * Functions to add actions to the offline queue and retrieve them for syncing
 */

import { getDatabase } from './database';

export interface PendingCheckIn {
  id?: number;
  user_id: string;
  h3_index: string;
  event_type?: string;
  region?: string;
  created_at: string;
  synced?: number;
}

export interface PendingSalvo {
  id?: number;
  directive_id: string;
  user_id: string;
  created_at: string;
  synced?: number;
}

/**
 * Add a check-in to the offline queue
 */
export async function queueCheckIn(checkIn: Omit<PendingCheckIn, 'id' | 'created_at' | 'synced'>): Promise<number> {
  const db = getDatabase();
  const created_at = new Date().toISOString();
  
  const result = await db.runAsync(
    `INSERT INTO pending_check_ins (user_id, h3_index, event_type, region, created_at, synced) 
     VALUES (?, ?, ?, ?, ?, 0)`,
    [checkIn.user_id, checkIn.h3_index, checkIn.event_type || 'check_in', checkIn.region || 'Montgomery County', created_at]
  );
  
  console.log(`📥 Queued check-in (offline): H3=${checkIn.h3_index}, ID=${result.lastInsertRowId}`);
  return result.lastInsertRowId;
}

/**
 * Add a salvo to the offline queue
 */
export async function queueSalvo(salvo: Omit<PendingSalvo, 'id' | 'created_at' | 'synced'>): Promise<number> {
  const db = getDatabase();
  const created_at = new Date().toISOString();
  
  const result = await db.runAsync(
    `INSERT INTO pending_salvos (directive_id, user_id, created_at, synced) 
     VALUES (?, ?, ?, 0)`,
    [salvo.directive_id, salvo.user_id, created_at]
  );
  
  console.log(`📥 Queued salvo (offline): Directive=${salvo.directive_id}, ID=${result.lastInsertRowId}`);
  return result.lastInsertRowId;
}

/**
 * Get all pending check-ins that haven't been synced
 */
export async function getPendingCheckIns(): Promise<PendingCheckIn[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<PendingCheckIn>(
    'SELECT * FROM pending_check_ins WHERE synced = 0 ORDER BY created_at ASC'
  );
  return rows;
}

/**
 * Get all pending salvos that haven't been synced
 */
export async function getPendingSalvos(): Promise<PendingSalvo[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<PendingSalvo>(
    'SELECT * FROM pending_salvos WHERE synced = 0 ORDER BY created_at ASC'
  );
  return rows;
}

/**
 * Mark check-ins as synced
 */
export async function markCheckInsSynced(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  
  const db = getDatabase();
  const placeholders = ids.map(() => '?').join(',');
  
  await db.runAsync(
    `UPDATE pending_check_ins SET synced = 1 WHERE id IN (${placeholders})`,
    ids
  );
  
  console.log(`✅ Marked ${ids.length} check-ins as synced`);
}

/**
 * Mark salvos as synced
 */
export async function markSalvosSynced(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  
  const db = getDatabase();
  const placeholders = ids.map(() => '?').join(',');
  
  await db.runAsync(
    `UPDATE pending_salvos SET synced = 1 WHERE id IN (${placeholders})`,
    ids
  );
  
  console.log(`✅ Marked ${ids.length} salvos as synced`);
}

/**
 * Delete synced items older than 7 days (cleanup)
 */
export async function cleanupSyncedItems(): Promise<void> {
  const db = getDatabase();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  
  const checkInsResult = await db.runAsync(
    'DELETE FROM pending_check_ins WHERE synced = 1 AND created_at < ?',
    [sevenDaysAgo]
  );
  
  const salvosResult = await db.runAsync(
    'DELETE FROM pending_salvos WHERE synced = 1 AND created_at < ?',
    [sevenDaysAgo]
  );
  
  console.log(`🧹 Cleanup: Deleted ${checkInsResult.changes} old check-ins, ${salvosResult.changes} old salvos`);
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<{ checkIns: number; salvos: number }> {
  const db = getDatabase();
  
  const checkInCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM pending_check_ins WHERE synced = 0'
  );
  
  const salvoCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM pending_salvos WHERE synced = 0'
  );
  
  return {
    checkIns: checkInCount?.count || 0,
    salvos: salvoCount?.count || 0,
  };
}
