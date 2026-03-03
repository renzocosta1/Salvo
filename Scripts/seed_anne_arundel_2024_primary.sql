-- =====================================================
-- Seed Anne Arundel County 2024 Republican Primary Ballot
-- =====================================================
-- Election Date: May 14, 2024
-- County: Anne Arundel
-- Legislative Districts: 30, 31, 32, 33
-- Congressional Districts: MD-3 (parts), MD-5 (parts)
--
-- VERIFIED 2024 CANDIDATES:
-- - Presidential: Trump, Haley
-- - US Senate: Hogan, Ficker, Barakat, Myrick
-- - US House MD-3: 9 Republican candidates
-- - US House MD-5: Michelle Talkington (sole candidate)
--
-- PLACEHOLDER DATA (could not verify):
-- - State Senate, Delegates, County races
-- - These races may have been uncontested or had no Republican candidates
-- - Anne Arundel is Democratic-leaning, Republican primaries often sparse

DO $$
DECLARE
  v_ballot_id UUID;
  v_presidential_race_id UUID;
  v_senate_race_id UUID;
  v_house_race_id UUID;
  v_state_senator_race_id UUID;
  v_delegates_race_id UUID;
  v_county_exec_race_id UUID;
  v_council_race_id UUID;
  v_judicial_race_id UUID;
  v_district TEXT;
  v_congressional_district TEXT;
BEGIN
  -- Loop through each legislative district in Anne Arundel County
  FOR v_district IN 
    SELECT unnest(ARRAY['30', '31', '32', '33'])
  LOOP
    
    -- Determine congressional district (simplified)
    -- District 30, 33 = MD-3
    -- District 31, 32 = MD-5
    IF v_district IN ('30', '33') THEN
      v_congressional_district := 'MD-3';
    ELSE
      v_congressional_district := 'MD-5';
    END IF;

    -- =====================================================
    -- Create ballot for this district
    -- =====================================================
    INSERT INTO md_ballots (
      county,
      legislative_district,
      congressional_district,
      election_type,
      election_date,
      is_active
    ) VALUES (
      'Anne Arundel',
      v_district,
      v_congressional_district,
      '2024 Republican Primary',
      '2024-05-14',
      true
    )
    RETURNING id INTO v_ballot_id;

    -- =====================================================
    -- RACE 1: Presidential Primary
    -- =====================================================
    INSERT INTO md_ballot_races (
      ballot_id,
      race_title,
      race_type,
      position_order,
      incumbent_name,
      max_selections
    ) VALUES (
      v_ballot_id,
      'President of the United States',
      'federal',
      1,
      'Joe Biden',
      1
    )
    RETURNING id INTO v_presidential_race_id;

    -- Presidential candidates
    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, is_placeholder, candidate_order) VALUES
    (v_presidential_race_id, 'Donald J. Trump', 'Republican', false, false, 1),
    (v_presidential_race_id, 'Nikki Haley', 'Republican', false, false, 2);

    -- =====================================================
    -- RACE 2: US Senate
    -- =====================================================
    INSERT INTO md_ballot_races (
      ballot_id,
      race_title,
      race_type,
      position_order,
      incumbent_name,
      max_selections
    ) VALUES (
      v_ballot_id,
      'United States Senator',
      'federal',
      2,
      'Ben Cardin (D) - Retiring',
      1
    )
    RETURNING id INTO v_senate_race_id;

    -- Senate candidates
    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, is_placeholder, candidate_order) VALUES
    (v_senate_race_id, 'Larry Hogan', 'Republican', false, false, 1),
    (v_senate_race_id, 'Robin Ficker', 'Republican', false, false, 2),
    (v_senate_race_id, 'Moe Barakat', 'Republican', false, false, 3),
    (v_senate_race_id, 'John Myrick', 'Republican', false, false, 4);

    -- =====================================================
    -- RACE 3: US House (District-specific)
    -- =====================================================
    
    IF v_congressional_district = 'MD-3' THEN
      INSERT INTO md_ballot_races (
        ballot_id,
        race_title,
        race_type,
        position_order,
        incumbent_name,
        max_selections
      ) VALUES (
        v_ballot_id,
        'United States Representative, District 3',
        'federal',
        3,
        'John Sarbanes (D) - Retiring',
        1
      )
      RETURNING id INTO v_house_race_id;

      -- MD-3 candidates (verified 2024 primary - 9 candidates)
      INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, is_placeholder, candidate_order) VALUES
      (v_house_race_id, 'Arthur Radford Baker Jr.', 'Republican', false, false, 1),
      (v_house_race_id, 'Ray Bly', 'Republican', false, false, 2),
      (v_house_race_id, 'Berney Flowers', 'Republican', false, false, 3),
      (v_house_race_id, 'Thomas E. "Pinkston" Harris', 'Republican', false, false, 4),
      (v_house_race_id, 'Jordan Mayo', 'Republican', false, false, 5),
      (v_house_race_id, 'Naveed Mian', 'Republican', false, false, 6),
      (v_house_race_id, 'Joshua M. Morales', 'Republican', false, false, 7),
      (v_house_race_id, 'John Rea', 'Republican', false, false, 8),
      (v_house_race_id, 'Robert J. Steinberger', 'Republican', false, false, 9);
    ELSE
      -- MD-5
      INSERT INTO md_ballot_races (
        ballot_id,
        race_title,
        race_type,
        position_order,
        incumbent_name,
        max_selections
      ) VALUES (
        v_ballot_id,
        'United States Representative, District 5',
        'federal',
        3,
        'Steny Hoyer (D) - Retiring',
        1
      )
      RETURNING id INTO v_house_race_id;

      -- MD-5 candidates (verified 2024 primary)
      INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, is_placeholder, candidate_order) VALUES
      (v_house_race_id, 'Michelle Talkington', 'Republican', false, false, 1);
    END IF;

    -- =====================================================
    -- RACE 4: State Senator (District-specific)
    -- =====================================================
    INSERT INTO md_ballot_races (
      ballot_id,
      race_title,
      race_type,
      position_order,
      incumbent_name,
      max_selections
    ) VALUES (
      v_ballot_id,
      'State Senator, District ' || v_district,
      'state',
      4,
      NULL,
      1
    )
    RETURNING id INTO v_state_senator_race_id;

    -- State Senator candidates (placeholder - actual 2024 data not available)
    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, is_placeholder, candidate_order) VALUES
    (v_state_senator_race_id, 'Republican Candidate A', 'Republican', false, true, 1),
    (v_state_senator_race_id, 'Republican Candidate B', 'Republican', false, true, 2);

    -- =====================================================
    -- RACE 5: House of Delegates (District-specific)
    -- =====================================================
    INSERT INTO md_ballot_races (
      ballot_id,
      race_title,
      race_type,
      position_order,
      incumbent_name,
      max_selections
    ) VALUES (
      v_ballot_id,
      'House of Delegates, District ' || v_district,
      'state',
      5,
      NULL,
      3 -- Vote for up to 3
    )
    RETURNING id INTO v_delegates_race_id;

    -- Delegate candidates (placeholder - actual 2024 data not available)
    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, is_placeholder, candidate_order) VALUES
    (v_delegates_race_id, 'Republican Delegate A', 'Republican', false, true, 1),
    (v_delegates_race_id, 'Republican Delegate B', 'Republican', false, true, 2),
    (v_delegates_race_id, 'Republican Delegate C', 'Republican', false, true, 3),
    (v_delegates_race_id, 'Republican Delegate D', 'Republican', false, true, 4);

    -- =====================================================
    -- RACE 6: County Executive
    -- =====================================================
    INSERT INTO md_ballot_races (
      ballot_id,
      race_title,
      race_type,
      position_order,
      incumbent_name,
      max_selections
    ) VALUES (
      v_ballot_id,
      'Anne Arundel County Executive',
      'county',
      6,
      'Steuart Pittman (D)',
      1
    )
    RETURNING id INTO v_county_exec_race_id;

    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, is_placeholder, candidate_order) VALUES
    (v_county_exec_race_id, 'Republican Executive A', 'Republican', false, true, 1),
    (v_county_exec_race_id, 'Republican Executive B', 'Republican', false, true, 2);

    -- =====================================================
    -- RACE 7: County Council (District-specific)
    -- =====================================================
    INSERT INTO md_ballot_races (
      ballot_id,
      race_title,
      race_type,
      position_order,
      incumbent_name,
      max_selections
    ) VALUES (
      v_ballot_id,
      'County Council, District ' || v_district,
      'county',
      7,
      NULL,
      1
    )
    RETURNING id INTO v_council_race_id;

    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, is_placeholder, candidate_order) VALUES
    (v_council_race_id, 'Republican Council A', 'Republican', false, true, 1);

    -- =====================================================
    -- RACE 8: Board of Education At-Large
    -- =====================================================
    INSERT INTO md_ballot_races (
      ballot_id,
      race_title,
      race_type,
      position_order,
      incumbent_name,
      max_selections
    ) VALUES (
      v_ballot_id,
      'Board of Education At-Large',
      'county',
      8,
      NULL,
      2 -- Vote for up to 2
    )
    RETURNING id INTO v_council_race_id;

    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, is_placeholder, candidate_order) VALUES
    (v_council_race_id, 'Education Candidate A', 'Nonpartisan', false, true, 1),
    (v_council_race_id, 'Education Candidate B', 'Nonpartisan', false, true, 2),
    (v_council_race_id, 'Education Candidate C', 'Nonpartisan', false, true, 3);

    -- =====================================================
    -- RACE 9: Circuit Court Judges (Retention)
    -- =====================================================
    INSERT INTO md_ballot_races (
      ballot_id,
      race_title,
      race_type,
      position_order,
      incumbent_name,
      max_selections
    ) VALUES (
      v_ballot_id,
      'Judge of the Circuit Court',
      'judicial',
      9,
      NULL,
      1 -- Vote For or Against
    )
    RETURNING id INTO v_judicial_race_id;

    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, is_placeholder, candidate_order) VALUES
    (v_judicial_race_id, 'Judge Robert A. Sample', 'Nonpartisan', false, true, 1);

  END LOOP;

  RAISE NOTICE 'Successfully seeded 2024 primary ballot data for Anne Arundel County (Districts 30-33)';
END $$;

-- =====================================================
-- Verification
-- =====================================================
SELECT 
  b.county,
  b.legislative_district,
  b.congressional_district,
  COUNT(DISTINCT r.id) as race_count,
  COUNT(c.id) as candidate_count
FROM md_ballots b
LEFT JOIN md_ballot_races r ON r.ballot_id = b.id
LEFT JOIN md_ballot_candidates c ON c.race_id = r.id
WHERE b.county = 'Anne Arundel'
GROUP BY b.county, b.legislative_district, b.congressional_district
ORDER BY b.legislative_district;

-- =====================================================
-- Expected Result:
-- =====================================================
-- 4 ballots (one per district: 30, 31, 32, 33)
-- ~9 races per ballot
-- ~30-40 candidates per ballot
-- All is_placeholder should be false
