-- ============================================================================
-- 2026 REPUBLICAN PRIMARY - CLEAN PLACEHOLDER BALLOT DATA
-- ============================================================================
-- Covers Montgomery County (Districts 15-20) and Anne Arundel County (District 32)
-- Uses generic placeholders since 2026 candidates haven't filed yet
-- NO 2024 data, NO US Senator race (that's in 2028)
-- ============================================================================

DO $$
DECLARE
  v_ballot_id UUID;
  v_race_id UUID;
  v_county TEXT;
  v_district TEXT;
  v_congressional_district TEXT;
BEGIN
  -- ============================================================================
  -- MONTGOMERY COUNTY (Districts 15-20)
  -- ============================================================================
  FOR v_district IN 
    SELECT unnest(ARRAY['15', '16', '17', '18', '19', '20'])
  LOOP
    v_county := 'Montgomery';
    v_congressional_district := CASE 
      WHEN v_district IN ('15', '16', '17', '18', '19') THEN 'MD-6'
      WHEN v_district = '20' THEN 'MD-8'
      ELSE 'MD-6'
    END;

    RAISE NOTICE 'Processing % County, District %', v_county, v_district;

    -- Create ballot
    INSERT INTO md_ballots (
      election_date,
      county,
      legislative_district,
      congressional_district,
      election_name
    ) VALUES (
      '2026-06-23',
      v_county,
      v_district,
      v_congressional_district,
      '2026 Maryland Republican Primary'
    )
    ON CONFLICT (county, legislative_district, congressional_district) 
    DO UPDATE SET updated_at = NOW()
    RETURNING id INTO v_ballot_id;

    -- RACE 1: U.S. Representative (District-specific)
    INSERT INTO md_ballot_races (
      ballot_id, race_title, race_type, position_order, incumbent_name, max_selections
    ) VALUES (
      v_ballot_id,
      'U.S. Representative, District ' || SUBSTRING(v_congressional_district FROM 4),
      'federal',
      1,
      CASE v_congressional_district
        WHEN 'MD-6' THEN 'David Trone (D) - Incumbent'
        WHEN 'MD-8' THEN 'Jamie Raskin (D) - Incumbent'
      END,
      1
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_race_id;

    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order, is_placeholder) VALUES
      (v_race_id, 'Republican Candidate A', 'Republican', true, 1, true),
      (v_race_id, 'Republican Candidate B', 'Republican', false, 2, true)
    ON CONFLICT DO NOTHING;

    -- RACE 2: Governor (Statewide)
    INSERT INTO md_ballot_races (
      ballot_id, race_title, race_type, position_order, incumbent_name, max_selections
    ) VALUES (
      v_ballot_id,
      'Governor',
      'state',
      2,
      'Wes Moore (D) - Incumbent',
      1
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_race_id;

    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order, is_placeholder) VALUES
      (v_race_id, 'Republican Candidate A', 'Republican', true, 1, true),
      (v_race_id, 'Republican Candidate B', 'Republican', false, 2, true),
      (v_race_id, 'Republican Candidate C', 'Republican', false, 3, true),
      (v_race_id, 'Republican Candidate D', 'Republican', false, 4, true)
    ON CONFLICT DO NOTHING;

    -- RACE 3: State Senator (District-specific)
    INSERT INTO md_ballot_races (
      ballot_id, race_title, race_type, position_order, incumbent_name, max_selections
    ) VALUES (
      v_ballot_id,
      'State Senator, District ' || v_district,
      'state',
      3,
      NULL,
      1
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_race_id;

    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order, is_placeholder) VALUES
      (v_race_id, 'Republican Candidate A', 'Republican', true, 1, true),
      (v_race_id, 'Republican Candidate B', 'Republican', false, 2, true)
    ON CONFLICT DO NOTHING;

    -- RACE 4: House of Delegates (District-specific)
    INSERT INTO md_ballot_races (
      ballot_id, race_title, race_type, position_order, incumbent_name, max_selections
    ) VALUES (
      v_ballot_id,
      'House of Delegates, District ' || v_district,
      'state',
      4,
      NULL,
      3
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_race_id;

    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order, is_placeholder) VALUES
      (v_race_id, 'Republican Candidate A', 'Republican', true, 1, true),
      (v_race_id, 'Republican Candidate B', 'Republican', true, 2, true),
      (v_race_id, 'Republican Candidate C', 'Republican', true, 3, true),
      (v_race_id, 'Republican Candidate D', 'Republican', false, 4, true)
    ON CONFLICT DO NOTHING;

    -- RACE 5: County Executive
    INSERT INTO md_ballot_races (
      ballot_id, race_title, race_type, position_order, incumbent_name, max_selections
    ) VALUES (
      v_ballot_id,
      v_county || ' County Executive',
      'county',
      5,
      'Marc Elrich (D) - Incumbent',
      1
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_race_id;

    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order, is_placeholder) VALUES
      (v_race_id, 'Republican Candidate A', 'Republican', true, 1, true),
      (v_race_id, 'Republican Candidate B', 'Republican', false, 2, true)
    ON CONFLICT DO NOTHING;

    -- RACE 6: County Council At-Large
    INSERT INTO md_ballot_races (
      ballot_id, race_title, race_type, position_order, incumbent_name, max_selections
    ) VALUES (
      v_ballot_id,
      v_county || ' County Council At-Large',
      'county',
      6,
      'Multiple Incumbents',
      4
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_race_id;

    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order, is_placeholder) VALUES
      (v_race_id, 'Republican Candidate A', 'Republican', true, 1, true),
      (v_race_id, 'Republican Candidate B', 'Republican', true, 2, true),
      (v_race_id, 'Republican Candidate C', 'Republican', true, 3, true),
      (v_race_id, 'Republican Candidate D', 'Republican', true, 4, true),
      (v_race_id, 'Republican Candidate E', 'Republican', false, 5, true)
    ON CONFLICT DO NOTHING;

    -- RACE 7: Board of Education
    INSERT INTO md_ballot_races (
      ballot_id, race_title, race_type, position_order, incumbent_name, max_selections
    ) VALUES (
      v_ballot_id,
      v_county || ' Board of Education',
      'local',
      7,
      NULL,
      2
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_race_id;

    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order, is_placeholder) VALUES
      (v_race_id, 'Endorsed Candidate A', 'Non-partisan', true, 1, true),
      (v_race_id, 'Endorsed Candidate B', 'Non-partisan', true, 2, true),
      (v_race_id, 'Other Candidate C', 'Non-partisan', false, 3, true),
      (v_race_id, 'Other Candidate D', 'Non-partisan', false, 4, true)
    ON CONFLICT DO NOTHING;

    -- RACE 8: Circuit Court Judge
    INSERT INTO md_ballot_races (
      ballot_id, race_title, race_type, position_order, max_selections
    ) VALUES (
      v_ballot_id,
      'Judge of the Circuit Court - Continuance in Office',
      'judicial',
      8,
      1
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_race_id;

    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order, is_placeholder) VALUES
      (v_race_id, 'Yes', 'Non-partisan', true, 1, false),
      (v_race_id, 'No', 'Non-partisan', false, 2, false)
    ON CONFLICT DO NOTHING;

    -- RACE 9: Appellate Court Judge
    INSERT INTO md_ballot_races (
      ballot_id, race_title, race_type, position_order, max_selections
    ) VALUES (
      v_ballot_id,
      'Judge of the Appellate Court - Continuance in Office',
      'judicial',
      9,
      1
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_race_id;

    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order, is_placeholder) VALUES
      (v_race_id, 'Yes', 'Non-partisan', true, 1, false),
      (v_race_id, 'No', 'Non-partisan', false, 2, false)
    ON CONFLICT DO NOTHING;

    -- RACE 10: Constitutional Amendment
    INSERT INTO md_ballot_races (
      ballot_id, race_title, race_type, position_order, max_selections
    ) VALUES (
      v_ballot_id,
      'Constitutional Amendment - Right to Reproductive Freedom',
      'ballot_question',
      10,
      1
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_race_id;

    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order, is_placeholder) VALUES
      (v_race_id, 'For the Constitutional Amendment', 'Non-partisan', false, 1, false),
      (v_race_id, 'Against the Constitutional Amendment', 'Non-partisan', true, 2, false)
    ON CONFLICT DO NOTHING;

  END LOOP;

  -- ============================================================================
  -- ANNE ARUNDEL COUNTY (District 32)
  -- ============================================================================
  v_county := 'Anne Arundel';
  v_district := '32';
  v_congressional_district := 'MD-5';

  RAISE NOTICE 'Processing % County, District %', v_county, v_district;

  -- Create ballot
  INSERT INTO md_ballots (
    election_date,
    county,
    legislative_district,
    congressional_district,
    election_name
  ) VALUES (
    '2026-06-23',
    v_county,
    v_district,
    v_congressional_district,
    '2026 Maryland Republican Primary'
  )
  ON CONFLICT (county, legislative_district, congressional_district) 
  DO UPDATE SET updated_at = NOW()
  RETURNING id INTO v_ballot_id;

  -- RACE 1: U.S. Representative, District 5
  INSERT INTO md_ballot_races (
    ballot_id, race_title, race_type, position_order, incumbent_name, max_selections
  ) VALUES (
    v_ballot_id,
    'U.S. Representative, District 5',
    'federal',
    1,
    'Glenn Ivey (D) - Incumbent',
    1
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_race_id;

  INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order, is_placeholder) VALUES
    (v_race_id, 'Republican Candidate A', 'Republican', true, 1, true),
    (v_race_id, 'Republican Candidate B', 'Republican', false, 2, true)
  ON CONFLICT DO NOTHING;

  -- RACE 2: Governor (Statewide)
  INSERT INTO md_ballot_races (
    ballot_id, race_title, race_type, position_order, incumbent_name, max_selections
  ) VALUES (
    v_ballot_id,
    'Governor',
    'state',
    2,
    'Wes Moore (D) - Incumbent',
    1
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_race_id;

  INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order, is_placeholder) VALUES
    (v_race_id, 'Republican Candidate A', 'Republican', true, 1, true),
    (v_race_id, 'Republican Candidate B', 'Republican', false, 2, true),
    (v_race_id, 'Republican Candidate C', 'Republican', false, 3, true),
    (v_race_id, 'Republican Candidate D', 'Republican', false, 4, true)
  ON CONFLICT DO NOTHING;

  -- RACE 3: State Senator, District 32
  INSERT INTO md_ballot_races (
    ballot_id, race_title, race_type, position_order, incumbent_name, max_selections
  ) VALUES (
    v_ballot_id,
    'State Senator, District 32',
    'state',
    3,
    NULL,
    1
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_race_id;

  INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order, is_placeholder) VALUES
    (v_race_id, 'Republican Candidate A', 'Republican', true, 1, true),
    (v_race_id, 'Republican Candidate B', 'Republican', false, 2, true)
  ON CONFLICT DO NOTHING;

  -- RACE 4: House of Delegates, District 32
  INSERT INTO md_ballot_races (
    ballot_id, race_title, race_type, position_order, incumbent_name, max_selections
  ) VALUES (
    v_ballot_id,
    'House of Delegates, District 32',
    'state',
    4,
    NULL,
    3
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_race_id;

  INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order, is_placeholder) VALUES
    (v_race_id, 'Republican Candidate A', 'Republican', true, 1, true),
    (v_race_id, 'Republican Candidate B', 'Republican', true, 2, true),
    (v_race_id, 'Republican Candidate C', 'Republican', true, 3, true),
    (v_race_id, 'Republican Candidate D', 'Republican', false, 4, true)
  ON CONFLICT DO NOTHING;

  -- RACE 5: County Executive
  INSERT INTO md_ballot_races (
    ballot_id, race_title, race_type, position_order, incumbent_name, max_selections
  ) VALUES (
    v_ballot_id,
    v_county || ' County Executive',
    'county',
    5,
    'Steuart Pittman (D) - Incumbent',
    1
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_race_id;

  INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order, is_placeholder) VALUES
    (v_race_id, 'Republican Candidate A', 'Republican', true, 1, true),
    (v_race_id, 'Republican Candidate B', 'Republican', false, 2, true)
  ON CONFLICT DO NOTHING;

  -- RACE 6: County Council At-Large
  INSERT INTO md_ballot_races (
    ballot_id, race_title, race_type, position_order, incumbent_name, max_selections
  ) VALUES (
    v_ballot_id,
    v_county || ' County Council At-Large',
    'county',
    6,
    'Multiple Incumbents',
    4
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_race_id;

  INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order, is_placeholder) VALUES
    (v_race_id, 'Republican Candidate A', 'Republican', true, 1, true),
    (v_race_id, 'Republican Candidate B', 'Republican', true, 2, true),
    (v_race_id, 'Republican Candidate C', 'Republican', true, 3, true),
    (v_race_id, 'Republican Candidate D', 'Republican', true, 4, true),
    (v_race_id, 'Republican Candidate E', 'Republican', false, 5, true)
  ON CONFLICT DO NOTHING;

  -- RACE 7: Board of Education
  INSERT INTO md_ballot_races (
    ballot_id, race_title, race_type, position_order, incumbent_name, max_selections
  ) VALUES (
    v_ballot_id,
    v_county || ' Board of Education',
    'local',
    7,
    NULL,
    2
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_race_id;

  INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order, is_placeholder) VALUES
    (v_race_id, 'Endorsed Candidate A', 'Non-partisan', true, 1, true),
    (v_race_id, 'Endorsed Candidate B', 'Non-partisan', true, 2, true),
    (v_race_id, 'Other Candidate C', 'Non-partisan', false, 3, true),
    (v_race_id, 'Other Candidate D', 'Non-partisan', false, 4, true)
  ON CONFLICT DO NOTHING;

  -- RACE 8: Circuit Court Judge
  INSERT INTO md_ballot_races (
    ballot_id, race_title, race_type, position_order, max_selections
  ) VALUES (
    v_ballot_id,
    'Judge of the Circuit Court - Continuance in Office',
    'judicial',
    8,
    1
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_race_id;

  INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order, is_placeholder) VALUES
    (v_race_id, 'Yes', 'Non-partisan', true, 1, false),
    (v_race_id, 'No', 'Non-partisan', false, 2, false)
  ON CONFLICT DO NOTHING;

  -- RACE 9: Appellate Court Judge
  INSERT INTO md_ballot_races (
    ballot_id, race_title, race_type, position_order, max_selections
  ) VALUES (
    v_ballot_id,
    'Judge of the Appellate Court - Continuance in Office',
    'judicial',
    9,
    1
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_race_id;

  INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order, is_placeholder) VALUES
    (v_race_id, 'Yes', 'Non-partisan', true, 1, false),
    (v_race_id, 'No', 'Non-partisan', false, 2, false)
  ON CONFLICT DO NOTHING;

  -- RACE 10: Constitutional Amendment
  INSERT INTO md_ballot_races (
    ballot_id, race_title, race_type, position_order, max_selections
  ) VALUES (
    v_ballot_id,
    'Constitutional Amendment - Right to Reproductive Freedom',
    'ballot_question',
    10,
    1
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_race_id;

  INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order, is_placeholder) VALUES
    (v_race_id, 'For the Constitutional Amendment', 'Non-partisan', false, 1, false),
    (v_race_id, 'Against the Constitutional Amendment', 'Non-partisan', true, 2, false)
  ON CONFLICT DO NOTHING;

END $$;

-- Verify the clean 2026 ballot data
SELECT 
  b.county,
  b.legislative_district,
  b.congressional_district,
  r.position_order,
  r.race_title,
  r.incumbent_name,
  COUNT(c.id) as candidate_count,
  SUM(CASE WHEN c.hard_party_endorsed THEN 1 ELSE 0 END) as endorsed_count,
  SUM(CASE WHEN c.is_placeholder THEN 1 ELSE 0 END) as placeholder_count
FROM md_ballots b
JOIN md_ballot_races r ON b.id = r.ballot_id
LEFT JOIN md_ballot_candidates c ON r.id = c.race_id
WHERE b.election_date = '2026-06-23'
GROUP BY b.county, b.legislative_district, b.congressional_district, r.position_order, r.race_title, r.incumbent_name
ORDER BY b.county, b.legislative_district, r.position_order;
