# Ballot & War Room Fixes - Deployment Guide

## Overview
These fixes address ballot ordering, incumbent display, county naming, and clean primary-only ballot data.

## Changes Made

### 1. Database Schema
- Added `incumbent_name` field to `md_ballot_races` table
- Added `max_selections` field support in TypeScript interfaces

### 2. Ballot Component (`OfficialBallotView.tsx`)
- **Read-only design** - shows endorsed candidates, no user interaction
- **Scantron-style ovals** (filled black for endorsed candidates)
- **Green highlighting** for endorsed candidates with "✓ ENDORSED" badges
- **Incumbent display** - shows current office holder
- **County display fix** - now correctly shows user's county (not hardcoded Montgomery)
- **Clean race titles** - removes "(Vote for up to X)" duplication

### 3. War Room HUD (`WarRoomHUD.tsx`)
- **Only shows races with active betting markets** (no more blank clutter)
- **Helper note** explaining that more markets will appear as primary season approaches

### 4. Ballot Data (Seed Scripts)

#### Anne Arundel County (`seed_anne_arundel_district_32.sql`)
- **Standardized ordering**: US Senator → US Rep D5 → Governor → State Senator → House of Delegates → County Executive → County Council → Board of Ed → Judges → Amendments
- **Added incumbents** for all applicable races
- **Republican PRIMARY only** - no Democrat candidates (this is a primary ballot)
- **Added judicial races** (Circuit Court, Appellate Court)
- **Added ballot question** (Constitutional Amendment example)

#### Montgomery County (`seed_montgomery_primary_clean.sql`)
- **Clean PRIMARY data** - only Republican candidates competing in Republican primary
- **Removes incorrect general election data** (Wes Moore vs Dan Cox)
- **Covers all 6 districts**: 15, 16, 17, 18, 19, 20
- **Correct Congressional Districts**: MD-6 for most, MD-8 for District 20
- **Standardized ordering** matching Anne Arundel

## Deployment Steps

### Step 1: Add new columns (incumbent_name and max_selections)
Run entire file: `Scripts/add_max_selections_column.sql`

Or run in Supabase SQL Editor:

```sql
ALTER TABLE md_ballot_races ADD COLUMN IF NOT EXISTS incumbent_name TEXT;
ALTER TABLE md_ballot_races ADD COLUMN IF NOT EXISTS max_selections INTEGER DEFAULT 1;
```

### Step 2: Clean up old Montgomery data
Run in Supabase SQL Editor:

```sql
-- From: Scripts/cleanup_montgomery_old_data.sql
DELETE FROM md_ballot_candidates
WHERE race_id IN (
  SELECT r.id 
  FROM md_ballot_races r
  JOIN md_ballots b ON r.ballot_id = b.id
  WHERE b.county = 'Montgomery'
);

DELETE FROM md_ballot_races
WHERE ballot_id IN (
  SELECT id FROM md_ballots WHERE county = 'Montgomery'
);

DELETE FROM md_ballots
WHERE county = 'Montgomery';
```

### Step 3: Seed clean Montgomery PRIMARY data
Run entire file: `Scripts/seed_montgomery_primary_clean.sql`

### Step 4: Update Anne Arundel with incumbents and judges
Run entire file: `Scripts/seed_anne_arundel_district_32.sql`
(This uses ON CONFLICT DO NOTHING, so it won't duplicate existing data)

### Step 5: Standardize ordering across all ballots
Run in Supabase SQL Editor (from `Scripts/fix_ballot_ordering_and_incumbents.sql`):

```sql
-- Update U.S. Senator races (position 1)
UPDATE md_ballot_races
SET position_order = 1
WHERE race_title ILIKE '%U.S. Senator%';

-- Update U.S. Representative races (position 2)
UPDATE md_ballot_races
SET position_order = 2
WHERE race_title ILIKE '%U.S. Representative%';

-- Update Governor races (position 3)
UPDATE md_ballot_races
SET position_order = 3
WHERE race_title ILIKE '%Governor%';

-- Update State Senator races (position 4)
UPDATE md_ballot_races
SET position_order = 4
WHERE race_title ILIKE '%State Senator%';

-- Update House of Delegates races (position 5)
UPDATE md_ballot_races
SET position_order = 5
WHERE race_title ILIKE '%House of Delegates%';

-- Update County Executive races (position 6)
UPDATE md_ballot_races
SET position_order = 6
WHERE race_title ILIKE '%County Executive%';

-- Update County Council races (position 7)
UPDATE md_ballot_races
SET position_order = 7
WHERE race_title ILIKE '%County Council%';

-- Update Board of Education races (position 8)
UPDATE md_ballot_races
SET position_order = 8
WHERE race_title ILIKE '%Board of Education%';

-- Update Judicial races (position 9+)
UPDATE md_ballot_races
SET position_order = 9
WHERE race_type = 'judicial' AND race_title ILIKE '%Circuit Court%';

UPDATE md_ballot_races
SET position_order = 10
WHERE race_type = 'judicial' AND race_title ILIKE '%Appellate Court%';

-- Update Ballot Questions (position 11+)
UPDATE md_ballot_races
SET position_order = 11
WHERE race_type = 'ballot_question';
```

### Step 6: Verify ballot data
Run in Supabase SQL Editor:

```sql
SELECT 
  b.county,
  b.legislative_district,
  r.position_order,
  r.race_title,
  r.incumbent_name,
  COUNT(c.id) as candidate_count,
  SUM(CASE WHEN c.hard_party_endorsed THEN 1 ELSE 0 END) as endorsed_count
FROM md_ballots b
JOIN md_ballot_races r ON b.id = r.ballot_id
LEFT JOIN md_ballot_candidates c ON r.id = c.race_id
GROUP BY b.county, b.legislative_district, r.position_order, r.race_title, r.incumbent_name
ORDER BY b.county, b.legislative_district, r.position_order;
```

You should see:
- Anne Arundel District 32: 11 races (US Senator, US Rep D5, Governor, State Senator, House of Delegates, County Exec, County Council, Board of Ed, 2 Judges, 1 Amendment)
- Montgomery Districts 15-20: 10 races each (similar structure)
- All races have ONLY Republican candidates (except non-partisan Board of Ed and Judicial)
- All races have incumbents listed
- Position order is consistent: 1 (Senate), 2 (House), 3 (Governor), 4 (State Senate), 5 (Delegates), etc.

### Step 7: Test in app
1. **Restart Expo** (if running): `Ctrl+C` in terminal, then `npx expo start`
2. **Refresh app** on both accounts:
   - Montgomery County account (District 15, MD-6)
   - Anne Arundel County account (District 32, MD-5)
3. **Check Ballot tab**:
   - Correct county name in header
   - Races in same order for both accounts
   - Incumbents displayed
   - Only Republican PRIMARY candidates (no Democrats)
   - Green highlighted endorsed candidates
   - Judges and amendments at bottom
4. **Check War Room**:
   - Only shows races with active Polymarket odds (cleaner)
   - Governor at top, MD-6 and MD-5 in "Your Ballot Races" section

## Expected Results

### Ballot Ordering (Both Accounts):
1. U.S. Senator (Statewide - Larry Hogan endorsed)
2. U.S. Representative (District-specific - MD-5 or MD-6)
3. Governor (Statewide - Dan Cox endorsed)
4. State Senator (District-specific)
5. House of Delegates (District-specific, Vote for up to 3)
6. County Executive (County-specific)
7. County Council (County-specific)
8. Board of Education (County-specific)
9. Circuit Court Judge
10. Appellate Court Judge
11. Constitutional Amendment

### Visual Design:
- Official Maryland ballot aesthetic
- Black and white with green highlighting for endorsed
- Filled black ovals for endorsed candidates
- Incumbent shown in blue italic text under race title
- "Vote for 1" or "Vote for up to X" instructions
- Clean, easy to read on mobile

## Troubleshooting

### If Montgomery ballot still shows general election data:
- Make sure you ran `cleanup_montgomery_old_data.sql` first
- Then run `seed_montgomery_primary_clean.sql`
- Refresh the app

### If county name is still wrong:
- Check that user's profile has correct `county` field set
- The component now reads from `profile.county`, not hardcoded

### If races are in wrong order:
- Run the position_order UPDATE statements from Step 5
- The ordering should be identical across all ballots now
