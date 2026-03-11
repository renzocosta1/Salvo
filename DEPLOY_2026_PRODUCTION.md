# 🚀 Deploy 2026 Production - Live Polymarket & Beta Launch

This guide transitions the app from 2024 test data to 2026 production-ready state with **LIVE Polymarket odds**.

---

## 📋 Overview

This deployment:
- ✅ Updates all dates from 2024 to 2026
- ✅ Removes test banners and messaging
- ✅ Seeds LIVE 2026 Maryland Governor Republican Primary market
- ✅ Enables real-time odds updates
- ✅ Adds "Ballot Coming Soon" messaging
- ✅ Keeps endorsement system ready for April 2026

---

## Phase 1: Clean Up Test Data

### Step 1: Remove 2024 Test Markets

Run in Supabase SQL Editor:

```sql
-- File: Scripts/seed_2026_live_polymarket.sql
```

This script:
- ❌ Deletes all 2024 closed markets (Presidential, Senate test data)
- ✅ Seeds LIVE 2026 Maryland Governor (R) Primary market
- ✅ Sets up 8 candidates with current odds
- ✅ Marks market as `active = true` for real-time updates

**Current Odds** (as of Feb 13, 2026):
- Dan Cox: 30% 🔥
- Ed Hale: 23.4%
- Carl Brunner: 8.8%
- Christopher Bouchat: 8%
- Steve Hershey: 4%
- Kurt Wedekind: 3%
- John Myrick: 3%
- Larry Hogan: 2%

**Expected Result**: 1 active market with 8 candidates, $25K+ trading volume

---

## Phase 2: Deploy Edge Function

### Step 2: Deploy Polymarket Fetcher

Deploy the Edge Function to enable auto-refresh:

```bash
npx supabase functions deploy fetch-polymarket-odds
```

This Edge Function:
- 📡 Fetches latest odds from Polymarket Gamma API
- 🔄 Updates database every time it's called
- 📊 Tracks 24-hour price changes
- 🚨 Triggers RED ALERTS for major shifts (>5% change or lead changes)

**Test it works:**
```bash
npx supabase functions invoke fetch-polymarket-odds
```

**Expected Response:**
```json
{
  "success": true,
  "updated": 1,
  "markets": ["maryland-governor-republican-primary-winner"],
  "timestamp": "2026-02-13T..."
}
```

### Step 3: Set Up Auto-Refresh (Optional but Recommended)

**Option A: Cron Job** (Best for production)

In Supabase Dashboard → Database → Cron Jobs:
```sql
SELECT cron.schedule(
  'fetch-polymarket-odds-every-15min',
  '*/15 * * * *',  -- Every 15 minutes
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/fetch-polymarket-odds',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
  );
  $$
);
```

**Option B: Client-Side Refresh** (Already implemented!)
- Users can pull-to-refresh on War Room
- App automatically refreshes when they visit
- Real-time subscriptions push updates to all users

---

## Phase 3: Test Live Odds

### Step 4: Verify Live Integration

1. **In Supabase**, check the data:
   ```sql
   SELECT 
     market_title,
     outcomes,
     prices,
     volume_24hr,
     last_fetched_at,
     active
   FROM polymarket_odds
   WHERE market_slug = 'maryland-governor-republican-primary-winner';
   ```

2. **In Expo app**, reload and check War Room:
   - Should see "🎯 LIVE ODDS" section
   - Dan Cox at ~30%
   - Ed Hale at ~23.4%
   - Live countdown to June 24, 2026
   - Pull to refresh should fetch latest odds

3. **Check the Edge Function logs** in Supabase:
   - Go to Functions → fetch-polymarket-odds → Logs
   - Should see successful API calls
   - Verify it's updating the database

---

## Phase 4: Configure Ballot "Coming Soon" State

### Step 5: Update Ballot Screen

**Already done!** The ballot now shows:
- ✅ Beautiful "Coming Soon" screen when no data
- ✅ Explains April 2026 release timeline
- ✅ Shows primary election dates
- ✅ Emphasizes unified bloc voting strategy

**What users see:**
```
📅 Ballot Coming Soon!

The official 2026 Maryland Republican Primary 
ballot will be published in April 2026.

Once released, Hard Party leaders will research 
and endorse the best candidates.

We vote as one unified bloc! 🎯

📅 2026 PRIMARY DATES
• Registration Deadline: May 3, 2026
• Early Voting: June 12-20, 2026
• Election Day: June 24, 2026
```

---

## Phase 5: Test Everything

### Step 6: Full App Test

1. **War Room**:
   - [ ] Shows countdown to June 24, 2026
   - [ ] Displays live Governor race odds
   - [ ] Dan Cox leading at ~30%
   - [ ] Pull-to-refresh works
   - [ ] Numbers update in real-time

2. **Ballot**:
   - [ ] Shows "Coming Soon" message (no ballot data yet)
   - [ ] Clean, professional messaging
   - [ ] Primary dates visible
   - [ ] No errors or crashes

3. **Admin Endorsements**:
   - [ ] Can access with state leader account
   - [ ] Geography filter works
   - [ ] Shows message: "No ballot data yet" (expected)
   - [ ] Will work automatically when ballot is seeded in April

4. **Missions**:
   - [ ] Photo verification working
   - [ ] XP rewards processing
   - [ ] Missions list showing correctly

5. **Invite System**:
   - [ ] Referral codes generate
   - [ ] Share link works
   - [ ] Tracking shows invites

---

## 🎯 Production Readiness Status

### ✅ Ready for Beta (RIGHT NOW)
- War Room with LIVE odds
- Mission system fully working
- Endorsement admin ready
- Invite/referral system active
- Clean, professional UI

### ⏳ Waiting on External Data (April 2026)
- Official ballot from MD State Board of Elections
- Complete candidate lists for all races
- District-specific race assignments

### 🔮 Future Enhancements (Post-Beta)
- Squad leaderboards
- Weekly check-in rewards
- More Polymarket markets (US House districts, etc.)
- Multi-state expansion

---

## 📞 Support & Debugging

### If Polymarket odds don't update:
```sql
-- Manually trigger refresh
SELECT net.http_post(
  url := 'https://YOUR_PROJECT.supabase.co/functions/v1/fetch-polymarket-odds',
  headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
);
```

### If War Room shows no data:
- Check that `seed_2026_live_polymarket.sql` was run
- Verify market shows `active = true`
- Check Edge Function is deployed

### If ballot shows error:
- This is expected! Ballot data releases April 2026
- Should show "Coming Soon" message, not an error
- Verify `races.length === 0` triggers the coming soon UI

---

## 🎉 You're Ready for Beta Launch!

With Phase 1-5 complete:
- ✅ Live political intelligence (Polymarket odds updating in real-time)
- ✅ Professional messaging about ballot timeline
- ✅ All core features working
- ✅ Clean, game-like UI
- ✅ Ready to onboard beta testers

**Next Steps:**
1. Run `Scripts/seed_2026_live_polymarket.sql`
2. Deploy Edge Function (if not already)
3. Test in Expo app
4. Share with beta testers!

The CENTCOM/War Room is LIVE! 🎯🔥
