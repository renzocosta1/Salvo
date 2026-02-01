-- =============================================================================
-- LEGENDARY TEST DIRECTIVE: RAID THE CITADEL
-- =============================================================================
-- This script creates a test directive with 125/500 salvos (25% complete)
-- Run this in your Supabase SQL Editor
-- =============================================================================

-- Step 1: Get the Hard Party ID and a user from it
DO $$
DECLARE
  v_party_id UUID;
  v_author_id UUID;
  v_directive_id UUID;
  v_user_id UUID;
  i INT;
BEGIN
  -- Get the Hard Party ID
  SELECT id INTO v_party_id
  FROM parties
  WHERE name = 'Hard Party'
  LIMIT 1;

  IF v_party_id IS NULL THEN
    RAISE EXCEPTION 'Hard Party not found! Please check your parties table.';
  END IF;

  -- Get a user from the Hard Party to be the author (your account)
  SELECT id INTO v_author_id
  FROM profiles
  WHERE party_id = v_party_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_author_id IS NULL THEN
    RAISE EXCEPTION 'No users found in Hard Party! Please sign in first.';
  END IF;

  -- Step 2: Insert the LEGENDARY directive
  INSERT INTO directives (
    party_id,
    author_id,
    title,
    body,
    target_goal
  )
  VALUES (
    v_party_id,
    v_author_id,
    'RAID THE CITADEL',
    'Secure the perimeter and deploy the main salvo battery. Citizen-led operation.',
    500
  )
  RETURNING id INTO v_directive_id;

  RAISE NOTICE 'Created directive: % (ID: %)', 'RAID THE CITADEL', v_directive_id;

  -- Step 3: Insert 125 salvos (25% progress)
  -- This simulates 125 raid actions from various warriors
  FOR i IN 1..125 LOOP
    -- Get a random user from the party (or use author if only one user)
    SELECT id INTO v_user_id
    FROM profiles
    WHERE party_id = v_party_id
    ORDER BY RANDOM()
    LIMIT 1;

    -- Insert the salvo
    INSERT INTO salvos (
      user_id,
      directive_id,
      created_at
    )
    VALUES (
      v_user_id,
      v_directive_id,
      NOW() - (INTERVAL '1 hour' * RANDOM() * 24) -- Random time in last 24 hours
    );
  END LOOP;

  RAISE NOTICE 'Inserted 125 salvos (25%% complete)';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'LEGENDARY DIRECTIVE DEPLOYED!';
  RAISE NOTICE 'Title: RAID THE CITADEL';
  RAISE NOTICE 'Progress: 125 / 500 salvos (25%%)';
  RAISE NOTICE 'Party: Hard Party';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Refresh your Command Feed to see it!';

END $$;

-- Verification Query (optional - uncomment to check)
-- SELECT 
--   d.title,
--   d.target_goal,
--   COUNT(s.id) as current_salvos,
--   ROUND((COUNT(s.id)::decimal / d.target_goal * 100), 1) as progress_percent
-- FROM directives d
-- LEFT JOIN salvos s ON s.directive_id = d.id
-- WHERE d.title = 'RAID THE CITADEL'
-- GROUP BY d.id, d.title, d.target_goal;
