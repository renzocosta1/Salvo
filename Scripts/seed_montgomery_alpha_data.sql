-- ============================================================================
-- SALVO ALPHA DATA SEEDING: Montgomery County & MD-6
-- ============================================================================
-- Run this in Supabase SQL Editor AFTER running migration 005_alpha_schema.sql
-- Seeds:
--   1. Core tactical missions (directives)
--   2. Montgomery County ballot data (Districts 14-20)
--   3. MD-6 Congressional District ballot data
--   4. Endorsed candidates marked with hard_party_endorsed flag
-- ============================================================================

-- ============================================================================
-- PART 1: SEED CORE TACTICAL MISSIONS (DIRECTIVES)
-- ============================================================================

-- Get the party_id for The Hard Party (should exist from initial setup)
DO $$
DECLARE
  v_party_id UUID;
BEGIN
  -- Get or create The Hard Party
  SELECT id INTO v_party_id FROM parties WHERE name = 'The Hard Party' LIMIT 1;
  
  IF v_party_id IS NULL THEN
    INSERT INTO parties (name) VALUES ('The Hard Party') RETURNING id INTO v_party_id;
    RAISE NOTICE 'Created The Hard Party with ID: %', v_party_id;
  END IF;

  -- Mission 1: Enlistment (SKIPPED FOR MVP - Placeholder)
  -- Removed voter registration card verification - too complex for MVP
  
  -- Mission 1: Relational Raid (Friend Recruitment) - No mission_type (optional field)
  INSERT INTO directives (
    party_id,
    title,
    body,
    target_goal,
    mission_deadline,
    requires_gps
  ) VALUES (
    v_party_id,
    '🎯 Relational Raid: Recruit Your Squad',
    E'BUILD YOUR SQUAD\n\nThe silent majority needs to organize. Sync your contacts and invite Maryland voters to join the movement.\n\n✅ MISSION BRIEF:\n- Import contacts from your phonebook\n- Identify Maryland voters in your network\n- Send personalized invitations via SMS/Share\n- Track who joins and completes onboarding\n\n🏆 REWARD: +100 XP per successful recruit who completes onboarding\n\n💡 PRO TIP: Personal invites have 10x higher conversion than social media posts. Your network is your superpower.',
    1000,
    '2026-06-23 20:00:00',
    FALSE
  ) ON CONFLICT DO NOTHING;

  -- Mission 2: Digital Ballot Commitment
  INSERT INTO directives (
    party_id,
    title,
    body,
    target_goal,
    mission_deadline,
    requires_gps
  ) VALUES (
    v_party_id,
    '🗳️ Digital Ballot: Lock in Your Votes',
    E'COMMIT TO THE SLATE\n\nReview your district''s ballot and commit to voting for endorsed candidates. We vote as a bloc - that''s how we win power.\n\n✅ MISSION BRIEF:\n- Review all races for your district\n- Candidates highlighted in NEON GREEN are endorsed\n- Tap "Commit to Vote" for each race\n- Reach 100% ballot completion\n\n🏆 REWARD: +50 XP for full ballot completion\n\n💡 STRATEGY: The more of us who commit to the same candidates, the more likely we flip seats. Unity = Power.',
    5000,
    '2026-06-23 07:00:00',
    FALSE
  ) ON CONFLICT DO NOTHING;

  -- Mission 3: Early Raid (Early Voting Check-in)
  INSERT INTO directives (
    party_id,
    title,
    body,
    target_goal,
    mission_type,
    mission_deadline,
    requires_gps
  ) VALUES (
    v_party_id,
    '⚡ Early Raid: Vote Early, Secure Victory',
    E'EARLY VOTING = GUARANTEED TURNOUT\n\nDon''t wait for Election Day. Vote early, upload proof, and lock in your contribution to the bloc.\n\n✅ MISSION BRIEF:\n- Find your nearest Early Voting center\n- Check in when you arrive (GPS required)\n- Vote for the full endorsed slate\n- Upload photo proof (I Voted sticker + polling place)\n\n🏆 REWARD: +200 XP + Squad Badge\n\n⏰ TIMELINE: June 12-20, 2026 (Early Voting Period)\n\n💡 TACTICAL ADVANTAGE: Early votes are already banked. No last-minute problems on Election Day.',
    2500,
    'EARLY_RAID',
    '2026-06-20 20:00:00',
    TRUE
  ) ON CONFLICT DO NOTHING;

  -- Mission 4: Election Day Siege (Final Battle)
  INSERT INTO directives (
    party_id,
    title,
    body,
    target_goal,
    mission_type,
    mission_deadline,
    requires_gps
  ) VALUES (
    v_party_id,
    '🔥 Election Day Siege: THE FINAL PUSH',
    E'THIS IS IT. GAME DAY.\n\nIf you haven''t voted yet, this is your last chance. Get to your polling place, vote the slate, upload proof.\n\n✅ MISSION BRIEF:\n- App will show you your assigned precinct\n- Tap to open Google Maps with directions\n- Vote for ALL endorsed candidates\n- Upload photo proof (I Voted sticker + ballot if allowed)\n\n🏆 REWARD: +250 XP + Legion Badge + Squad Status\n\n⏰ DEADLINE: June 23, 2026 @ 8:00 PM (Polls Close)\n\n💡 CRITICAL: This is what all the organizing was for. Show up. Vote. Prove it. We move as one.',
    10000,
    'ELECTION_DAY_SIEGE',
    '2026-06-23 20:00:00',
    TRUE
  ) ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Seeded 4 tactical missions';
END $$;

-- ============================================================================
-- PART 2: SEED MONTGOMERY COUNTY BALLOT DATA
-- ============================================================================

DO $$
DECLARE
  v_ballot_id UUID;
  v_race_id UUID;
  v_district TEXT;
BEGIN
  -- Seed ballots for Montgomery County Legislative Districts 14-20
  FOR v_district IN 
    SELECT unnest(ARRAY['14', '15', '16', '17', '18', '19', '20'])
  LOOP
    -- Create ballot for this district
    INSERT INTO md_ballots (
      election_date,
      county,
      legislative_district,
      congressional_district
    ) VALUES (
      '2026-06-23',
      'Montgomery',
      v_district,
      '6'  -- All Montgomery County is MD-6
    ) RETURNING id INTO v_ballot_id;

    RAISE NOTICE 'Created ballot for District %', v_district;

    -- ========================================================================
    -- FEDERAL RACES
    -- ========================================================================

    -- U.S. Senate (Statewide)
    INSERT INTO md_ballot_races (
      ballot_id,
      race_title,
      race_type,
      position_order
    ) VALUES (
      v_ballot_id,
      'U.S. Senator',
      'federal',
      1
    ) RETURNING id INTO v_race_id;

    -- Senate candidates (placeholder - update with real 2026 candidates)
    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order)
    VALUES
      (v_race_id, 'Chris Van Hollen (Incumbent)', 'Democrat', FALSE, 1),
      (v_race_id, 'TBD Republican Challenger', 'Republican', TRUE, 2),
      (v_race_id, 'TBD Libertarian', 'Libertarian', FALSE, 3);

    -- U.S. House of Representatives - MD-6
    INSERT INTO md_ballot_races (
      ballot_id,
      race_title,
      race_type,
      position_order
    ) VALUES (
      v_ballot_id,
      'U.S. Representative, District 6',
      'federal',
      2
    ) RETURNING id INTO v_race_id;

    -- House candidates
    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order)
    VALUES
      (v_race_id, 'April McClain Delaney (Incumbent)', 'Democrat', FALSE, 1),
      (v_race_id, 'Neil Parrott', 'Republican', TRUE, 2),
      (v_race_id, 'David Trone', 'Democrat', FALSE, 3);

    -- ========================================================================
    -- STATE RACES
    -- ========================================================================

    -- Governor (Statewide)
    INSERT INTO md_ballot_races (
      ballot_id,
      race_title,
      race_type,
      position_order
    ) VALUES (
      v_ballot_id,
      'Governor',
      'state',
      3
    ) RETURNING id INTO v_race_id;

    -- Governor candidates (placeholder - update with real 2026 candidates)
    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order)
    VALUES
      (v_race_id, 'Wes Moore (Incumbent)', 'Democrat', FALSE, 1),
      (v_race_id, 'Dan Cox', 'Republican', TRUE, 2),
      (v_race_id, 'TBD Independent', 'Independent', FALSE, 3);

    -- Maryland State Senator (District-specific)
    INSERT INTO md_ballot_races (
      ballot_id,
      race_title,
      race_type,
      position_order
    ) VALUES (
      v_ballot_id,
      'State Senator, District ' || v_district,
      'state',
      4
    ) RETURNING id INTO v_race_id;

    -- State Senator candidates (placeholder - varies by district)
    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order)
    VALUES
      (v_race_id, 'Democratic Incumbent - District ' || v_district, 'Democrat', FALSE, 1),
      (v_race_id, 'Republican Challenger - District ' || v_district, 'Republican', TRUE, 2);

    -- Maryland House of Delegates (District-specific, 3 seats)
    INSERT INTO md_ballot_races (
      ballot_id,
      race_title,
      race_type,
      position_order
    ) VALUES (
      v_ballot_id,
      'House of Delegates, District ' || v_district || ' (Vote for up to 3)',
      'state',
      5
    ) RETURNING id INTO v_race_id;

    -- Delegates candidates (3 per party typical)
    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order)
    VALUES
      (v_race_id, 'Democratic Delegate A - District ' || v_district, 'Democrat', FALSE, 1),
      (v_race_id, 'Democratic Delegate B - District ' || v_district, 'Democrat', FALSE, 2),
      (v_race_id, 'Democratic Delegate C - District ' || v_district, 'Democrat', FALSE, 3),
      (v_race_id, 'Republican Delegate A - District ' || v_district, 'Republican', TRUE, 4),
      (v_race_id, 'Republican Delegate B - District ' || v_district, 'Republican', TRUE, 5),
      (v_race_id, 'Republican Delegate C - District ' || v_district, 'Republican', TRUE, 6);

    -- ========================================================================
    -- COUNTY RACES (Montgomery County-specific)
    -- ========================================================================

    -- Montgomery County Executive
    INSERT INTO md_ballot_races (
      ballot_id,
      race_title,
      race_type,
      position_order
    ) VALUES (
      v_ballot_id,
      'Montgomery County Executive',
      'county',
      6
    ) RETURNING id INTO v_race_id;

    -- County Executive candidates
    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order)
    VALUES
      (v_race_id, 'Marc Elrich (Incumbent)', 'Democrat', FALSE, 1),
      (v_race_id, 'David Blair', 'Democrat', FALSE, 2),
      (v_race_id, 'Reardon Sullivan', 'Republican', TRUE, 3);

    -- Montgomery County Council At-Large (Vote for up to 4)
    INSERT INTO md_ballot_races (
      ballot_id,
      race_title,
      race_type,
      position_order
    ) VALUES (
      v_ballot_id,
      'Montgomery County Council At-Large (Vote for up to 4)',
      'county',
      7
    ) RETURNING id INTO v_race_id;

    -- Council At-Large candidates (typically many candidates)
    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order)
    VALUES
      (v_race_id, 'Gabe Albornoz (Incumbent)', 'Democrat', FALSE, 1),
      (v_race_id, 'Andrew Friedson (Incumbent)', 'Democrat', FALSE, 2),
      (v_race_id, 'Evan Glass (Incumbent)', 'Democrat', FALSE, 3),
      (v_race_id, 'Kristin Mink (Incumbent)', 'Democrat', FALSE, 4),
      (v_race_id, 'Republican Candidate A', 'Republican', TRUE, 5),
      (v_race_id, 'Republican Candidate B', 'Republican', TRUE, 6),
      (v_race_id, 'Republican Candidate C', 'Republican', TRUE, 7),
      (v_race_id, 'Republican Candidate D', 'Republican', TRUE, 8);

    -- ========================================================================
    -- LOCAL/JUDICIAL RACES
    -- ========================================================================

    -- Board of Education (Nonpartisan, but we can still endorse)
    INSERT INTO md_ballot_races (
      ballot_id,
      race_title,
      race_type,
      position_order
    ) VALUES (
      v_ballot_id,
      'Board of Education At-Large',
      'local',
      8
    ) RETURNING id INTO v_race_id;

    -- Board of Education candidates
    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order)
    VALUES
      (v_race_id, 'Progressive Candidate A', 'Nonpartisan', FALSE, 1),
      (v_race_id, 'Progressive Candidate B', 'Nonpartisan', FALSE, 2),
      (v_race_id, 'Conservative Candidate A', 'Nonpartisan', TRUE, 3),
      (v_race_id, 'Conservative Candidate B', 'Nonpartisan', TRUE, 4);

    -- ========================================================================
    -- BALLOT QUESTIONS (if any for 2026)
    -- ========================================================================

    -- Question 1: Example ballot question
    INSERT INTO md_ballot_races (
      ballot_id,
      race_title,
      race_type,
      position_order
    ) VALUES (
      v_ballot_id,
      'Question 1: Constitutional Amendment on Voting Rights',
      'ballot_question',
      9
    ) RETURNING id INTO v_race_id;

    -- Ballot question options (Yes/No)
    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order)
    VALUES
      (v_race_id, 'YES - Support Amendment', 'N/A', FALSE, 1),
      (v_race_id, 'NO - Oppose Amendment', 'N/A', TRUE, 2);

  END LOOP;

  RAISE NOTICE 'Seeded ballot data for Montgomery County Districts 14-20';
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check missions were created
SELECT 
  title,
  mission_type,
  target_goal,
  mission_deadline,
  requires_gps
FROM directives
ORDER BY mission_deadline;

-- Check ballots were created
SELECT 
  county,
  legislative_district,
  congressional_district,
  COUNT(*) as race_count
FROM md_ballots
JOIN md_ballot_races ON md_ballots.id = md_ballot_races.ballot_id
GROUP BY county, legislative_district, congressional_district
ORDER BY legislative_district;

-- Check endorsed candidates count
SELECT 
  b.legislative_district,
  r.race_title,
  COUNT(*) FILTER (WHERE c.hard_party_endorsed = TRUE) as endorsed_count,
  COUNT(*) as total_candidates
FROM md_ballots b
JOIN md_ballot_races r ON b.id = r.ballot_id
JOIN md_ballot_candidates c ON r.id = c.race_id
WHERE b.county = 'Montgomery'
GROUP BY b.legislative_district, r.race_title, r.position_order
ORDER BY b.legislative_district, r.position_order;

-- ============================================================================
-- SEEDING COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Update candidate names with actual 2026 Primary candidates
-- 2. Adjust endorsements based on party strategy
-- 3. Add more ballot questions as they're announced
-- 4. Test ballot UI with a user assigned to District 15
-- ============================================================================
