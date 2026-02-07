-- =============================================================================
-- Migration 008: Contact Matching Logic for Recruitment
-- =============================================================================
-- Creates functions to match synced_contacts against invites and update status
-- Supports Task 27: Relational Raid Contact Sync & Recruitment Engine
-- =============================================================================

-- Function to hash phone number (SHA-256)
CREATE OR REPLACE FUNCTION hash_phone_number(phone_e164 TEXT)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  result := encode(digest(phone_e164, 'sha256'), 'hex');
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update contact match status based on invites
CREATE OR REPLACE FUNCTION update_contact_match_status(recruiter_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Update synced_contacts based on invites
  -- Match by hashing the invite phone number and comparing to synced_contacts
  
  UPDATE synced_contacts sc
  SET 
    voter_status = CASE
      -- Green: Accepted invite and verified (oath signed + address set)
      WHEN i.status = 'accepted' 
           AND i.invitee_user_id IS NOT NULL
           AND p.oath_signed_at IS NOT NULL 
           AND p.address_line1 IS NOT NULL
      THEN 'in_salvo'
      
      -- Yellow: Accepted invite but not yet verified
      WHEN i.status = 'accepted' 
           AND i.invitee_user_id IS NOT NULL
      THEN 'registered_not_in_app'
      
      -- Gray: Not invited or invite pending
      ELSE 'not_registered'
    END,
    invited_at = COALESCE(sc.invited_at, i.created_at),
    joined_at = CASE
      WHEN i.status = 'accepted' THEN i.accepted_at
      ELSE sc.joined_at
    END,
    verified_at = CASE
      WHEN i.status = 'accepted' 
           AND p.oath_signed_at IS NOT NULL 
           AND p.address_line1 IS NOT NULL
      THEN p.oath_signed_at
      ELSE sc.verified_at
    END
  FROM invites i
  LEFT JOIN profiles p ON p.id = i.invitee_user_id
  WHERE sc.user_id = recruiter_user_id
    AND sc.contact_phone = hash_phone_number(i.invitee_phone_e164)
    AND i.inviter_id = recruiter_user_id;
    
END;
$$ LANGUAGE plpgsql;

-- Function to check contact status (for UI)
CREATE OR REPLACE FUNCTION get_contacts_with_status(recruiter_user_id UUID)
RETURNS TABLE (
  contact_id UUID,
  contact_name TEXT,
  contact_phone_hash TEXT,
  status TEXT,
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sc.id as contact_id,
    sc.contact_name,
    sc.contact_phone as contact_phone_hash,
    COALESCE(sc.voter_status, 'not_registered') as status,
    sc.invited_at,
    sc.joined_at,
    sc.verified_at
  FROM synced_contacts sc
  WHERE sc.user_id = recruiter_user_id
  ORDER BY sc.contact_name ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-update contact status when invite is accepted
CREATE OR REPLACE FUNCTION trigger_update_contact_status_on_invite()
RETURNS TRIGGER AS $$
BEGIN
  -- When an invite is accepted, update the corresponding synced_contact
  IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
    PERFORM update_contact_match_status(NEW.inviter_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_contact_status_on_invite ON invites;
CREATE TRIGGER update_contact_status_on_invite
  AFTER UPDATE ON invites
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_contact_status_on_invite();

-- Update award_invite_xp function to give 100 XP (was 50)
-- and only award when invitee completes verification
CREATE OR REPLACE FUNCTION award_invite_xp(inviter_user_id UUID, invitee_user_id_param UUID)
RETURNS VOID AS $$
DECLARE
  invitee_verified BOOLEAN;
BEGIN
  -- Check if invitee has completed verification (oath + address)
  SELECT (oath_signed_at IS NOT NULL AND address_line1 IS NOT NULL)
  INTO invitee_verified
  FROM profiles
  WHERE id = invitee_user_id_param;
  
  -- Only award XP if invitee is verified
  IF invitee_verified THEN
    -- Award 100 XP for successful verified invite
    UPDATE profiles
    SET xp = xp + 100
    WHERE id = inviter_user_id;
    
    -- Log the XP award
    INSERT INTO xp_events (user_id, amount, event_type, description)
    VALUES (
      inviter_user_id,
      100,
      'invite_verified',
      'Friend completed verification using your invite code'
    );
    
    -- Mark XP as awarded on the invite
    UPDATE invites
    SET xp_awarded = TRUE
    WHERE inviter_id = inviter_user_id
      AND invitee_user_id = invitee_user_id_param
      AND xp_awarded = FALSE;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger to award XP when invitee completes verification
CREATE OR REPLACE FUNCTION trigger_award_xp_on_verification()
RETURNS TRIGGER AS $$
BEGIN
  -- When a profile is updated and both oath + address are now set
  IF NEW.oath_signed_at IS NOT NULL 
     AND NEW.address_line1 IS NOT NULL
     AND (OLD.oath_signed_at IS NULL OR OLD.address_line1 IS NULL) THEN
    -- Check if this user was invited
    IF NEW.invited_by IS NOT NULL THEN
      PERFORM award_invite_xp(NEW.invited_by, NEW.id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS award_xp_on_verification ON profiles;
CREATE TRIGGER award_xp_on_verification
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION trigger_award_xp_on_verification();

-- Comments
COMMENT ON FUNCTION hash_phone_number IS 'Hash phone number for privacy-safe matching';
COMMENT ON FUNCTION update_contact_match_status IS 'Update synced_contacts voter_status based on invite matches';
COMMENT ON FUNCTION get_contacts_with_status IS 'Get all contacts for a user with their current status';
COMMENT ON FUNCTION award_invite_xp IS 'Award 100 XP to inviter when invitee completes verification (oath + address)';
