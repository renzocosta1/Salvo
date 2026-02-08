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
    // Query referrals with joined profile data
    const { data, error } = await supabase
      .from('referrals')
      .select(`
        id,
        invitee_id,
        referral_code,
        xp_awarded,
        xp_awarded_at,
        created_at,
        invitee:profiles!referrals_invitee_id_fkey(display_name)
      `)
      .eq('recruiter_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getMyReferrals] Error:', error);
      return { data: null, error: new Error('Failed to fetch referrals') };
    }

    // Get invitee emails from auth.users
    const inviteeIds = data?.map((r) => r.invitee_id) || [];
    
    if (inviteeIds.length === 0) {
      return { data: [], error: null };
    }

    // Note: We can't directly query auth.users from the client
    // So we'll just return what we have with null emails
    const referrals: Referral[] = data.map((r: any) => ({
      id: r.id,
      invitee_id: r.invitee_id,
      invitee_name: r.invitee?.display_name || null,
      invitee_email: '', // Would need an Edge Function to fetch this
      referral_code: r.referral_code,
      xp_awarded: r.xp_awarded,
      xp_awarded_at: r.xp_awarded_at,
      created_at: r.created_at,
    }));

    return { data: referrals, error: null };
  } catch (error) {
    console.error('[getMyReferrals] Exception:', error);
    return { data: null, error: error as Error };
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
    // Find the recruiter by referral code
    const { data: recruiter, error: recruiterError } = await supabase
      .from('profiles')
      .select('id, referral_code')
      .eq('referral_code', referralCode.toUpperCase())
      .single();

    if (recruiterError || !recruiter) {
      console.error('[applyReferralCode] Invalid referral code:', referralCode);
      return { success: false, error: new Error('Invalid referral code') };
    }

    // Prevent self-referral
    if (recruiter.id === userId) {
      console.error('[applyReferralCode] Self-referral attempted');
      return { success: false, error: new Error('Cannot refer yourself') };
    }

    // Update the new user's profile with referred_by_user_id
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ referred_by_user_id: recruiter.id })
      .eq('id', userId);

    if (updateError) {
      console.error('[applyReferralCode] Error updating profile:', updateError);
      return { success: false, error: new Error('Failed to apply referral code') };
    }

    console.log(`[applyReferralCode] Successfully applied code ${referralCode} for user ${userId}`);
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
