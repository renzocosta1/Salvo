-- ============================================================================
-- Migration 005: Alpha Schema for Maryland 2026 Primary
-- ============================================================================
-- Description: Adds geographic targeting, voter verification, Maryland ballot
--              system, contact sync, and pre-loaded tactical missions support
-- Date: 2026-02-05
-- ============================================================================

-- ============================================================================
-- PART 1: GEOGRAPHIC LOCK (Address & District Assignment)
-- ============================================================================

-- Add geographic fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_line2 TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'Maryland';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS county TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS legislative_district TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS congressional_district TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS latitude NUMERIC;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longitude NUMERIC;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ;

-- Add indexes for geographic queries
CREATE INDEX IF NOT EXISTS idx_profiles_county ON profiles(county);
CREATE INDEX IF NOT EXISTS idx_profiles_legislative_district ON profiles(legislative_district);
CREATE INDEX IF NOT EXISTS idx_profiles_congressional_district ON profiles(congressional_district);

-- ============================================================================
-- PART 2: VOTER VERIFICATION (The Gate)
-- ============================================================================

-- Add voter verification tracking to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS voter_registration_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS voter_registration_verified_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS voter_registration_photo_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS callsign TEXT;

-- Index for verification queries
CREATE INDEX IF NOT EXISTS idx_profiles_voter_verified ON profiles(voter_registration_verified);

-- ============================================================================
-- PART 3: MARYLAND BALLOT SYSTEM (Digital Ballot)
-- ============================================================================

-- Main ballots table for Maryland 2026 Primary
CREATE TABLE IF NOT EXISTS md_ballots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  election_date DATE NOT NULL DEFAULT '2026-06-23',
  county TEXT NOT NULL,
  legislative_district TEXT NOT NULL,
  congressional_district TEXT NOT NULL,
  election_name TEXT NOT NULL DEFAULT '2026 Maryland Republican Primary',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(county, legislative_district, congressional_district)
);

-- Ballot races (Governor, Senate, House, etc.)
CREATE TABLE IF NOT EXISTS md_ballot_races (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ballot_id UUID NOT NULL REFERENCES md_ballots(id) ON DELETE CASCADE,
  race_title TEXT NOT NULL,
  race_type TEXT NOT NULL CHECK (race_type IN ('federal', 'state', 'county', 'local', 'judicial', 'ballot_question')),
  position_order INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Candidates within each race
CREATE TABLE IF NOT EXISTS md_ballot_candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  race_id UUID NOT NULL REFERENCES md_ballot_races(id) ON DELETE CASCADE,
  candidate_name TEXT NOT NULL,
  candidate_party TEXT DEFAULT 'Republican',
  hard_party_endorsed BOOLEAN NOT NULL DEFAULT FALSE,
  candidate_order INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User ballot commitments (track voting intentions)
CREATE TABLE IF NOT EXISTS user_ballot_commitments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  race_id UUID NOT NULL REFERENCES md_ballot_races(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES md_ballot_candidates(id) ON DELETE CASCADE,
  committed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, race_id)
);

-- Election Day verification (I Voted sticker proof)
CREATE TABLE IF NOT EXISTS election_day_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verification_photo_url TEXT NOT NULL,
  voted_all_endorsed BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(user_id)
);

-- Indexes for ballot queries
CREATE INDEX IF NOT EXISTS idx_md_ballots_county ON md_ballots(county);
CREATE INDEX IF NOT EXISTS idx_md_ballots_legislative_district ON md_ballots(legislative_district);
CREATE INDEX IF NOT EXISTS idx_md_ballot_races_ballot_id ON md_ballot_races(ballot_id);
CREATE INDEX IF NOT EXISTS idx_md_ballot_candidates_race_id ON md_ballot_candidates(race_id);
CREATE INDEX IF NOT EXISTS idx_user_ballot_commitments_user_id ON user_ballot_commitments(user_id);
CREATE INDEX IF NOT EXISTS idx_election_day_verifications_user_id ON election_day_verifications(user_id);

-- ============================================================================
-- PART 4: PRE-LOADED TACTICAL MISSIONS
-- ============================================================================

-- Add mission type fields to directives table
ALTER TABLE directives ADD COLUMN IF NOT EXISTS mission_type TEXT CHECK (mission_type IN (
  'ENLISTMENT', 'MAIL_IN_STRIKE', 'EARLY_RAID', 'ELECTION_DAY_SIEGE'
));
ALTER TABLE directives ADD COLUMN IF NOT EXISTS mission_deadline DATE;
ALTER TABLE directives ADD COLUMN IF NOT EXISTS requires_gps BOOLEAN DEFAULT FALSE;
ALTER TABLE directives ADD COLUMN IF NOT EXISTS google_maps_link TEXT;

-- ============================================================================
-- PART 5: CONTACT SYNC (Relational Raid)
-- ============================================================================

-- Synced contacts table for relational recruitment
CREATE TABLE IF NOT EXISTS synced_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,
  contact_name TEXT,
  voter_status TEXT CHECK (voter_status IN ('in_salvo', 'registered_not_in_app', 'not_registered')),
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, contact_phone)
);

-- Index for contact sync queries
CREATE INDEX IF NOT EXISTS idx_synced_contacts_user_id ON synced_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_synced_contacts_phone ON synced_contacts(contact_phone);
CREATE INDEX IF NOT EXISTS idx_synced_contacts_status ON synced_contacts(voter_status);

-- ============================================================================
-- PART 6: ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE md_ballots ENABLE ROW LEVEL SECURITY;
ALTER TABLE md_ballot_races ENABLE ROW LEVEL SECURITY;
ALTER TABLE md_ballot_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ballot_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE election_day_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE synced_contacts ENABLE ROW LEVEL SECURITY;

-- Ballots: Everyone can read
CREATE POLICY IF NOT EXISTS "Ballots are publicly readable"
  ON md_ballots FOR SELECT
  USING (true);

-- Ballot races: Everyone can read
CREATE POLICY IF NOT EXISTS "Ballot races are publicly readable"
  ON md_ballot_races FOR SELECT
  USING (true);

-- Ballot candidates: Everyone can read
CREATE POLICY IF NOT EXISTS "Ballot candidates are publicly readable"
  ON md_ballot_candidates FOR SELECT
  USING (true);

-- User ballot commitments: Users can only see/manage their own
CREATE POLICY IF NOT EXISTS "Users can view their own ballot commitments"
  ON user_ballot_commitments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own ballot commitments"
  ON user_ballot_commitments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own ballot commitments"
  ON user_ballot_commitments FOR UPDATE
  USING (auth.uid() = user_id);

-- Election Day verifications: Users can only see/manage their own
CREATE POLICY IF NOT EXISTS "Users can view their own election verification"
  ON election_day_verifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own election verification"
  ON election_day_verifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Synced contacts: Users can only see/manage their own
CREATE POLICY IF NOT EXISTS "Users can view their own synced contacts"
  ON synced_contacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own synced contacts"
  ON synced_contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own synced contacts"
  ON synced_contacts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own synced contacts"
  ON synced_contacts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- PART 7: UPDATED_AT TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at columns
DROP TRIGGER IF EXISTS update_md_ballots_updated_at ON md_ballots;
CREATE TRIGGER update_md_ballots_updated_at
  BEFORE UPDATE ON md_ballots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_md_ballot_races_updated_at ON md_ballot_races;
CREATE TRIGGER update_md_ballot_races_updated_at
  BEFORE UPDATE ON md_ballot_races
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_md_ballot_candidates_updated_at ON md_ballot_candidates;
CREATE TRIGGER update_md_ballot_candidates_updated_at
  BEFORE UPDATE ON md_ballot_candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_synced_contacts_updated_at ON synced_contacts;
CREATE TRIGGER update_synced_contacts_updated_at
  BEFORE UPDATE ON synced_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Run this migration in Supabase SQL Editor
-- 2. Verify tables created: md_ballots, md_ballot_races, md_ballot_candidates, etc.
-- 3. Test RLS policies by querying as authenticated user
-- 4. Seed initial data with migration 006
-- ============================================================================
