# 2024 Polymarket Schema Fix

## Problem

The `seed_2024_polymarket_closed_markets.sql` script was written for a different database schema than what actually exists in production.

### Expected (Incorrect) Schema
```sql
polymarket_tracked_markets (
  polymarket_id TEXT,      -- ❌ doesn't exist
  question TEXT,            -- ❌ doesn't exist
  race_type TEXT,          -- ✅ exists (added in war_room_enhancements)
  office TEXT,             -- ❌ doesn't exist
  state TEXT,              -- ❌ doesn't exist
  district TEXT,           -- ❌ doesn't exist
  county TEXT,             -- ❌ doesn't exist
  is_active BOOLEAN,       -- ❌ wrong column name
  end_date TIMESTAMPTZ     -- ❌ doesn't exist
)
```

### Actual Schema
```sql
polymarket_tracked_markets (
  slug TEXT NOT NULL UNIQUE,           -- ✅ correct
  display_name TEXT NOT NULL,          -- ✅ correct
  category TEXT NOT NULL,              -- ✅ correct
  race_type TEXT,                      -- ✅ added by war_room_enhancements
  district_filter TEXT,                -- ✅ optional
  county_filter TEXT,                  -- ✅ optional
  priority INTEGER DEFAULT 1,          -- ✅ correct
  active BOOLEAN DEFAULT TRUE          -- ✅ correct (not is_active)
)

polymarket_odds (
  market_slug TEXT NOT NULL UNIQUE,    -- Links to tracked_markets.slug
  market_title TEXT NOT NULL,
  market_id TEXT,
  event_id TEXT,
  outcomes JSONB NOT NULL,
  prices JSONB NOT NULL,
  volume_24hr DECIMAL,
  price_24h_ago JSONB,
  price_change_24h JSONB,
  last_fetched_at TIMESTAMPTZ NOT NULL
)
```

## Solution

Created **`Scripts/seed_2024_polymarket_FIXED.sql`** that:

1. Uses correct column names (`slug`, `display_name`, `category`, `active`)
2. Removes non-existent columns (`polymarket_id`, `question`, `office`, `state`, `district`, `county`, `is_active`, `end_date`)
3. Properly inserts both tracked markets AND their odds data
4. Sets `active = false` to indicate closed/resolved markets

## Additional Fix: Race Matching Logic

Also updated `lib/supabase/ballotWithOdds.ts` to properly match ballot races with Polymarket odds:

### Added Presidential Matching
```typescript
// Presidential race matching
if (race.race_type === 'federal' && raceTitle.includes('president')) {
  if (oddsTitle.includes('president') && oddsTitle.includes('maryland')) {
    return odds;
  }
}
```

### Fixed Senate Matching
Changed from:
```typescript
raceTitle.includes('u.s. senator')  // Only matches "U.S. Senator"
```

To:
```typescript
raceTitle.includes('senator') || raceTitle.includes('senate')
// Matches both "U.S. Senator" and "United States Senator"
```

## Deployment

Updated `DEPLOY_2024_BALLOT_TESTING.md` to reference the fixed script:
- ❌ ~~`Scripts/seed_2024_polymarket_closed_markets.sql`~~
- ✅ `Scripts/seed_2024_polymarket_FIXED.sql`

## Results

After running the fixed script:
- ✅ 2 closed markets seeded (Presidential and Senate)
- ✅ Both show final odds (Harris 98.8%, Alsobrooks 100%)
- ✅ Both marked as `active = false` (betting closed)
- ✅ War Room properly displays closed markets with winners
- ✅ Ballot races correctly match with Polymarket odds

## Testing

1. Run `Scripts/seed_2024_polymarket_FIXED.sql` in Supabase
2. Verify with query:
   ```sql
   SELECT 
     m.slug,
     m.display_name,
     m.active,
     o.outcomes,
     o.prices
   FROM polymarket_tracked_markets m
   LEFT JOIN polymarket_odds o ON o.market_slug = m.slug
   WHERE m.slug LIKE 'maryland%';
   ```
3. Open War Room in app
4. Should see 2024 closed markets with final results

## Related Files
- `Scripts/seed_2024_polymarket_FIXED.sql` - New fixed seed script
- `lib/supabase/ballotWithOdds.ts` - Updated race matching logic
- `DEPLOY_2024_BALLOT_TESTING.md` - Updated deployment guide
