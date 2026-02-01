-- =============================================================================
-- Salvo — Supabase Schema (Single Source of Truth)
-- =============================================================================
-- Run this in Supabase SQL Editor.
-- Includes: tables, RLS policies, triggers, Rank/XP functions.
-- H3 tiles: no pre-seed; created on first check-in.
-- Raid rate limit: 10 per 60s per user (enforced in RLS).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- Contract versions (Oath text versioning)
-- -----------------------------------------------------------------------------
CREATE TABLE contract_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_tag TEXT NOT NULL UNIQUE,
  body_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Ranks (meritocratic progression)
-- -----------------------------------------------------------------------------
CREATE TABLE ranks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  level_min INT NOT NULL,
  level_max INT NOT NULL,
  is_manually_approved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Parties (root: The Hard Party)
-- -----------------------------------------------------------------------------
CREATE TABLE parties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  general_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Warrior Bands (sub-units; Captains)
-- -----------------------------------------------------------------------------
CREATE TABLE warrior_bands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  captain_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(party_id, name)
);

-- -----------------------------------------------------------------------------
-- Profiles (extends auth.users; Oath + Party/Band + Role + Rank/XP)
-- -----------------------------------------------------------------------------
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  party_id UUID REFERENCES parties(id),
  warrior_band_id UUID REFERENCES warrior_bands(id),
  role TEXT NOT NULL DEFAULT 'warrior' CHECK (role IN ('general', 'captain', 'warrior')),
  rank_id UUID REFERENCES ranks(id),
  level INT NOT NULL DEFAULT 0,
  xp INT NOT NULL DEFAULT 0,
  oath_signed_at TIMESTAMPTZ,
  contract_version_id UUID REFERENCES contract_versions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN profiles.oath_signed_at IS 'NULL = Oath screen only; set when user signs (scroll-to-bottom + signature)';
COMMENT ON COLUMN profiles.contract_version_id IS 'Reference to contract_versions row for the Oath text they signed';

-- -----------------------------------------------------------------------------
-- Directives (Command Feed; one-way from General)
-- -----------------------------------------------------------------------------
CREATE TABLE directives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  body TEXT,
  target_goal INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scoping: empty = party-wide; rows = only those bands see/contribute
CREATE TABLE directive_bands (
  directive_id UUID NOT NULL REFERENCES directives(id) ON DELETE CASCADE,
  warrior_band_id UUID NOT NULL REFERENCES warrior_bands(id) ON DELETE CASCADE,
  PRIMARY KEY (directive_id, warrior_band_id)
);

-- -----------------------------------------------------------------------------
-- Salvos (per-directive; drives Pillage Meter). Rate limit: 10 per 60s per user.
-- -----------------------------------------------------------------------------
CREATE TABLE salvos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  directive_id UUID NOT NULL REFERENCES directives(id) ON DELETE CASCADE,
  action_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_salvos_directive_id ON salvos(directive_id);
CREATE INDEX idx_salvos_user_created ON salvos(user_id, created_at);

-- -----------------------------------------------------------------------------
-- Missions (quests; link to directive optional)
-- -----------------------------------------------------------------------------
CREATE TABLE missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  directive_id UUID REFERENCES directives(id),
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  xp_reward INT NOT NULL DEFAULT 0,
  requires_photo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- User missions (proof → async AI verification via Edge Function + Gemini)
-- -----------------------------------------------------------------------------
CREATE TABLE user_missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES missions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'verified', 'rejected')),
  proof_photo_url TEXT,
  submitted_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  verified_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_missions_user_id ON user_missions(user_id);
CREATE INDEX idx_user_missions_status ON user_missions(status);

-- -----------------------------------------------------------------------------
-- H3 Tiles (Fog of War). No pre-seed; created on first check-in.
-- -----------------------------------------------------------------------------
CREATE TABLE h3_tiles (
  h3_index TEXT PRIMARY KEY,
  region TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'fog' CHECK (status IN ('fog', 'revealed')),
  revealed_at TIMESTAMPTZ,
  revealed_by_user_id UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_h3_tiles_region_status ON h3_tiles(region, status);

-- -----------------------------------------------------------------------------
-- Check-ins (reveal H3 hex). Trigger: ensure h3_tiles row exists and set revealed.
-- -----------------------------------------------------------------------------
CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  h3_index TEXT NOT NULL,
  region TEXT DEFAULT 'Montgomery County',
  event_type TEXT CHECK (event_type IN ('check_in', 'flag')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_check_ins_h3_index ON check_ins(h3_index);

CREATE OR REPLACE FUNCTION ensure_h3_tile_revealed()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO h3_tiles (h3_index, region, status, revealed_at, revealed_by_user_id, updated_at)
  VALUES (NEW.h3_index, COALESCE(NEW.region, 'Montgomery County'), 'revealed', NOW(), NEW.user_id, NOW())
  ON CONFLICT (h3_index) DO UPDATE SET
    status = 'revealed',
    revealed_at = COALESCE(h3_tiles.revealed_at, NOW()),
    revealed_by_user_id = COALESCE(h3_tiles.revealed_by_user_id, NEW.user_id),
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_check_in_reveal_tile
  AFTER INSERT ON check_ins FOR EACH ROW EXECUTE PROCEDURE ensure_h3_tile_revealed();

-- -----------------------------------------------------------------------------
-- updated_at triggers
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_user_missions_updated_at BEFORE UPDATE ON user_missions FOR EACH ROW EXECUTE PROCEDURE set_updated_at();
CREATE TRIGGER tr_h3_tiles_updated_at BEFORE UPDATE ON h3_tiles FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- -----------------------------------------------------------------------------
-- Rank update function: given user_id, recompute level from XP and set rank_id.
-- Call after awarding XP (e.g. when user_mission becomes verified).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION recompute_user_rank(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_xp INT;
  v_level INT;
  v_rank_id UUID;
BEGIN
  SELECT xp INTO v_xp FROM profiles WHERE id = p_user_id;
  IF v_xp IS NULL THEN RETURN; END IF;

  v_level := floor(sqrt(greatest(0, v_xp)::numeric / 100.0))::int;

  SELECT id INTO v_rank_id FROM ranks
  WHERE level_min <= v_level AND (level_max > v_level OR level_max = v_level)
  ORDER BY level_min DESC LIMIT 1;

  UPDATE profiles SET level = v_level, rank_id = v_rank_id, updated_at = NOW() WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Award XP and recompute rank (call from Edge Function after Gemini verification).
CREATE OR REPLACE FUNCTION award_mission_xp_and_recompute_rank(
  p_user_mission_id UUID,
  p_xp_reward INT
)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id FROM user_missions WHERE id = p_user_mission_id;
  IF v_user_id IS NULL THEN RETURN; END IF;

  UPDATE profiles SET xp = xp + p_xp_reward, updated_at = NOW() WHERE id = v_user_id;
  PERFORM recompute_user_rank(v_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -----------------------------------------------------------------------------
-- Raid rate limit: 10 salvos per 60 seconds per user.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION can_user_submit_salvo(p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT (SELECT COUNT(*) FROM salvos WHERE user_id = p_user_id AND created_at > NOW() - INTERVAL '60 seconds') < 10;
$$ LANGUAGE sql STABLE;

-- -----------------------------------------------------------------------------
-- RLS: Enable on all tables
-- -----------------------------------------------------------------------------
ALTER TABLE contract_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
ALTER TABLE warrior_bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE directives ENABLE ROW LEVEL SECURITY;
ALTER TABLE directive_bands ENABLE ROW LEVEL SECURITY;
ALTER TABLE salvos ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE h3_tiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contract_versions_select" ON contract_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "ranks_select" ON ranks FOR SELECT TO authenticated USING (true);
CREATE POLICY "parties_select" ON parties FOR SELECT TO authenticated USING (true);
CREATE POLICY "warrior_bands_select" ON warrior_bands FOR SELECT TO authenticated USING (true);

CREATE POLICY "profiles_select_own" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE POLICY "directives_select" ON directives FOR SELECT TO authenticated USING (true);
CREATE POLICY "directives_insert_general_only" ON directives FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'general' AND party_id = directives.party_id));
CREATE POLICY "directives_update_general_only" ON directives FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'general' AND party_id = directives.party_id));

CREATE POLICY "directive_bands_select" ON directive_bands FOR SELECT TO authenticated USING (true);
CREATE POLICY "directive_bands_insert" ON directive_bands FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles p JOIN directives d ON d.party_id = p.party_id WHERE p.id = auth.uid() AND p.role = 'general' AND d.id = directive_bands.directive_id));

CREATE POLICY "salvos_select" ON salvos FOR SELECT TO authenticated USING (true);
CREATE POLICY "salvos_insert" ON salvos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND can_user_submit_salvo(auth.uid()) AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND oath_signed_at IS NOT NULL));

CREATE POLICY "missions_select" ON missions FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_missions_select_own" ON user_missions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_missions_insert_own" ON user_missions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_missions_update_own" ON user_missions FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "h3_tiles_select" ON h3_tiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "h3_tiles_insert" ON h3_tiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "h3_tiles_update" ON h3_tiles FOR UPDATE TO authenticated USING (true);

CREATE POLICY "check_ins_select" ON check_ins FOR SELECT TO authenticated USING (true);
CREATE POLICY "check_ins_insert" ON check_ins FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND oath_signed_at IS NOT NULL));

-- -----------------------------------------------------------------------------
-- Seed: contract_versions (one row for initial Oath), ranks
-- -----------------------------------------------------------------------------
INSERT INTO contract_versions (version_tag, body_text) VALUES ('v1', 'The Oath text goes here. Replace with actual contract body.')
ON CONFLICT (version_tag) DO NOTHING;

INSERT INTO ranks (name, level_min, level_max, is_manually_approved) VALUES
  ('Recruit', 0, 4, false),
  ('Warrior', 5, 9, false),
  ('Centurion', 10, 99, true)
ON CONFLICT (name) DO NOTHING;
