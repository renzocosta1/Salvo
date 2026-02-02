-- Migration: Add recruiting/invites schema
-- Run this in Supabase SQL Editor

-- Add recruiting columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS contacts_synced_at TIMESTAMPTZ;

-- Create invites table
CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code TEXT NOT NULL UNIQUE,
  invitee_phone_e164 TEXT,
  invitee_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  xp_awarded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  expired_at TIMESTAMPTZ
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_invites_inviter ON invites(inviter_id);
CREATE INDEX IF NOT EXISTS idx_invites_code ON invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_invites_phone ON invites(invitee_phone_e164);
CREATE INDEX IF NOT EXISTS idx_invites_status ON invites(status);
CREATE INDEX IF NOT EXISTS idx_profiles_invite_code ON profiles(invite_code);
CREATE INDEX IF NOT EXISTS idx_profiles_invited_by ON profiles(invited_by);

-- Enable RLS on invites table
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invites
-- Users can view their own sent invites
CREATE POLICY "Users can view their own invites"
ON invites FOR SELECT
USING (auth.uid() = inviter_id);

-- Users can create invites
CREATE POLICY "Users can create invites"
ON invites FOR INSERT
WITH CHECK (auth.uid() = inviter_id);

-- Users can update their own invites (for accepting)
CREATE POLICY "Users can update their own invites"
ON invites FOR UPDATE
USING (auth.uid() = inviter_id OR auth.uid() = invitee_user_id);

-- Function to generate unique invite code
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Avoid confusing chars
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Function to auto-generate invite code for new users
CREATE OR REPLACE FUNCTION auto_generate_user_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    -- Keep trying until we get a unique code
    LOOP
      NEW.invite_code := generate_invite_code();
      BEGIN
        -- Try to insert, will fail if code already exists
        PERFORM 1 FROM profiles WHERE invite_code = NEW.invite_code;
        IF NOT FOUND THEN
          EXIT;
        END IF;
      END;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate invite code on profile insert
DROP TRIGGER IF EXISTS trigger_auto_generate_invite_code ON profiles;
CREATE TRIGGER trigger_auto_generate_invite_code
BEFORE INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION auto_generate_user_invite_code();

-- Function to award XP for successful invite
CREATE OR REPLACE FUNCTION award_invite_xp(inviter_user_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Award 50 XP for successful invite
  UPDATE profiles
  SET xp = xp + 50
  WHERE id = inviter_user_id;
  
  -- Log the XP award
  INSERT INTO xp_events (user_id, amount, event_type, description)
  VALUES (
    inviter_user_id,
    50,
    'invite_accepted',
    'Friend joined using your invite code'
  );
  
  -- Recompute rank if xp_events table exists
  -- This will trigger any rank update logic
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE invites IS 'Tracks invitation codes and their status for the recruiting system';
COMMENT ON COLUMN profiles.invite_code IS 'Unique invite code for this user (auto-generated)';
COMMENT ON COLUMN profiles.invited_by IS 'User ID of the person who invited this user';
COMMENT ON COLUMN profiles.contacts_synced_at IS 'Last time user synced their contacts for recruiting';
COMMENT ON COLUMN invites.inviter_id IS 'User who created the invite';
COMMENT ON COLUMN invites.invite_code IS 'Unique 6-character invite code';
COMMENT ON COLUMN invites.invitee_phone_e164 IS 'Phone number of invitee (E.164 format)';
COMMENT ON COLUMN invites.invitee_user_id IS 'User ID if invite was accepted';
COMMENT ON COLUMN invites.status IS 'Invite status: pending, accepted, or expired';
COMMENT ON COLUMN invites.xp_awarded IS 'Whether XP reward has been given to inviter';
