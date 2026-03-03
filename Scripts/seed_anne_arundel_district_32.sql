-- ============================================================================
-- ANNE ARUNDEL COUNTY - DISTRICT 32 BALLOT DATA
-- ============================================================================
-- Quick seed for testing second account in Anne Arundel County
-- Legislative District 32, Congressional District MD-5
-- ============================================================================

DO $$
DECLARE
  v_ballot_id UUID;
  v_governor_race_id UUID;
  v_senate_race_id UUID;
  v_house_race_id UUID;
  v_state_senator_race_id UUID;
  v_delegates_race_id UUID;
  v_county_exec_race_id UUID;
  v_county_council_race_id UUID;
  v_board_ed_race_id UUID;
BEGIN
  -- Create ballot for Anne Arundel County, District 32
  INSERT INTO md_ballots (
    election_date,
    county,
    legislative_district,
    congressional_district,
    election_name
  ) VALUES (
    '2026-06-23',
    'Anne Arundel',
    '32',
    'MD-5',
    '2026 Maryland Republican Primary'
  )
  ON CONFLICT (county, legislative_district, congressional_district) 
  DO UPDATE SET updated_at = NOW()
  RETURNING id INTO v_ballot_id;

  RAISE NOTICE 'Created/found ballot: %', v_ballot_id;

  -- ============================================================================
  -- FEDERAL RACES
  -- ============================================================================

  -- U.S. Senator (Statewide) - POSITION 1
  INSERT INTO md_ballot_races (
    ballot_id,
    race_title,
    race_type,
    position_order,
    incumbent_name
  ) VALUES (
    v_ballot_id,
    'U.S. Senator',
    'federal',
    1,
    'Ben Cardin (D) - Retiring'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_senate_race_id;

  -- Senate candidates (Republican Primary)
  INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order) VALUES
    (v_senate_race_id, 'Larry Hogan', 'Republican', true, 1),
    (v_senate_race_id, 'Robin Ficker', 'Republican', false, 2),
    (v_senate_race_id, 'Rick Hoover', 'Republican', false, 3)
  ON CONFLICT DO NOTHING;

  -- U.S. Representative - District 5 - POSITION 2
  INSERT INTO md_ballot_races (
    ballot_id,
    race_title,
    race_type,
    position_order,
    incumbent_name
  ) VALUES (
    v_ballot_id,
    'U.S. Representative, District 5',
    'federal',
    2,
    'Glenn Ivey (D) - Incumbent'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_house_race_id;

  -- House candidates (Republican Primary - placeholder)
  INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order) VALUES
    (v_house_race_id, 'Republican Candidate 1', 'Republican', false, 1),
    (v_house_race_id, 'Republican Candidate 2', 'Republican', false, 2)
  ON CONFLICT DO NOTHING;

  -- Governor (Statewide) - POSITION 3
  INSERT INTO md_ballot_races (
    ballot_id,
    race_title,
    race_type,
    position_order,
    incumbent_name
  ) VALUES (
    v_ballot_id,
    'Governor',
    'state',
    3,
    'Wes Moore (D) - Incumbent'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_governor_race_id;

  -- Governor candidates (Republican Primary - same as Montgomery, statewide race)
  INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order) VALUES
    (v_governor_race_id, 'Dan Cox', 'Republican', true, 1),
    (v_governor_race_id, 'Ed Hale', 'Republican', false, 2),
    (v_governor_race_id, 'Christopher Bouchat', 'Republican', false, 3),
    (v_governor_race_id, 'Carl Brunner', 'Republican', false, 4),
    (v_governor_race_id, 'Steve Hershey', 'Republican', false, 5),
    (v_governor_race_id, 'John Myrick', 'Republican', false, 6),
    (v_governor_race_id, 'Larry Hogan', 'Republican', false, 7),
    (v_governor_race_id, 'Kurt Wedekind', 'Republican', false, 8)
  ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- STATE RACES
  -- ============================================================================

  -- State Senator - District 32 - POSITION 4
  INSERT INTO md_ballot_races (
    ballot_id,
    race_title,
    race_type,
    position_order,
    incumbent_name
  ) VALUES (
    v_ballot_id,
    'State Senator, District 32',
    'state',
    4,
    NULL  -- Update when known
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_state_senator_race_id;

  -- State Senator candidates (Republican Primary - placeholder)
  INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order) VALUES
    (v_state_senator_race_id, 'Republican Candidate 1', 'Republican', false, 1),
    (v_state_senator_race_id, 'Republican Candidate 2', 'Republican', false, 2)
  ON CONFLICT DO NOTHING;

  -- House of Delegates - District 32 - POSITION 5 (Vote for up to 3)
  INSERT INTO md_ballot_races (
    ballot_id,
    race_title,
    race_type,
    position_order,
    incumbent_name,
    max_selections
  ) VALUES (
    v_ballot_id,
    'House of Delegates, District 32',
    'state',
    5,
    NULL,  -- Multiple incumbents
    3  -- Vote for up to 3
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_delegates_race_id;

  -- Delegates candidates (Republican Primary - placeholder)
  INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order) VALUES
    (v_delegates_race_id, 'Republican Candidate 1', 'Republican', true, 1),
    (v_delegates_race_id, 'Republican Candidate 2', 'Republican', true, 2),
    (v_delegates_race_id, 'Republican Candidate 3', 'Republican', true, 3),
    (v_delegates_race_id, 'Republican Candidate 4', 'Republican', false, 4)
  ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- COUNTY RACES
  -- ============================================================================

  -- County Executive - POSITION 6
  INSERT INTO md_ballot_races (
    ballot_id,
    race_title,
    race_type,
    position_order,
    incumbent_name
  ) VALUES (
    v_ballot_id,
    'Anne Arundel County Executive',
    'county',
    6,
    'Steuart Pittman (D) - Incumbent'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_county_exec_race_id;

  -- County Executive candidates (Republican Primary - placeholder)
  INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order) VALUES
    (v_county_exec_race_id, 'Republican Candidate 1', 'Republican', true, 1),
    (v_county_exec_race_id, 'Republican Candidate 2', 'Republican', false, 2)
  ON CONFLICT DO NOTHING;

  -- County Council At-Large - POSITION 7 (Vote for up to 4)
  INSERT INTO md_ballot_races (
    ballot_id,
    race_title,
    race_type,
    position_order,
    incumbent_name,
    max_selections
  ) VALUES (
    v_ballot_id,
    'Anne Arundel County Council At-Large',
    'county',
    7,
    'Multiple Incumbents',
    4  -- Vote for up to 4
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_county_council_race_id;

  -- County Council candidates (Republican Primary - placeholder)
  INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order) VALUES
    (v_county_council_race_id, 'Republican Candidate 1', 'Republican', true, 1),
    (v_county_council_race_id, 'Republican Candidate 2', 'Republican', true, 2),
    (v_county_council_race_id, 'Republican Candidate 3', 'Republican', true, 3),
    (v_county_council_race_id, 'Republican Candidate 4', 'Republican', true, 4),
    (v_county_council_race_id, 'Republican Candidate 5', 'Republican', false, 5)
  ON CONFLICT DO NOTHING;

  -- Board of Education - POSITION 8 (Non-partisan, Vote for up to 2)
  INSERT INTO md_ballot_races (
    ballot_id,
    race_title,
    race_type,
    position_order,
    max_selections
  ) VALUES (
    v_ballot_id,
    'Anne Arundel Board of Education',
    'local',
    8,
    2  -- Vote for up to 2
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_board_ed_race_id;

  -- Board of Education candidates (Non-partisan, but party endorsed)
  INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order) VALUES
    (v_board_ed_race_id, 'Endorsed Candidate 1', 'Non-partisan', true, 1),
    (v_board_ed_race_id, 'Endorsed Candidate 2', 'Non-partisan', true, 2),
    (v_board_ed_race_id, 'Other Candidate 3', 'Non-partisan', false, 3),
    (v_board_ed_race_id, 'Other Candidate 4', 'Non-partisan', false, 4)
  ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- JUDICIAL RACES (Circuit Court Judges - Non-partisan)
  -- ============================================================================

  -- 9. Circuit Court Judge (Continuance in Office)
  INSERT INTO md_ballot_races (
    ballot_id,
    race_title,
    race_type,
    position_order
  ) VALUES (
    v_ballot_id,
    'Judge of the Circuit Court - Continuance in Office',
    'judicial',
    9
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_board_ed_race_id;

  -- Circuit Court Judge candidates (Yes/No retention)
  INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order) VALUES
    (v_board_ed_race_id, 'Yes', 'Non-partisan', true, 1),
    (v_board_ed_race_id, 'No', 'Non-partisan', false, 2)
  ON CONFLICT DO NOTHING;

  -- 10. Appellate Court Judge (Continuance in Office)
  INSERT INTO md_ballot_races (
    ballot_id,
    race_title,
    race_type,
    position_order
  ) VALUES (
    v_ballot_id,
    'Judge of the Appellate Court of Maryland - Continuance in Office',
    'judicial',
    10
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_board_ed_race_id;

  -- Appellate Court Judge candidates (Yes/No retention)
  INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order) VALUES
    (v_board_ed_race_id, 'Yes', 'Non-partisan', true, 1),
    (v_board_ed_race_id, 'No', 'Non-partisan', false, 2)
  ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- BALLOT QUESTIONS (Constitutional Amendments)
  -- ============================================================================

  -- 11. Constitutional Amendment (if any)
  INSERT INTO md_ballot_races (
    ballot_id,
    race_title,
    race_type,
    position_order
  ) VALUES (
    v_ballot_id,
    'Constitutional Amendment - Right to Reproductive Freedom',
    'ballot_question',
    11
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_board_ed_race_id;

  -- Amendment options (Yes/No)
  INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order) VALUES
    (v_board_ed_race_id, 'For the Constitutional Amendment', 'Non-partisan', false, 1),
    (v_board_ed_race_id, 'Against the Constitutional Amendment', 'Non-partisan', true, 2)
  ON CONFLICT DO NOTHING;

END $$;

-- Verify the ballot was created
SELECT 
  b.id as ballot_id,
  b.county,
  b.legislative_district,
  b.congressional_district,
  COUNT(r.id) as races_count
FROM md_ballots b
LEFT JOIN md_ballot_races r ON r.ballot_id = b.id
WHERE b.county = 'Anne Arundel' AND b.legislative_district = '32'
GROUP BY b.id, b.county, b.legislative_district, b.congressional_district;
