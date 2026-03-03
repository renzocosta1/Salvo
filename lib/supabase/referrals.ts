import { supabase } from '../supabase';

export interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  pendingReferrals: number;
  totalXpEarned: number;
}

export interface Referral {
  id: string;
  invitee_id: string;
  invitee_name: string | null;
  invitee_email: string;
  referral_code: string;
  xp_awarded: boolean;
  xp_awarded_at: string | null;
  created_at: string;
}

/**
 * Get the current user's referral code
 */
export async function getMyReferralCode(userId: string): Promise<{
  data: string | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('[getMyReferralCode] Error:', error);
      return { data: null, error: new Error('Failed to fetch referral code') };
    }

    return { data: data?.referral_code || null, error: null };
  } catch (error) {
    console.error('[getMyReferralCode] Exception:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get referral statistics for the current user
 */
export async function getReferralStats(userId: string): Promise<{
  data: ReferralStats | null;
  error: Error | null;
}> {
  try {
    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('recruiter_id', userId);

    if (error) {
      console.error('[getReferralStats] Error:', error);
      return { data: null, error: new Error('Failed to fetch referral stats') };
    }

    const totalReferrals = data?.length || 0;
    const completedReferrals = data?.filter((r) => r.xp_awarded).length || 0;
    const pendingReferrals = totalReferrals - completedReferrals;
    const totalXpEarned = completedReferrals * 100;

    return {
      data: {
        totalReferrals,
        completedReferrals,
        pendingReferrals,
        totalXpEarned,
      },
      error: null,
    };
  } catch (error) {
    console.error('[getReferralStats] Exception:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Get detailed list of referrals for the current user
 */
export async function getMyReferrals(userId: string): Promise<{
  data: Referral[] | null;
  error: Error | null;
}> {
  try {
    // Check if referrals table exists by trying to fetch count
    const { count, error: countError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('referred_by_user_id', userId);

    if (countError) {
      console.error('[getMyReferrals] Error checking profiles:', countError);
    }

    // Use profiles table with referred_by_user_id since referrals table might not exist
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, created_at, referral_code')
      .eq('referred_by_user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getMyReferrals] Error:', error);
      // Return empty array instead of error to avoid breaking the UI
      return { data: [], error: null };
    }

    if (!data || data.length === 0) {
      return { data: [], error: null };
    }

    // Map profiles to referral format
    const referrals: Referral[] = data.map((p) => ({
      id: p.id,
      invitee_id: p.id,
      invitee_name: p.display_name || null,
      invitee_email: '', // Would need an Edge Function to fetch this
      referral_code: p.referral_code || '',
      xp_awarded: false, // Would need additional logic to determine
      xp_awarded_at: null,
      created_at: p.created_at,
    }));

    return { data: referrals, error: null };
  } catch (error) {
    console.error('[getMyReferrals] Exception:', error);
    // Return empty array instead of throwing to avoid breaking the UI
    return { data: [], error: null };
  }
}

/**
 * Validate and apply a referral code during signup
 */
export async function applyReferralCode(
  userId: string,
  referralCode: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    console.log('[applyReferralCode] Starting... userId:', userId, 'code:', referralCode);
    
    // Find the recruiter by referral code
    const { data: recruiter, error: recruiterError } = await supabase
      .from('profiles')
      .select('id, referral_code')
      .eq('referral_code', referralCode.toUpperCase())
      .single();

    console.log('[applyReferralCode] Recruiter lookup:', { recruiter, recruiterError });

    if (recruiterError || !recruiter) {
      console.error('[applyReferralCode] Invalid referral code:', referralCode, recruiterError);
      return { success: false, error: new Error('Invalid referral code: ' + (recruiterError?.message || 'Not found')) };
    }

    // Prevent self-referral
    if (recruiter.id === userId) {
      console.error('[applyReferralCode] Self-referral attempted');
      return { success: false, error: new Error('Cannot refer yourself') };
    }

    // Wait a bit for profile to be created by trigger (if needed)
    console.log('[applyReferralCode] Checking if new user profile exists...');
    let retries = 0;
    let profileExists = false;
    
    while (retries < 5 && !profileExists) {
      const { data: checkProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single();
      
      if (checkProfile) {
        profileExists = true;
        console.log('[applyReferralCode] Profile exists!');
      } else {
        console.log('[applyReferralCode] Profile not found yet, waiting... (attempt', retries + 1, ')');
        await new Promise(resolve => setTimeout(resolve, 500));
        retries++;
      }
    }
    
    if (!profileExists) {
      console.error('[applyReferralCode] Profile never created for user:', userId);
      return { success: false, error: new Error('Profile not found - please try again') };
    }

    // Update the new user's profile with referred_by_user_id
    console.log('[applyReferralCode] Updating profile with recruiter ID:', recruiter.id);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ referred_by_user_id: recruiter.id })
      .eq('id', userId);

    if (updateError) {
      console.error('[applyReferralCode] Error updating profile:', updateError);
      return { success: false, error: new Error('Failed to apply referral code: ' + updateError.message) };
    }

    console.log(`[applyReferralCode] ✅ Successfully applied code ${referralCode} for user ${userId}`);
    return { success: true, error: null };
  } catch (error) {
    console.error('[applyReferralCode] Exception:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Generate shareable referral link
 */
export function generateReferralLink(referralCode: string): string {
  // For PWA: Use the production URL
  const baseUrl = 'https://salvo-eight.vercel.app';
  return `${baseUrl}/?ref=${referralCode}`;
}

/**
 * Generate shareable referral message
 */
export function generateReferralMessage(referralCode: string): string {
  const link = generateReferralLink(referralCode);
  return `Join me on Salvo - we're organizing to take back our state! 🎯\n\nUse my code: ${referralCode}\n\n${link}`;
}
