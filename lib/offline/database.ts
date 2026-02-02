/**
 * Offline Database - SQLite for Queuing Actions
 * 
 * Stores check-ins and salvos when offline, syncs to Supabase when online
 */

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'salvo_offline.db';

// Database instance
let db: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize the offline database and create tables if needed
 */
export async function initDatabase(): Promise<void> {
  try {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    
    console.log('📦 Initializing offline database...');
    
    // Create pending_check_ins table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS pending_check_ins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        h3_index TEXT NOT NULL,
        event_type TEXT,
        region TEXT,
        created_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0
      );
    `);
    
    // Create pending_salvos table
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS pending_salvos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        directive_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        synced INTEGER DEFAULT 0
      );
    `);
    
    // Create index for faster syncing
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_pending_check_ins_synced 
      ON pending_check_ins(synced);
      
      CREATE INDEX IF NOT EXISTS idx_pending_salvos_synced 
      ON pending_salvos(synced);
    `);
    
    console.log('✅ Offline database initialized successfully');
    
    // Log current queue status
    const checkInCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM pending_check_ins WHERE synced = 0'
    );
    const salvoCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM pending_salvos WHERE synced = 0'
    );
    
    console.log(`📊 Offline queue status: ${checkInCount?.count || 0} check-ins, ${salvoCount?.count || 0} salvos pending`);
  } catch (error) {
    console.error('❌ Failed to initialize offline database:', error);
    throw error;
  }
}

/**
 * Get database instance (must call initDatabase first)
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
    console.log('📦 Database closed');
  }
}
