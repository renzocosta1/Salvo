import { supabase } from '../supabase';

export interface VerificationResult {
  success: boolean;
  verdict?: boolean;
  confidence?: number;
  reasoning?: string;
  error?: string;
}

/**
 * Upload mission proof photo to Supabase Storage
 * @param userId - User's ID
 * @param missionType - Type of mission (e.g., 'early_raid', 'election_day_siege')
 * @param photoFile - File object or base64 string
 * @returns Public URL of uploaded photo
 */
export async function uploadProofPhoto(
  userId: string,
  missionType: string,
  photoFile: File | string
): Promise<{ url: string | null; error: Error | null }> {
  try {
    const timestamp = Date.now();
    const fileName = `${userId}_${missionType}_${timestamp}.jpg`;
    const filePath = `mission-proofs/${fileName}`;

    let uploadData: ArrayBuffer;

    if (typeof photoFile === 'string') {
      // Base64 string
      const base64Data = photoFile.split(',')[1] || photoFile;
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      uploadData = bytes.buffer;
    } else {
      // File object
      uploadData = await photoFile.arrayBuffer();
    }

    const { data, error } = await supabase.storage
      .from('mission-proofs')
      .upload(filePath, uploadData, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return { url: null, error: new Error(error.message) };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('mission-proofs')
      .getPublicUrl(filePath);

    return { url: urlData.publicUrl, error: null };
  } catch (error) {
    console.error('Upload exception:', error);
    return { url: null, error: error as Error };
  }
}

/**
 * Verify "I Voted" sticker photo using Gemini AI
 * @param photoUrl - URL of the uploaded photo
 * @param missionType - Type of mission for context
 * @returns Verification result from AI
 */
export async function verifyVotedSticker(
  photoUrl: string,
  missionType: string
): Promise<VerificationResult> {
  try {
    console.log('[Verification] Calling Edge Function with:', { photoUrl, missionType });
    
    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('verify-voted-sticker', {
      body: {
        photo_url: photoUrl,
        mission_type: missionType,
      },
    });

    console.log('[Verification] Edge Function response:', { data, error });

    if (error) {
      console.error('[Verification] Edge Function error:', error);
      return {
        success: false,
        error: `Edge Function Error: ${error.message}`,
      };
    }

    if (!data) {
      console.error('[Verification] No data returned from Edge Function');
      return {
        success: false,
        error: 'No response from verification service',
      };
    }

    return {
      success: true,
      verdict: data.verdict,
      confidence: data.confidence,
      reasoning: data.reasoning,
    };
  } catch (error) {
    console.error('[Verification] Caught exception:', error);
    return {
      success: false,
      error: (error as Error).message || 'Verification failed',
    };
  }
}

/**
 * Record election day verification in database
 * @param userId - User's ID
 * @param photoUrl - URL of the verified photo
 * @param votedAllEndorsed - Whether user voted for all endorsed candidates
 */
export async function recordElectionVerification(
  userId: string,
  photoUrl: string,
  votedAllEndorsed: boolean = false
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error } = await supabase
      .from('election_day_verifications')
      .insert({
        user_id: userId,
        verification_photo_url: photoUrl,
        voted_all_endorsed: votedAllEndorsed,
      });

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}

/**
 * Check if user has already completed election day verification
 */
export async function checkElectionVerification(
  userId: string
): Promise<{ verified: boolean; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('election_day_verifications')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is expected if not verified yet
      return { verified: false, error: new Error(error.message) };
    }

    return { verified: !!data, error: null };
  } catch (error) {
    return { verified: false, error: error as Error };
  }
}

/**
 * Award XP to user for completing a mission
 */
export async function awardMissionXP(
  userId: string,
  xpAmount: number
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('xp, level')
      .eq('id', userId)
      .single();

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    const newXP = (data.xp || 0) + xpAmount;
    
    // Simple leveling: 100 XP per level
    const newLevel = Math.floor(newXP / 100) + 1;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        xp: newXP,
        level: newLevel,
      })
      .eq('id', userId);

    if (updateError) {
      return { success: false, error: new Error(updateError.message) };
    }

    return { success: true, error: null };
  } catch (error) {
    return { success: false, error: error as Error };
  }
}
