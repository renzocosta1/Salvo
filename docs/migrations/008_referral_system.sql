-- =============================================================================
-- Migration 008: Referral System for Task 27
-- =============================================================================
-- Adds referral tracking capabilities with XP rewards for successful referrals

-- Add referral_code to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.referral_code IS 'Unique code for this user to share with friends (e.g., "HARD-ABC123")';
COMMENT ON COLUMN profiles.referred_by_user_id IS 'User ID of the recruiter who invited this user';
COMMENT ON COLUMN profiles.onboarding_completed_at IS 'Timestamp when user completed onboarding (oath + address entry)';

-- Create function to generate unique referral codes
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate format: HARD-XXXXX (5 random chars)
    new_code := 'HARD-' || upper(substring(md5(random()::text) from 1 for 5));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM profiles WHERE referral_code = new_code) INTO code_exists;
    
    -- If unique, return it
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create referrals tracking table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recruiter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code TEXT NOT NULL,
  xp_awarded BOOLEAN NOT NULL DEFAULT FALSE,
  xp_awarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(recruiter_id, invitee_id)
);

COMMENT ON TABLE referrals IS 'Tracks successful referrals and XP award status';
COMMENT ON COLUMN referrals.xp_awarded IS 'TRUE when recruiter has been awarded +100 XP';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_referrals_recruiter ON referrals(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_referrals_invitee ON referrals(invitee_id);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);

-- Backfill existing users with referral codes
UPDATE profiles
SET referral_code = generate_referral_code()
WHERE referral_code IS NULL;

-- Trigger to auto-generate referral code for new users
CREATE OR REPLACE FUNCTION auto_generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_referral_code
BEFORE INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION auto_generate_referral_code();

-- Function to award XP for successful referral
CREATE OR REPLACE FUNCTION award_referral_xp()
RETURNS TRIGGER AS $$
DECLARE
  recruiter_user_id UUID;
BEGIN
  -- Check if onboarding was just completed (from NULL to non-NULL)
  IF OLD.onboarding_completed_at IS NULL AND NEW.onboarding_completed_at IS NOT NULL THEN
    
    -- Check if this user was referred by someone
    IF NEW.referred_by_user_id IS NOT NULL THEN
      recruiter_user_id := NEW.referred_by_user_id;
      
      -- Insert referral record
      INSERT INTO referrals (recruiter_id, invitee_id, referral_code, xp_awarded, xp_awarded_at)
      VALUES (recruiter_user_id, NEW.id, NEW.referral_code, TRUE, NOW())
      ON CONFLICT (recruiter_id, invitee_id) 
      DO UPDATE SET 
        xp_awarded = TRUE,
        xp_awarded_at = NOW()
      WHERE referrals.xp_awarded = FALSE;
      
      -- Award +100 XP to the recruiter
      UPDATE profiles
      SET 
        xp = xp + 100,
        updated_at = NOW()
      WHERE id = recruiter_user_id;
      
      -- Log the XP award
      RAISE NOTICE 'Awarded +100 XP to recruiter % for invitee %', recruiter_user_id, NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically award XP when invitee completes onboarding
CREATE TRIGGER trigger_award_referral_xp
AFTER UPDATE OF onboarding_completed_at ON profiles
FOR EACH ROW
EXECUTE FUNCTION award_referral_xp();

-- Enable RLS on referrals table
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see their own referrals (where they are the recruiter)
CREATE POLICY "Users can view their own referrals"
ON referrals
FOR SELECT
USING (auth.uid() = recruiter_id);

-- RLS Policy: System can insert referral records
CREATE POLICY "System can insert referrals"
ON referrals
FOR INSERT
WITH CHECK (true);

-- Grant permissions
GRANT ALL ON referrals TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =============================================================================
-- Verification Queries
-- =============================================================================

-- Check that referral codes are generated
-- SELECT id, display_name, referral_code, referred_by_user_id FROM profiles LIMIT 10;

-- Check referrals table
-- SELECT * FROM referrals;
