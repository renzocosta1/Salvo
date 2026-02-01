import { supabase } from '../supabase';

export interface Mission {
  id: string;
  directive_id: string | null;
  party_id: string;
  title: string;
  description: string | null;
  xp_reward: number;
  requires_photo: boolean;
  created_at: string;
}

export interface UserMission {
  id: string;
  user_id: string;
  mission_id: string;
  status: 'pending' | 'submitted' | 'verified' | 'rejected';
  proof_photo_url: string | null;
  submitted_at: string | null;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MissionWithUserStatus extends Mission {
  user_mission?: UserMission;
}

/**
 * Fetch all missions for the user's party
 */
export async function fetchMissionsForParty(
  partyId: string,
  userId: string
): Promise<{ data: MissionWithUserStatus[] | null; error: Error | null }> {
  try {
    // Fetch missions for the party
    const { data: missions, error: missionsError } = await supabase
      .from('missions')
      .select('*')
      .eq('party_id', partyId)
      .order('created_at', { ascending: false });

    if (missionsError) {
      return { data: null, error: new Error(missionsError.message) };
    }

    if (!missions || missions.length === 0) {
      return { data: [], error: null };
    }

    // Fetch user's mission status for each mission
    const missionIds = missions.map(m => m.id);
    const { data: userMissions, error: userMissionsError } = await supabase
      .from('user_missions')
      .select('*')
      .eq('user_id', userId)
      .in('mission_id', missionIds);

    if (userMissionsError) {
      console.error('Error fetching user missions:', userMissionsError);
    }

    // Create a map of mission_id to user_mission
    const userMissionMap = new Map<string, UserMission>();
    userMissions?.forEach(um => {
      userMissionMap.set(um.mission_id, um);
    });

    // Combine data
    const missionsWithStatus: MissionWithUserStatus[] = missions.map(mission => ({
      ...mission,
      user_mission: userMissionMap.get(mission.id),
    }));

    return { data: missionsWithStatus, error: null };
  } catch (error) {
    console.error('Unexpected error in fetchMissionsForParty:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Start a mission (create user_mission record with status 'pending')
 */
export async function startMission(
  userId: string,
  missionId: string
): Promise<{ data: UserMission | null; error: Error | null }> {
  try {
    const { data, error: insertError } = await supabase
      .from('user_missions')
      .insert({
        user_id: userId,
        mission_id: missionId,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      return { data: null, error: new Error(insertError.message) };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Unexpected error in startMission:', error);
    return { data: null, error: error as Error };
  }
}

/**
 * Upload mission proof photo to Supabase Storage
 */
export async function uploadMissionProof(
  userMissionId: string,
  userId: string,
  fileUri: string
): Promise<{ url: string | null; error: Error | null }> {
  try {
    // Convert file URI to blob
    const response = await fetch(fileUri);
    const blob = await response.blob();
    
    // Generate unique filename
    const fileExt = fileUri.split('.').pop() || 'jpg';
    const fileName = `${userId}/${userMissionId}_${Date.now()}.${fileExt}`;

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from('mission-proofs')
      .upload(fileName, blob, {
        contentType: `image/${fileExt}`,
        upsert: false,
      });

    if (uploadError) {
      return { url: null, error: new Error(uploadError.message) };
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('mission-proofs')
      .getPublicUrl(fileName);

    return { url: publicUrl, error: null };
  } catch (error) {
    console.error('Unexpected error in uploadMissionProof:', error);
    return { url: null, error: error as Error };
  }
}

/**
 * Submit mission proof (update user_mission with photo URL and status 'submitted')
 */
export async function submitMissionProof(
  userMissionId: string,
  proofPhotoUrl: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const { error: updateError } = await supabase
      .from('user_missions')
      .update({
        proof_photo_url: proofPhotoUrl,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', userMissionId);

    if (updateError) {
      return { success: false, error: new Error(updateError.message) };
    }

    return { success: true, error: null };
  } catch (error) {
    console.error('Unexpected error in submitMissionProof:', error);
    return { success: false, error: error as Error };
  }
}

/**
 * Get a single mission by ID with user status
 */
export async function fetchMissionById(
  missionId: string,
  userId: string
): Promise<{ data: MissionWithUserStatus | null; error: Error | null }> {
  try {
    const { data: mission, error: missionError } = await supabase
      .from('missions')
      .select('*')
      .eq('id', missionId)
      .single();

    if (missionError) {
      return { data: null, error: new Error(missionError.message) };
    }

    // Fetch user's mission status
    const { data: userMission, error: userMissionError } = await supabase
      .from('user_missions')
      .select('*')
      .eq('user_id', userId)
      .eq('mission_id', missionId)
      .maybeSingle();

    if (userMissionError) {
      console.error('Error fetching user mission:', userMissionError);
    }

    return {
      data: {
        ...mission,
        user_mission: userMission || undefined,
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error: error as Error };
  }
}
