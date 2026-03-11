-- =====================================================
-- Add Squad Features & Weekly Check-In Support
-- =====================================================
-- This adds database support for:
-- 1. Weekly check-in system with streak tracking
-- 2. Squad leaderboards (district, county, state)
-- 3. Team stats and rankings
--
-- Run this ONCE to add new fields to profiles table
-- =====================================================

-- Add weekly check-in fields to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_check_in_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS check_in_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_check_ins INTEGER DEFAULT 0;

-- Create index for leaderboard queries (critical for performance)
CREATE INDEX IF NOT EXISTS idx_profiles_xp_leaderboard 
  ON profiles(xp DESC, level DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_district_xp 
  ON profiles(legislative_district, xp DESC) 
  WHERE legislative_district IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_county_xp 
  ON profiles(county, xp DESC) 
  WHERE county IS NOT NULL;

-- =====================================================
-- Function: Claim Weekly Check-In
-- =====================================================
CREATE OR REPLACE FUNCTION claim_weekly_check_in(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_last_check_in TIMESTAMP WITH TIME ZONE;
  v_current_streak INTEGER;
  v_hours_since_check_in NUMERIC;
  v_base_xp INTEGER := 50;
  v_streak_bonus INTEGER := 0;
  v_total_xp INTEGER;
BEGIN
  -- Get current check-in data
  SELECT last_check_in_at, check_in_streak
  INTO v_last_check_in, v_current_streak
  FROM profiles
  WHERE id = p_user_id;

  -- Calculate hours since last check-in
  IF v_last_check_in IS NOT NULL THEN
    v_hours_since_check_in := EXTRACT(EPOCH FROM (NOW() - v_last_check_in)) / 3600;
  ELSE
    v_hours_since_check_in := 999; -- First check-in ever
  END IF;

  -- Check if user can claim (must be at least 7 days / 168 hours)
  IF v_hours_since_check_in < 168 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'TOO_SOON',
      'message', format('You can check in again in %s hours', ROUND(168 - v_hours_since_check_in)),
      'hours_remaining', ROUND(168 - v_hours_since_check_in),
      'next_check_in_at', v_last_check_in + INTERVAL '168 hours'
    );
  END IF;

  -- Determine if streak continues (within 14 days / 336 hours)
  IF v_hours_since_check_in > 336 THEN
    -- Missed the window, reset streak
    v_current_streak := 0;
  END IF;

  -- Calculate streak bonus (+10 XP per week, max +100 XP)
  v_streak_bonus := LEAST(v_current_streak * 10, 100);
  v_total_xp := v_base_xp + v_streak_bonus;

  -- Update profile
  UPDATE profiles
  SET 
    last_check_in_at = NOW(),
    check_in_streak = v_current_streak + 1,
    total_check_ins = total_check_ins + 1,
    xp = xp + v_total_xp,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Return success with rewards
  RETURN jsonb_build_object(
    'success', true,
    'base_xp', v_base_xp,
    'streak_bonus', v_streak_bonus,
    'total_xp', v_total_xp,
    'new_streak', v_current_streak + 1,
    'message', format('Check-in complete! +%s XP (Base: %s, Streak: +%s)', v_total_xp, v_base_xp, v_streak_bonus)
  );
END;
$$;

-- =====================================================
-- Function: Get District Leaderboard
-- =====================================================
CREATE OR REPLACE FUNCTION get_district_leaderboard(
  p_county TEXT,
  p_legislative_district TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  xp INTEGER,
  level INTEGER,
  missions_completed INTEGER,
  district_rank INTEGER,
  is_leader BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    COALESCE(p.display_name, 'Warrior') as display_name,
    p.xp,
    p.level,
    COALESCE(COUNT(um.id) FILTER (WHERE um.status = 'verified'), 0)::INTEGER as missions_completed,
    ROW_NUMBER() OVER (ORDER BY p.xp DESC, p.level DESC, p.created_at ASC)::INTEGER as district_rank,
    (p.leadership_role IS NOT NULL) as is_leader
  FROM profiles p
  LEFT JOIN user_missions um ON um.user_id = p.id
  WHERE 
    p.county = p_county
    AND p.legislative_district = p_legislative_district
  GROUP BY p.id, p.display_name, p.xp, p.level, p.created_at, p.leadership_role
  ORDER BY p.xp DESC, p.level DESC, p.created_at ASC
  LIMIT p_limit;
END;
$$;

-- =====================================================
-- Function: Get County Leaderboard
-- =====================================================
CREATE OR REPLACE FUNCTION get_county_leaderboard(
  p_county TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  xp INTEGER,
  level INTEGER,
  legislative_district TEXT,
  missions_completed INTEGER,
  county_rank INTEGER,
  is_leader BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    COALESCE(p.display_name, 'Warrior') as display_name,
    p.xp,
    p.level,
    p.legislative_district,
    COALESCE(COUNT(um.id) FILTER (WHERE um.status = 'verified'), 0)::INTEGER as missions_completed,
    ROW_NUMBER() OVER (ORDER BY p.xp DESC, p.level DESC, p.created_at ASC)::INTEGER as county_rank,
    (p.leadership_role IS NOT NULL) as is_leader
  FROM profiles p
  LEFT JOIN user_missions um ON um.user_id = p.id
  WHERE p.county = p_county
  GROUP BY p.id, p.display_name, p.xp, p.level, p.legislative_district, p.created_at, p.leadership_role
  ORDER BY p.xp DESC, p.level DESC, p.created_at ASC
  LIMIT p_limit;
END;
$$;

-- =====================================================
-- Function: Get Squad Stats
-- =====================================================
CREATE OR REPLACE FUNCTION get_squad_stats(
  p_county TEXT,
  p_legislative_district TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'squad_name', p_county || ' District ' || p_legislative_district,
    'total_members', COUNT(DISTINCT p.id),
    'active_today', COUNT(DISTINCT CASE WHEN p.updated_at::DATE = CURRENT_DATE THEN p.id END),
    'total_xp', COALESCE(SUM(p.xp), 0),
    'average_level', ROUND(AVG(p.level), 1),
    'missions_completed', COUNT(DISTINCT um.id) FILTER (WHERE um.status = 'verified'),
    'top_warrior', (
      SELECT jsonb_build_object(
        'name', COALESCE(display_name, 'Warrior'),
        'xp', xp,
        'level', level
      )
      FROM profiles
      WHERE county = p_county 
        AND legislative_district = p_legislative_district
      ORDER BY xp DESC, level DESC
      LIMIT 1
    )
  )
  INTO v_result
  FROM profiles p
  LEFT JOIN user_missions um ON um.user_id = p.id
  WHERE p.county = p_county
    AND p.legislative_district = p_legislative_district;

  RETURN v_result;
END;
$$;

-- =====================================================
-- RLS Policies for Leaderboards (Public Read)
-- =====================================================

-- Allow all authenticated users to view profiles for leaderboards
-- (Only expose necessary fields: display_name, xp, level, geography)
-- Private fields (email, phone, etc.) are already protected by RLS

COMMENT ON FUNCTION get_district_leaderboard IS 'Returns leaderboard for a specific legislative district';
COMMENT ON FUNCTION get_county_leaderboard IS 'Returns leaderboard for a specific county';
COMMENT ON FUNCTION get_squad_stats IS 'Returns aggregated stats for a district squad';
COMMENT ON FUNCTION claim_weekly_check_in IS 'Allows user to claim weekly check-in XP reward';

-- =====================================================
-- Verification
-- =====================================================

-- Test weekly check-in (replace with your user ID)
-- SELECT claim_weekly_check_in('YOUR-USER-ID-HERE');

-- Test district leaderboard
-- SELECT * FROM get_district_leaderboard('Anne Arundel', '32', 10);

-- Test county leaderboard
-- SELECT * FROM get_county_leaderboard('Anne Arundel', 10);

-- Test squad stats
-- SELECT get_squad_stats('Anne Arundel', '32');

DO $$
BEGIN
  RAISE NOTICE '✅ Squad features and weekly check-in database schema complete!';
  RAISE NOTICE '📊 Functions created: claim_weekly_check_in, get_district_leaderboard, get_county_leaderboard, get_squad_stats';
  RAISE NOTICE '🎯 Ready to build UI components!';
END $$;
