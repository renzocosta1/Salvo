/**
 * Clean Start Utility
 * 
 * Completely wipes all authentication data from the device.
 * Use this when testing auth flows to ensure a fresh start.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';

export async function cleanStart(): Promise<void> {
  console.log('🧹 Starting clean start - wiping all auth data...');
  
  try {
    // Step 1: Sign out from Supabase
    console.log('🧹 Signing out from Supabase...');
    await supabase.auth.signOut();
    
    // Step 2: Clear ALL AsyncStorage data
    console.log('🧹 Clearing AsyncStorage...');
    await AsyncStorage.clear();
    
    // Step 3: Verify it's cleared
    const keys = await AsyncStorage.getAllKeys();
    console.log('🧹 Remaining keys:', keys);
    
    if (keys.length === 0) {
      console.log('✅ Clean start complete! All auth data wiped.');
    } else {
      console.log('⚠️  Warning: Some keys remain:', keys);
    }
    
    return Promise.resolve();
  } catch (error) {
    console.error('❌ Error during clean start:', error);
    throw error;
  }
}

/**
 * Check what auth data exists
 */
export async function debugAuthState(): Promise<void> {
  console.log('🔍 Debugging auth state...');
  
  try {
    // Check Supabase session
    const { data: { session } } = await supabase.auth.getSession();
    console.log('🔍 Supabase session:', session ? 'EXISTS' : 'NONE');
    if (session) {
      console.log('  - User ID:', session.user.id);
      console.log('  - Email:', session.user.email);
      console.log('  - Created:', session.user.created_at);
    }
    
    // Check AsyncStorage
    const keys = await AsyncStorage.getAllKeys();
    console.log('🔍 AsyncStorage keys:', keys);
    
    // Check specific auth keys
    const authToken = await AsyncStorage.getItem('supabase.auth.token');
    console.log('🔍 Auth token:', authToken ? 'EXISTS' : 'NONE');
  } catch (error) {
    console.error('❌ Error debugging auth state:', error);
  }
}
