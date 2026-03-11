# 🚀 Final Beta Testing Deployment Guide

## 📋 Pre-Deployment Checklist

Before deploying for beta testing, run these SQL scripts **IN ORDER**:

### 1️⃣ Reset Database (Fresh Start)
```sql
-- ⚠️ WARNING: This deletes ALL user data!
-- Run: Scripts/reset_all_users.sql
```
**What it does:**
- Deletes all user profiles
- Deletes all user missions/progress
- Deletes all referrals, salvos, check-ins
- **PRESERVES:** Ballot data, Polymarket markets, Party/Rank definitions

**When to use:** 
- Before beta testing launch
- To fix duplicate/corrupted user data
- When starting fresh

---

### 2️⃣ Setup Avatar Storage
```sql
-- Run: Scripts/setup_avatar_storage.sql
```
**What it does:**
- Creates 'avatars' storage bucket
- Configures RLS policies for user uploads
- Allows public read access to avatar images

**Why needed:** Profile edit feature requires this bucket

---

### 3️⃣ Seed Complete Maryland Geography
```sql
-- Run: Scripts/seed_maryland_complete_geography.sql
```
**What it does:**
- Creates reference table for ALL Maryland counties (24)
- Maps all legislative districts (1-47)
- Maps all congressional districts (MD-1 through MD-8)

**Why needed:** Users anywhere in Maryland can now sign up

---

### 4️⃣ Cleanup Test Data
```sql
-- Run: Scripts/cleanup_all_2026_data.sql
```
**What it does:**
- Removes test ballot data
- Clears test markets
- Prepares for production deployment

---

### 5️⃣ Setup LIVE Polymarket Odds
```sql
-- Run: Scripts/seed_2026_live_polymarket.sql
```
**What it does:**
- Seeds LIVE 2026 Maryland Governor Primary market
- Sets up real-time tracking for:
  - Dan Cox (52%)
  - Ed Hale (26.5%)
  - Christopher Bouchat (9%)
  - Carl Brunner (4.8%)
  - And 4 more candidates

**Why needed:** War Room needs live odds data

---

### 6️⃣ Setup Squad Features
```sql
-- Run: Scripts/add_squad_and_checkin_features.sql
```
**What it does:**
- Adds check-in columns to profiles
- Creates leaderboard functions
- Creates squad stats functions

**Why needed:** Squad tab requires these database functions

---

## 🎯 New Features for Beta Testing

### 1. Profile Editing ✨
**Location:** Profile screen → "Edit Profile" button

**Features:**
- Upload profile picture
- Change display name
- Update address (updates district automatically)

**Testing:**
1. Navigate to Profile screen
2. Tap "Edit Profile"
3. Upload a photo
4. Change your name
5. Update address
6. Tap "Save Changes"
7. Verify changes persist after logout/login

---

### 2. War Room - LIVE Polymarket Odds 📊
**Location:** War Room tab

**Features:**
- Shows statewide races (Governor) even without ballot
- Real-time odds from Polymarket
- Auto-refreshes every 15 minutes
- Shows all 8 candidates with current percentages

**Testing:**
1. Navigate to War Room
2. Verify you see "Governor of Maryland" at the top
3. Check odds match https://polymarket.com/event/maryland-governor-republican-primary-winner
4. Verify auto-refresh works

---

### 3. Squad Tab 🏆
**Location:** Squad tab

**Features:**
- Weekly check-in system
- District leaderboards
- County leaderboards
- Squad stats (total members, active today, XP, missions)
- Real-time updates via Supabase Realtime

**Testing:**
1. Navigate to Squad tab
2. Claim weekly check-in (get XP boost)
3. Toggle between District/County leaderboards
4. Verify your rank appears correctly
5. Check squad stats display

---

### 4. Ballot - Coming Soon Message 📋
**Location:** Ballot tab

**Features:**
- Professional "Coming Soon" message
- Explains 2026 primary timeline
- No errors when ballot not available

**Testing:**
1. Navigate to Ballot tab
2. Verify "Ballot Coming Soon!" banner displays
3. No errors or "district not found" messages

---

### 5. Endorsement System (Admin) ⭐
**Location:** Admin tab (leaders only)

**Features:**
- Batch selection of endorsed candidates
- Single "Save" button for all changes
- Real-time ballot updates
- No page reloads

**Testing (requires leader account):**
1. Navigate to Admin tab
2. Select multiple candidates
3. Tap floating "Save X Changes" button
4. Verify endorsements appear on Ballot tab immediately
5. No page refresh or jumps

---

## 🧪 Beta Testing Scenarios

### Scenario 1: New User Signup
1. Create account with any Maryland address
2. Verify district/county detected correctly
3. Complete onboarding
4. Check all tabs load without errors

### Scenario 2: Mission Completion
1. Complete "Election Day Siege" mission
2. Upload "I Voted" sticker photo
3. Verify AI detects sticker
4. Check XP awarded correctly
5. Verify level up animation

### Scenario 3: Squad Engagement
1. Claim weekly check-in
2. Invite a friend (referral link)
3. Check leaderboard position
4. Verify squad stats update

### Scenario 4: Profile Management
1. Edit profile (upload photo, change name)
2. Update address
3. Verify district updates on Ballot tab
4. Logout and login
5. Verify changes persist

### Scenario 5: War Room Monitoring
1. Open War Room
2. Watch Polymarket odds update
3. Check election deadline countdown
4. Verify no errors with statewide races

---

## 🐛 Known Issues (Fixed in This Release)

✅ **War Room not showing Governor race** → Fixed: Shows statewide markets directly  
✅ **Squad tab visual glitch** → Fixed: LEADER badge no longer overlaps  
✅ **No profile editing** → Fixed: Full profile edit screen added  
✅ **Limited Maryland coverage** → Fixed: All 24 counties + 47 districts seeded  
✅ **Duplicate user data** → Fixed: Database reset script provided  

---

## 📊 Database Reset Instructions

**⚠️ IMPORTANT: Only run this when you're ready for beta launch!**

This will delete ALL existing users, but preserve:
- Ballot structure
- Polymarket markets
- Party/rank definitions
- Mission definitions

**Steps:**
1. Backup current database (optional but recommended)
2. Run `Scripts/reset_all_users.sql`
3. Run all other setup scripts (avatar storage, geography, etc.)
4. Test with a fresh account
5. Invite beta testers!

---

## 🚦 Beta Launch Checklist

- [ ] Run database reset script
- [ ] Run avatar storage setup
- [ ] Seed Maryland geography
- [ ] Seed LIVE Polymarket odds
- [ ] Setup squad features
- [ ] Test all new features
- [ ] Create test accounts in multiple counties
- [ ] Verify PWA installation works
- [ ] Test push notifications
- [ ] Check mission completion flow
- [ ] Verify endorsement system (admin)
- [ ] Test referral/invite links

---

## 📞 Support & Troubleshooting

### Issue: War Room shows no odds
**Fix:** Run `Scripts/seed_2026_live_polymarket.sql`

### Issue: Squad tab errors
**Fix:** Run `Scripts/add_squad_and_checkin_features.sql`

### Issue: Can't upload avatar
**Fix:** Run `Scripts/setup_avatar_storage.sql`

### Issue: District not found
**Fix:** Run `Scripts/seed_maryland_complete_geography.sql`

### Issue: Old test data showing
**Fix:** Run `Scripts/cleanup_all_2026_data.sql`

---

## 🎉 Ready for Beta!

Once all scripts are run and testing is complete:
1. Announce beta launch
2. Share invite links
3. Monitor Squad leaderboards
4. Track mission completion rates
5. Gather feedback
6. Iterate for production release

**Let's organize and WIN! 🇺🇸**
