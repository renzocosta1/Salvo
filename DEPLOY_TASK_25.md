# Task 25 Deployment Guide

## Quick Deployment Steps

### 1. Run Database Migrations

Run the War Room enhancements SQL script in your Supabase SQL Editor:

```bash
# Navigate to Supabase Dashboard > SQL Editor
# Copy and paste the contents of:
Scripts/create_war_room_enhancements.sql

# Then execute
```

This will:
- Add personalization columns to `polymarket_tracked_markets`
- Add price tracking columns to `polymarket_odds`
- Create `polymarket_alerts` table
- Create `check_odds_for_alerts()` function
- Set up RLS policies

### 2. Deploy Edge Function

Deploy the updated Polymarket fetcher with alert checking:

```bash
npx supabase functions deploy fetch-polymarket-odds --no-verify-jwt
```

### 3. Enable Supabase Realtime

In Supabase Dashboard:
1. Go to Database > Replication
2. Enable Realtime for these tables:
   - `polymarket_odds`
   - `polymarket_alerts`

### 4. Test the System

#### Test 1: Manual Odds Refresh
```bash
# In your browser console or API client
fetch('https://[YOUR-PROJECT-REF].supabase.co/functions/v1/fetch-polymarket-odds', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer [YOUR-ANON-KEY]'
  }
})
```

#### Test 2: Check Alerts Function
```sql
-- Run in SQL Editor
SELECT check_odds_for_alerts();

-- View generated alerts
SELECT * FROM polymarket_alerts ORDER BY triggered_at DESC LIMIT 10;
```

#### Test 3: Verify Real-time Subscription
Open the app in Expo Go and:
1. Navigate to War Room tab
2. Open browser console/terminal logs
3. Manually update a row in `polymarket_odds` table in Supabase
4. Verify the War Room HUD updates instantly

### 5. Verify UI Components

Run the app:
```bash
npx expo start
```

Check:
- [ ] War Room HUD displays with personalized races
- [ ] Governor race shows as hero card
- [ ] Ballot tab shows official paper ballot format
- [ ] Endorsed candidates have green borders
- [ ] Auto-refresh works (wait 15 minutes or trigger manually)
- [ ] Pull-to-refresh works

## Troubleshooting

### Issue: No races showing in War Room
**Solution:** Verify your profile has `county`, `legislative_district`, and `congressional_district` set.

```sql
SELECT id, county, legislative_district, congressional_district 
FROM profiles 
WHERE id = '[YOUR-USER-ID]';
```

### Issue: Alerts not triggering
**Solution:** Check that odds have `price_24h_ago` data populated.

```sql
SELECT market_slug, price_24h_ago, price_change_24h 
FROM polymarket_odds;
```

If `price_24h_ago` is NULL, wait 24 hours or manually set it:
```sql
UPDATE polymarket_odds 
SET price_24h_ago = prices 
WHERE price_24h_ago IS NULL;
```

### Issue: Edge Function fails
**Solution:** Check Supabase Edge Function logs:
1. Go to Edge Functions > fetch-polymarket-odds
2. Click "Logs"
3. Look for errors in recent invocations

### Issue: Realtime not working
**Solution:** Ensure Realtime is enabled and subscriptions are properly set up:
1. Database > Replication > Enable for relevant tables
2. Check browser console for subscription errors
3. Verify Supabase client is initialized with correct URL/key

## Environment Variables

Make sure these are set in your Supabase Edge Function secrets:

```bash
npx supabase secrets list

# Should show:
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
```

## Performance Considerations

1. **Auto-refresh Interval:** Currently set to 15 minutes. Adjust in `WarRoomHUD.tsx` if needed:
```typescript
const autoRefreshInterval = setInterval(handleRefresh, 15 * 60 * 1000);
```

2. **Alert Deduplication:** Alerts are suppressed for:
   - Major shifts: 1 hour
   - Lead changes: 4 hours
   
   Adjust in `Scripts/create_war_room_enhancements.sql`:
```sql
AND triggered_at > NOW() - INTERVAL '1 hour'  -- Change this
```

3. **Realtime Bandwidth:** Consider rate limiting for high-traffic scenarios.

## Next Steps After Deployment

1. **Alpha Test:** Have Montgomery County users test the War Room
2. **Gather Feedback:** Collect user experience data
3. **Add Counties:** As users sign up from other counties, seed their ballot data
4. **Monitor Polymarket:** Add new tracked markets as they become available
5. **Optimize Performance:** Based on usage patterns and logs

## Rollback Plan

If issues arise, rollback steps:

1. **Revert Edge Function:**
```bash
# Deploy previous version from git
git checkout [previous-commit]
npx supabase functions deploy fetch-polymarket-odds --no-verify-jwt
```

2. **Remove UI Changes:**
```bash
# Revert specific files
git checkout [previous-commit] -- components/WarRoomHUD.tsx
git checkout [previous-commit] -- app/(tabs)/ballot.tsx
```

3. **Database Rollback:**
```sql
-- Remove new tables (use with caution!)
DROP TABLE IF EXISTS polymarket_alerts;
DROP FUNCTION IF EXISTS check_odds_for_alerts();

-- Revert column additions
ALTER TABLE polymarket_tracked_markets DROP COLUMN IF EXISTS race_type;
ALTER TABLE polymarket_tracked_markets DROP COLUMN IF EXISTS district_filter;
ALTER TABLE polymarket_tracked_markets DROP COLUMN IF EXISTS county_filter;
ALTER TABLE polymarket_odds DROP COLUMN IF EXISTS price_24h_ago;
ALTER TABLE polymarket_odds DROP COLUMN IF EXISTS price_change_24h;
ALTER TABLE polymarket_odds DROP COLUMN IF EXISTS alert_triggered;
ALTER TABLE polymarket_odds DROP COLUMN IF EXISTS last_alert_at;
```

## Support

If you encounter issues:
1. Check `TASK_25_WAR_ROOM_BALLOT_COMPLETE.md` for full implementation details
2. Review Supabase Edge Function logs
3. Check browser console for client-side errors
4. Verify database migrations completed successfully

---

**Ready to deploy? Start with Step 1!** 🚀
