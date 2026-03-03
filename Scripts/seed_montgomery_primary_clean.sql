-- ============================================================================
-- MONTGOMERY COUNTY - CLEAN REPUBLICAN PRIMARY BALLOT
-- ============================================================================
-- This replaces the old seed data with proper PRIMARY ballot data
-- Only Republican candidates competing in the Republican primary
-- ============================================================================

DO $$
DECLARE
  v_ballot_id UUID;
  v_race_id UUID;
  v_district TEXT;
BEGIN
  -- Montgomery County Districts to seed: 15, 16, 17, 18, 19, 20
  FOR v_district IN 
    SELECT unnest(ARRAY['15', '16', '17', '18', '19', '20'])
  LOOP
    RAISE NOTICE 'Processing District %', v_district;

    -- Get Congressional District for Montgomery County districts
    -- MD-6 covers parts of Montgomery (Districts 15, 16, 17, 18, 19, 39)
    -- MD-8 covers other parts (District 20)
    
    -- Create/Update ballot
    INSERT INTO md_ballots (
      election_date,
      county,
      legislative_district,
      congressional_district,
      election_name
    ) VALUES (
      '2026-06-23',
      'Montgomery',
      v_district,
      CASE 
        WHEN v_district IN ('15', '16', '17', '18', '19', '39') THEN 'MD-6'
        WHEN v_district = '20' THEN 'MD-8'
        ELSE 'MD-6'
      END,
      '2026 Maryland Republican Primary'
    )
    ON CONFLICT (county, legislative_district, congressional_district) 
    DO UPDATE SET updated_at = NOW()
    RETURNING id INTO v_ballot_id;

    -- ========================================================================
    -- FEDERAL RACES (Statewide & District)
    -- ========================================================================

    -- 1. U.S. Senator (Statewide, Republican Primary)
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
    RETURNING id INTO v_race_id;

    -- Republican Primary candidates for U.S. Senate
    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order) VALUES
      (v_race_id, 'Larry Hogan', 'Republican', true, 1),
      (v_race_id, 'Robin Ficker', 'Republican', false, 2),
      (v_race_id, 'Rick Hoover', 'Republican', false, 3)
    ON CONFLICT DO NOTHING;

    -- 2. U.S. Representative (District-specific, Republican Primary)
    IF v_district IN ('15', '16', '17', '18', '19', '39') THEN
      -- MD-6 Congressional District
      INSERT INTO md_ballot_races (
        ballot_id,
        race_title,
        race_type,
        position_order,
        incumbent_name
      ) VALUES (
        v_ballot_id,
        'U.S. Representative, District 6',
        'federal',
        2,
        'David Trone (D) - Incumbent, running for Senate'
      )
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_race_id;

      -- Republican Primary candidates for MD-6
      INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order) VALUES
        (v_race_id, 'Neil Parrott', 'Republican', true, 1),
        (v_race_id, 'Yuripzy Morgan', 'Republican', false, 2)
      ON CONFLICT DO NOTHING;

    ELSIF v_district = '20' THEN
      -- MD-8 Congressional District
      INSERT INTO md_ballot_races (
        ballot_id,
        race_title,
        race_type,
        position_order,
        incumbent_name
      ) VALUES (
        v_ballot_id,
        'U.S. Representative, District 8',
        'federal',
        2,
        'Jamie Raskin (D) - Incumbent'
      )
      ON CONFLICT DO NOTHING
      RETURNING id INTO v_race_id;

      -- Republican Primary candidates for MD-8 (placeholder - update when known)
      INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order) VALUES
        (v_race_id, 'Republican Candidate', 'Republican', false, 1)
      ON CONFLICT DO NOTHING;
    END IF;

    -- ========================================================================
    -- STATE RACES
    -- ========================================================================

    -- 3. Governor (Statewide, Republican Primary)
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
    RETURNING id INTO v_race_id;

    -- Republican Primary candidates for Governor
    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order) VALUES
      (v_race_id, 'Dan Cox', 'Republican', true, 1),
      (v_race_id, 'Ed Hale', 'Republican', false, 2),
      (v_race_id, 'Christopher Bouchat', 'Republican', false, 3),
      (v_race_id, 'Carl Brunner', 'Republican', false, 4),
      (v_race_id, 'Steve Hershey', 'Republican', false, 5),
      (v_race_id, 'John Myrick', 'Republican', false, 6),
      (v_race_id, 'Larry Hogan', 'Republican', false, 7),
      (v_race_id, 'Kurt Wedekind', 'Republican', false, 8)
    ON CONFLICT DO NOTHING;

    -- 4. State Senator (District-specific, Republican Primary)
    INSERT INTO md_ballot_races (
      ballot_id,
      race_title,
      race_type,
      position_order,
      incumbent_name
    ) VALUES (
      v_ballot_id,
      'State Senator, District ' || v_district,
      'state',
      4,
      NULL -- Will be set per district
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_race_id;

    -- State Senator candidates (placeholder - varies by district)
    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order) VALUES
      (v_race_id, 'Republican Candidate 1', 'Republican', false, 1),
      (v_race_id, 'Republican Candidate 2', 'Republican', false, 2)
    ON CONFLICT DO NOTHING;

    -- 5. House of Delegates (District-specific, Republican Primary)
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
      3  -- Vote for up to 3
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_race_id;

    -- Delegates candidates (placeholder - 3-6 Republican candidates typical)
    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order) VALUES
      (v_race_id, 'Republican Delegate A', 'Republican', true, 1),
      (v_race_id, 'Republican Delegate B', 'Republican', true, 2),
      (v_race_id, 'Republican Delegate C', 'Republican', true, 3),
      (v_race_id, 'Republican Delegate D', 'Republican', false, 4)
    ON CONFLICT DO NOTHING;

    -- ========================================================================
    -- COUNTY RACES (Montgomery County-specific)
    -- ========================================================================

    -- 6. County Executive (Montgomery County, Republican Primary)
    INSERT INTO md_ballot_races (
      ballot_id,
      race_title,
      race_type,
      position_order,
      incumbent_name
    ) VALUES (
      v_ballot_id,
      'Montgomery County Executive',
      'county',
      6,
      'Marc Elrich (D) - Incumbent'
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_race_id;

    -- County Executive candidates (Republican Primary)
    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order) VALUES
      (v_race_id, 'Reardon Sullivan', 'Republican', true, 1),
      (v_race_id, 'Republican Candidate 2', 'Republican', false, 2)
    ON CONFLICT DO NOTHING;

    -- 7. County Council At-Large (Montgomery County, Republican Primary)
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
      'Multiple Incumbents',
      4  -- Vote for up to 4
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_race_id;

    -- County Council candidates (Republican Primary)
    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order) VALUES
      (v_race_id, 'Republican Candidate A', 'Republican', true, 1),
      (v_race_id, 'Republican Candidate B', 'Republican', true, 2),
      (v_race_id, 'Republican Candidate C', 'Republican', true, 3),
      (v_race_id, 'Republican Candidate D', 'Republican', true, 4),
      (v_race_id, 'Republican Candidate E', 'Republican', false, 5)
    ON CONFLICT DO NOTHING;

    -- 8. Board of Education (Montgomery County, Non-partisan)
    INSERT INTO md_ballot_races (
      ballot_id,
      race_title,
      race_type,
      position_order,
      max_selections
    ) VALUES (
      v_ballot_id,
      'Board of Education At-Large',
      'local',
      8,
      2  -- Vote for up to 2
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_race_id;

    -- Board of Education candidates (Non-partisan, but party endorsed)
    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order) VALUES
      (v_race_id, 'Endorsed Candidate 1', 'Non-partisan', true, 1),
      (v_race_id, 'Endorsed Candidate 2', 'Non-partisan', true, 2),
      (v_race_id, 'Other Candidate 3', 'Non-partisan', false, 3),
      (v_race_id, 'Other Candidate 4', 'Non-partisan', false, 4)
    ON CONFLICT DO NOTHING;

    -- ========================================================================
    -- JUDICIAL RACES (Circuit Court Judges - Non-partisan)
    -- ========================================================================

    -- 9. Circuit Court Judge
    INSERT INTO md_ballot_races (
      ballot_id,
      race_title,
      race_type,
      position_order
    ) VALUES (
      v_ballot_id,
      'Judge of the Circuit Court',
      'judicial',
      9
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_race_id;

    -- Circuit Court candidates (Yes/No retention)
    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order) VALUES
      (v_race_id, 'Judge Mary Beth Smith - Continuance in Office', 'Non-partisan', true, 1),
      (v_race_id, 'Judge John Doe - Continuance in Office', 'Non-partisan', false, 2)
    ON CONFLICT DO NOTHING;

    -- ========================================================================
    -- BALLOT QUESTIONS (Constitutional Amendments, etc.)
    -- ========================================================================

    -- 10. Constitutional Amendment (if any)
    -- Placeholder - update when actual amendments are proposed
    INSERT INTO md_ballot_races (
      ballot_id,
      race_title,
      race_type,
      position_order
    ) VALUES (
      v_ballot_id,
      'Constitutional Amendment - Example Question',
      'ballot_question',
      10
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_race_id;

    -- Amendment options (Yes/No)
    INSERT INTO md_ballot_candidates (race_id, candidate_name, candidate_party, hard_party_endorsed, candidate_order) VALUES
      (v_race_id, 'Yes', 'Non-partisan', true, 1),
      (v_race_id, 'No', 'Non-partisan', false, 2)
    ON CONFLICT DO NOTHING;

  END LOOP;
END $$;

-- Verify the clean data
SELECT 
  b.county,
  b.legislative_district,
  b.congressional_district,
  r.position_order,
  r.race_title,
  r.incumbent_name,
  c.candidate_name,
  c.candidate_party,
  c.hard_party_endorsed
FROM md_ballots b
JOIN md_ballot_races r ON b.id = r.ballot_id
JOIN md_ballot_candidates c ON r.id = c.race_id
WHERE b.county = 'Montgomery'
ORDER BY b.legislative_district, r.position_order, c.candidate_order;
