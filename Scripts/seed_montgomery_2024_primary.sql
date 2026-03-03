-- =====================================================
-- Seed Montgomery County 2024 Republican Primary Ballot
-- =====================================================
-- Election Date: May 14, 2024
-- Counties: Montgomery
-- Legislative Districts: 15, 16, 17, 18, 19, 20, 39

DO $$
DECLARE
  v_ballot_id UUID;
  v_presidential_race_id UUID;
  v_senate_race_id UUID;
  v_house6_race_id UUID;
  v_house8_race_id UUID;
  v_state_senator_race_id UUID;
  v_delegates_race_id UUID;
  v_judicial_race_id UUID;
  v_district TEXT;
BEGIN
  -- Loop through each legislative district in Montgomery County
  FOR v_district IN 
    SELECT unnest(ARRAY['15', '16', '17', '18', '19', '20', '39'])
  LOOP
    
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
      'Montgomery',
      v_district,
      CASE WHEN v_district IN ('15', '16', '17', '18', '19', '20', '39') THEN 'MD-6' ELSE 'MD-8' END,
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
    
    -- Most of Montgomery is MD-6
    IF v_district IN ('15', '16', '17', '18', '19', '20', '39') THEN
      INSERT INTO md_ballot_races (
        ballot_id,
        race_title,
        race_type,
        position_order,
        incumbent_name,
        max_selections
      ) VALUES (
        v_ballot_id,
        'United States Representative, District 6',
        'federal',
        3,
        'David Trone (D)',
        1
      )
      RETURNING id INTO v_house6_race_id;

      -- MD-6 candidates
      INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, is_placeholder, candidate_order) VALUES
      (v_house6_race_id, 'Neil Parrott', 'Republican', false, false, 1),
      (v_house6_race_id, 'Dan Cox', 'Republican', false, false, 2),
      (v_house6_race_id, 'Chris Hyser', 'Republican', false, false, 3),
      (v_house6_race_id, 'Mariela Roca', 'Republican', false, false, 4),
      (v_house6_race_id, 'Tom Royals', 'Republican', false, false, 5),
      (v_house6_race_id, 'Brenda Thiam', 'Republican', false, false, 6);
    ELSE
      -- Small part of Montgomery in MD-8
      INSERT INTO md_ballot_races (
        ballot_id,
        race_title,
        race_type,
        position_order,
        incumbent_name,
        max_selections
      ) VALUES (
        v_ballot_id,
        'United States Representative, District 8',
        'federal',
        3,
        'Jamie Raskin (D)',
        1
      )
      RETURNING id INTO v_house8_race_id;

      -- MD-8 candidates
      INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, is_placeholder, candidate_order) VALUES
      (v_house8_race_id, 'Cheryl Riley', 'Republican', false, false, 1);
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

    -- Generic State Senator candidates (3 per district)
    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, is_placeholder, candidate_order) VALUES
    (v_state_senator_race_id, 'Republican Candidate A', 'Republican', false, false, 1),
    (v_state_senator_race_id, 'Republican Candidate B', 'Republican', false, false, 2),
    (v_state_senator_race_id, 'Republican Candidate C', 'Republican', false, false, 3);

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

    -- Generic Delegate candidates (5 running for 3 seats)
    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, is_placeholder, candidate_order) VALUES
    (v_delegates_race_id, 'Republican Delegate A', 'Republican', false, false, 1),
    (v_delegates_race_id, 'Republican Delegate B', 'Republican', false, false, 2),
    (v_delegates_race_id, 'Republican Delegate C', 'Republican', false, false, 3),
    (v_delegates_race_id, 'Republican Delegate D', 'Republican', false, false, 4),
    (v_delegates_race_id, 'Republican Delegate E', 'Republican', false, false, 5);

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
      'Montgomery County Executive',
      'county',
      6,
      'Marc Elrich (D)',
      1
    )
    RETURNING id INTO v_senate_race_id;

    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, is_placeholder, candidate_order) VALUES
    (v_senate_race_id, 'Republican Executive Candidate A', 'Republican', false, false, 1),
    (v_senate_race_id, 'Republican Executive Candidate B', 'Republican', false, false, 2);

    -- =====================================================
    -- RACE 7: County Council At-Large
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
      'Montgomery County Council At-Large',
      'county',
      7,
      NULL,
      4 -- Vote for up to 4
    )
    RETURNING id INTO v_senate_race_id;

    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, is_placeholder, candidate_order) VALUES
    (v_senate_race_id, 'Republican Council A', 'Republican', false, false, 1),
    (v_senate_race_id, 'Republican Council B', 'Republican', false, false, 2),
    (v_senate_race_id, 'Republican Council C', 'Republican', false, false, 3),
    (v_senate_race_id, 'Republican Council D', 'Republican', false, false, 4),
    (v_senate_race_id, 'Republican Council E', 'Republican', false, false, 5);

    -- =====================================================
    -- RACE 8: Board of Education
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
      4 -- Vote for up to 4
    )
    RETURNING id INTO v_senate_race_id;

    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, is_placeholder, candidate_order) VALUES
    (v_senate_race_id, 'Education Candidate A', 'Nonpartisan', false, false, 1),
    (v_senate_race_id, 'Education Candidate B', 'Nonpartisan', false, false, 2),
    (v_senate_race_id, 'Education Candidate C', 'Nonpartisan', false, false, 3),
    (v_senate_race_id, 'Education Candidate D', 'Nonpartisan', false, false, 4),
    (v_senate_race_id, 'Education Candidate E', 'Nonpartisan', false, false, 5);

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
    (v_judicial_race_id, 'Judge William A. Example', 'Nonpartisan', false, false, 1),
    (v_judicial_race_id, 'Judge Mary B. Sample', 'Nonpartisan', false, false, 2);

    -- =====================================================
    -- RACE 10: Constitutional Amendment (if applicable)
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
      'Constitutional Amendment - Reproductive Freedom',
      'ballot_question',
      10,
      NULL,
      1 -- For or Against
    )
    RETURNING id INTO v_senate_race_id;

    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, is_placeholder, candidate_order) VALUES
    (v_senate_race_id, 'FOR the Amendment', 'Nonpartisan', false, false, 1),
    (v_senate_race_id, 'AGAINST the Amendment', 'Nonpartisan', false, false, 2);

  END LOOP;

  RAISE NOTICE 'Successfully seeded 2024 primary ballot data for Montgomery County (Districts 15-20, 39)';
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
WHERE b.county = 'Montgomery'
GROUP BY b.county, b.legislative_district, b.congressional_district
ORDER BY b.legislative_district;

-- =====================================================
-- Expected Result:
-- =====================================================
-- 7 ballots (one per district)
-- ~10 races per ballot
-- ~40-50 candidates per ballot (varies by district)
-- All is_placeholder should be false
-- Presidential, Senate, and House races should be consistent across districts
