import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file:\n' +
    '- EXPO_PUBLIC_SUPABASE_URL\n' +
    '- EXPO_PUBLIC_SUPABASE_ANON_KEY'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Helper to check connection
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('ranks').select('count');
    
    if (error) {
      console.error('Supabase connection error:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Supabase connection failed:', error);
    return { success: false, error: String(error) };
  }
}

// Helper types for database tables (can be auto-generated later with Supabase CLI)
export type Profile = {
  id: string;
  display_name: string | null;
  party_id: string | null;
  warrior_band_id: string | null;
  role: 'general' | 'captain' | 'warrior';
  rank_id: string | null;
  level: number;
  xp: number;
  oath_signed_at: string | null;
  contract_version_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Rank = {
  id: string;
  name: string;
  level_min: number;
  level_max: number;
  is_manually_approved: boolean;
  created_at: string;
};

// Directive type moved to lib/supabase/types.ts
// Kept here for backward compatibility
export type Directive = {
  id: string;
  party_id: string;
  author_id: string;
  title: string;
  body: string | null;
  target_goal: number;
  created_at: string;
};
