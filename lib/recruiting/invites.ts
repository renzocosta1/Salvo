import { supabase } from '../supabase';

export interface Invite {
  id: string;
  inviter_id: string;
  invite_code: string;
  invitee_phone_e164: string | null;
  invitee_user_id: string | null;
  status: 'pending' | 'accepted' | 'expired';
  xp_awarded: boolean;
  created_at: string;
  accepted_at: string | null;
  expired_at: string | null;
}

/**
 * Generate a unique 6-character invite code
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a new invite record
 */
export async function createInvite(
  inviterId: string,
  phoneNumber?: string
): Promise<{ success: boolean; data?: Invite; error?: string }> {
  try {
    const inviteCode = generateInviteCode();

    const { data, error } = await supabase
      .from('invites')
      .insert({
        inviter_id: inviterId,
        invite_code: inviteCode,
        invitee_phone_e164: phoneNumber || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating invite:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Invite };
  } catch (error) {
    console.error('Unexpected error creating invite:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get all invites sent by a user
 */
export async function getMyInvites(
  userId: string
): Promise<{ success: boolean; data?: Invite[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('invites')
      .select('*')
      .eq('inviter_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invites:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Invite[] };
  } catch (error) {
    console.error('Unexpected error fetching invites:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Accept an invite (mark as accepted and link to user)
 */
export async function acceptInvite(
  inviteCode: string,
  newUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find the invite by code
    const { data: invite, error: fetchError } = await supabase
      .from('invites')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase())
      .single();

    if (fetchError || !invite) {
      return { success: false, error: 'Invalid invite code' };
    }

    if (invite.status !== 'pending') {
      return { success: false, error: 'Invite already used or expired' };
    }

    // Update invite status
    const { error: updateError } = await supabase
      .from('invites')
      .update({
        status: 'accepted',
        invitee_user_id: newUserId,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invite.id);

    if (updateError) {
      console.error('Error accepting invite:', updateError);
      return { success: false, error: updateError.message };
    }

    // Update the new user's profile to link to inviter
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ invited_by: invite.inviter_id })
      .eq('id', newUserId);

    if (profileError) {
      console.error('Error updating profile with inviter:', profileError);
    }

    // Award XP to inviter (call Postgres function)
    try {
      await supabase.rpc('award_invite_xp', {
        inviter_user_id: invite.inviter_id,
      });
    } catch (xpError) {
      console.error('Error awarding invite XP:', xpError);
      // Don't fail the invite acceptance if XP fails
    }

    return { success: true };
  } catch (error) {
    console.error('Unexpected error accepting invite:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Check if an invite code is valid
 */
export async function checkInviteCode(
  code: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('invites')
      .select('id, status')
      .eq('invite_code', code.toUpperCase())
      .eq('status', 'pending')
      .single();

    if (error || !data) {
      return { valid: false, error: 'Invalid or expired invite code' };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Invalid invite code' };
  }
}

/**
 * Get user's personal invite code
 */
export async function getMyInviteCode(
  userId: string
): Promise<{ success: boolean; code?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('invite_code')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching invite code:', error);
      return { success: false, error: error.message };
    }

    return { success: true, code: data.invite_code };
  } catch (error) {
    console.error('Unexpected error fetching invite code:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get invite statistics for a user
 */
export async function getInviteStats(
  userId: string
): Promise<{
  success: boolean;
  data?: { total: number; accepted: number; pending: number };
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from('invites')
      .select('status')
      .eq('inviter_id', userId);

    if (error) {
      console.error('Error fetching invite stats:', error);
      return { success: false, error: error.message };
    }

    const total = data.length;
    const accepted = data.filter((inv) => inv.status === 'accepted').length;
    const pending = data.filter((inv) => inv.status === 'pending').length;

    return { success: true, data: { total, accepted, pending } };
  } catch (error) {
    console.error('Unexpected error fetching invite stats:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
