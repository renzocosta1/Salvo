-- =====================================================
-- Add Avatar URLs to Leaderboard Functions
-- =====================================================
-- Updates Squad leaderboard functions to include profile pictures
-- Run this AFTER add_avatar_url_column.sql
-- =====================================================

-- Drop existing functions first (required when changing return type)
DROP FUNCTION IF EXISTS get_district_leaderboard(TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS get_county_leaderboard(TEXT, INTEGER);

-- =====================================================
-- Function: Get District Leaderboard (with avatars)
-- =====================================================
CREATE OR REPLACE FUNCTION get_district_leaderboard(
  p_county TEXT,
  p_legislative_district TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
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
    p.avatar_url,
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
  GROUP BY p.id, p.display_name, p.avatar_url, p.xp, p.level, p.created_at, p.leadership_role
  ORDER BY p.xp DESC, p.level DESC, p.created_at ASC
  LIMIT p_limit;
END;
$$;

-- =====================================================
-- Function: Get County Leaderboard (with avatars)
-- =====================================================
CREATE OR REPLACE FUNCTION get_county_leaderboard(
  p_county TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
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
    p.avatar_url,
    p.xp,
    p.level,
    p.legislative_district,
    COALESCE(COUNT(um.id) FILTER (WHERE um.status = 'verified'), 0)::INTEGER as missions_completed,
    ROW_NUMBER() OVER (ORDER BY p.xp DESC, p.level DESC, p.created_at ASC)::INTEGER as county_rank,
    (p.leadership_role IS NOT NULL) as is_leader
  FROM profiles p
  LEFT JOIN user_missions um ON um.user_id = p.id
  WHERE p.county = p_county
  GROUP BY p.id, p.display_name, p.avatar_url, p.xp, p.level, p.legislative_district, p.created_at, p.leadership_role
  ORDER BY p.xp DESC, p.level DESC, p.created_at ASC
  LIMIT p_limit;
END;
$$;

DO $$
BEGIN
  RAISE NOTICE '✅ Leaderboard functions updated with avatar support!';
  RAISE NOTICE '📸 Profile pictures will now show in Squad leaderboards';
  RAISE NOTICE '🏆 District and County leaderboards ready';
END $$;
