# ⚔️ Deploy Squad Features & Weekly Check-In

This guide sets up the **squad leaderboards**, **team stats**, and **weekly check-in** system.

---

## 📋 What's New

### 1. **Squad Tab** 🆕
- District leaderboard (top 20 warriors in your district)
- County leaderboard (top 20 in your county)
- Live squad stats (total members, active today, total XP)
- Your district rank display
- Real-time updates via Supabase

### 2. **Weekly Check-In** 🆕
- Claim +50 XP once per week
- Streak bonus: +10 XP per consecutive week (max +100)
- Streak resets if you miss a week
- Built-in 7-day timer

### 3. **Live Polymarket** 🔥
- Real Maryland Governor 2026 odds
- Dan Cox leading at 30%
- Auto-refreshes every 15 minutes
- RED ALERTS for major shifts

---

## 🚀 Deployment Steps

### Step 1: Add Database Schema

Run in Supabase SQL Editor:

```sql
-- File: Scripts/add_squad_and_checkin_features.sql
```

This adds:
- ✅ `last_check_in_at`, `check_in_streak`, `total_check_ins` to profiles
- ✅ Performance indexes for leaderboards
- ✅ `claim_weekly_check_in()` function
- ✅ `get_district_leaderboard()` function
- ✅ `get_county_leaderboard()` function
- ✅ `get_squad_stats()` function

**Expected Result:**
```
✅ Squad features and weekly check-in database schema complete!
📊 Functions created: claim_weekly_check_in, get_district_leaderboard, get_county_leaderboard, get_squad_stats
🎯 Ready to build UI components!
```

---

### Step 2: Seed Live Polymarket

Run in Supabase SQL Editor:

```sql
-- File: Scripts/seed_2026_live_polymarket.sql
```

This:
- ❌ Deletes old 2024 test markets
- ✅ Seeds LIVE Maryland Governor (R) Primary 2026
- ✅ Sets current odds (Dan Cox 30%, Ed Hale 23.4%, etc.)
- ✅ Marks as `active = true` for real-time updates

**Expected Result:**
```
✅ Live 2026 Maryland Governor market seeded successfully!
📊 Current leader: Dan Cox at 30%
🔄 Odds will update automatically via Edge Function
🎯 Primary Election: June 24, 2026
```

---

### Step 3: Deploy Edge Function (If Not Already)

Check if deployed:
```bash
npx supabase functions list
```

If `fetch-polymarket-odds` is missing, deploy it:
```bash
npx supabase functions deploy fetch-polymarket-odds
```

Test it works:
```bash
npx supabase functions invoke fetch-polymarket-odds
```

**Expected Response:**
```json
{
  "success": true,
  "updated": 1,
  "markets": ["maryland-governor-republican-primary-winner"]
}
```

---

### Step 4: Verify New UI Components

Check that these files exist:
- ✅ `app/(tabs)/squad.tsx` - Squad screen with leaderboards
- ✅ `lib/supabase/squad.ts` - Squad data services

Check tabs updated:
- ✅ `app/(tabs)/_layout.tsx` - Should include Squad tab

---

## 🧪 Testing Guide

### Test 1: Weekly Check-In

1. Open app → Navigate to **Squad** tab
2. You should see "Weekly Check-In" card at top
3. Click "Claim Check-In"
4. **First Time**: Should show "+50 XP" (base reward)
5. Check your profile XP increased by 50
6. Try clicking again immediately
7. Should show error: "Come back in 7 days"
8. **Next Week**: Check in again
9. Should show "+60 XP (Base: 50, Streak: +10)"
10. Streak counter increments to "2 weeks"

**Edge Cases:**
- Miss a week (>14 days): Streak resets to 0
- Check in exactly 7 days later: Streak continues
- Check in at 6 days: Error "Too soon"

---

### Test 2: District Leaderboard

1. Navigate to **Squad** tab
2. Default view: "District [your district]"
3. Should see:
   - Your district rank banner (e.g., "🎯 You're ranked #7")
   - Squad stats (total members, active today, total XP)
   - Top warrior highlighted
   - List of top 20 warriors
   - YOU highlighted in green border
   - Leaders show "LEADER" badge

4. Complete a mission (earn XP)
5. Pull down to refresh
6. Your rank should update

**Expected Data:**
```
🏆 DISTRICT 32 LEADERBOARD
━━━━━━━━━━━━━━━━━━━━━━━━
🥇 John Smith     1,250 XP  Level 5  [LEADER]
🥈 Jane Doe       1,100 XP  Level 4
🥉 Bob Johnson      950 XP  Level 3
#4 Alice Cooper     800 XP  Level 3
...
#7 YOU              750 XP  Level 3  (highlighted)
```

---

### Test 3: County Leaderboard

1. On Squad tab, toggle to "County" view
2. Should see top 20 across entire county
3. Shows district labels for each user
4. Your entry still highlighted

---

### Test 4: Squad Stats

Check these numbers update correctly:
- **Warriors**: Total users in your district
- **Active Today**: Users who logged in today
- **Total XP**: Sum of all district members' XP
- **Missions**: Total completed missions

---

### Test 5: Live Polymarket in War Room

1. Navigate to **War Room** tab
2. Should see "🎯 LIVE ODDS" section
3. Verify:
   - Maryland Governor (R) Primary shows
   - Dan Cox ~30%, Ed Hale ~23%
   - "Last Updated" timestamp
   - Pull to refresh updates odds

4. Wait 5-10 minutes
5. Pull to refresh
6. Odds should change if Polymarket updated

**RED ALERT Test:**
- Wait for a candidate to shift >5% in one update
- Should trigger RED ALERT banner
- Shows which candidate surged/dropped

---

### Test 6: Real-Time Updates

1. Open app on two devices (same account)
2. On Device A: Complete a mission (+100 XP)
3. On Device B: Squad tab should auto-update your rank
4. No manual refresh needed (Supabase Realtime)

---

## 🎯 Beta Testing Checklist

### Core Social Features:
- [ ] Weekly check-in works (claim XP)
- [ ] Streak tracking works (miss week = reset)
- [ ] District leaderboard displays
- [ ] County leaderboard displays
- [ ] Squad stats accurate
- [ ] Your rank shows correctly
- [ ] Real-time updates work

### Live Polymarket:
- [ ] War Room shows Dan Cox odds
- [ ] Pull-to-refresh updates odds
- [ ] Numbers match Polymarket website
- [ ] RED ALERTS trigger on >5% shifts

### Referral System:
- [ ] Generate invite link
- [ ] Share link works
- [ ] New user signs up with code
- [ ] Referrer gets +100 XP
- [ ] Stats update correctly

---

## 🔥 Squad Feature Behavior

### Leaderboard Ranking Logic:
1. **Primary**: XP (highest first)
2. **Secondary**: Level (highest first)
3. **Tiebreaker**: Account creation date (oldest first)

### Squad Stats Calculation:
- **Warriors**: `COUNT(profiles)` in district
- **Active Today**: `COUNT(profiles WHERE updated_at::DATE = CURRENT_DATE)`
- **Total XP**: `SUM(profiles.xp)` in district
- **Missions**: `COUNT(completed_missions)` in district

### Weekly Check-In Rules:
- ✅ Can claim once per week (168 hours)
- ✅ Streak continues if claimed within 14 days
- ❌ Streak resets if >14 days pass
- 🎁 Rewards:
  - Week 1: +50 XP
  - Week 2: +60 XP (50 base + 10 streak)
  - Week 3: +70 XP (50 base + 20 streak)
  - ...
  - Week 10+: +150 XP (50 base + 100 max streak)

---

## 🎮 What Beta Testers Will See

### New Squad Tab:
```
⚔️ Your Squad
Anne Arundel County, District 32
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 WEEKLY CHECK-IN
Earn +50 XP every week (+ streak bonus)
[Claim Check-In]
Current streak: 0 weeks

📊 Squad Stats
────────────────────────────
Warriors:        47        Active Today:     12
Total XP:    35,000        Missions:        156

🏆 Top Warrior
John Smith
1,250 XP • Level 5

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[District 32] [County]           ← Toggle

🏆 DISTRICT 32 LEADERBOARD

🥇 John Smith      1,250 XP  Level 5
🥈 Jane Doe        1,100 XP  Level 4
🥉 Bob Johnson       950 XP  Level 3
#4 Alice Cooper      800 XP  Level 3
...
#7 YOU               750 XP  Level 3  (highlighted)
```

---

## 🚀 Beta Launch Status

### ✅ Features Ready:
1. War Room with LIVE Polymarket
2. Mission system (photo verification, XP)
3. Referral/invite system
4. Squad leaderboards
5. Weekly check-in
6. Endorsement admin (ready for ballot)

### ⏳ Waiting on External:
1. Official 2026 ballot (April 2026)
2. Complete candidate lists

### 🎯 Ready to Beta Test:
- Invite 10-20 users from Anne Arundel & Montgomery
- Test weekly check-ins
- Watch leaderboards populate
- Monitor live Polymarket odds
- Prepare for ballot release

---

## 🔧 Troubleshooting

### Squad tab not showing:
- Restart Expo app
- Clear cache: `npx expo start -c`

### Leaderboard empty:
- Make sure you completed onboarding (address entered)
- Check `profiles` table has `county` and `legislative_district`
- Need at least 1 user in district to show data

### Check-in not working:
- Verify SQL schema added `last_check_in_at` field
- Check function `claim_weekly_check_in` exists
- Review Supabase logs for RPC errors

### Polymarket odds not updating:
- Run `npx supabase functions invoke fetch-polymarket-odds`
- Check function logs in Supabase dashboard
- Verify market slug matches: `maryland-governor-republican-primary-winner`

---

## 🎯 You're BETA READY!

All features built and ready to test! Run the SQL scripts and test everything! 🚀⚡
