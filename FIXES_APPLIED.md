# Fixes Applied - 2024 Ballot System

## Issues Fixed

### 1. Push Notification Error on App Load
**Error**: `"projectId": Invalid uuid.`

**Root Cause**: Expo push notifications were trying to use a placeholder `projectId` that wasn't valid.

**Fix**: 
- Removed the `projectId` parameter from `Notifications.getExpoPushTokenAsync()` call
- This makes it work with Expo Go (which doesn't require projectId)
- For standalone builds, you'll need to add it back with your actual Expo project ID

**File**: `lib/notifications/pushTokens.ts`

---

### 2. War Room Error (Ballot Fetching Failed)
**Error**: `[fetchBallotForUser] Error fetching ballot: {"code": "PGRST116"...}`

**Root Cause**: Your profile has `null` values for:
- `county`: null
- `legislative_district`: null
- `congressional_district`: null

The War Room was trying to fetch ballot data with empty strings, causing database query failures.

**Fix**:
- Added check in `WarRoomHUD.loadData()` to exit early if district info is missing
- Added user-friendly message: "⚠️ District Info Required - Please update your address in Profile"

**Files**: 
- `components/WarRoomHUD.tsx`

---

### 3. Ballot Screen Error
**Error**: "No district information found. Please update your address in profile"

**Root Cause**: Same as above - your profile lacks address/district data.

**Status**: Already handled correctly! The ballot screen properly detects missing district info and shows a helpful message.

**File**: `app/(tabs)/ballot.tsx` (no changes needed)

---

## What You Need To Do

### Step 1: Update Your Profile with District Information

Run this SQL script in Supabase SQL Editor:

```sql
-- File: Scripts/update_profile_district.sql
```

This will set your account to:
- **County**: Montgomery
- **Legislative District**: 18
- **Congressional District**: MD-6
- **Sample address**: 123 Test St, Rockville, MD 20850

### Step 2: Refresh the App

After running the SQL script:
1. Close and reopen the app (or force refresh)
2. You should now see:
   - ✅ **Ballot screen**: Shows 2024 Republican Primary ballot for Montgomery County, District 18
   - ✅ **War Room**: Shows Polymarket odds (if available) for your races
   - ✅ **Admin tab**: Accessible since you have `leadership_role: "state_leader"`

---

## Notes on 2024 vs 2026 Data

**Why didn't this happen before?**

The old 2026 placeholder data created ballots with `NULL` values for county/district, so the queries worked even when your profile had `NULL` values.

The new 2024 seed data creates ballots with specific counties and districts (Montgomery 15-20, 39 and Anne Arundel 30-33), requiring exact matches on both `county` AND `legislative_district`.

This is actually **better** because it ensures users only see ballots for their actual district!

---

## Polymarket Data (War Room)

The War Room may show "No odds available" for 2024 races because:
- The 2024 Republican Primary already happened (May 14, 2024)
- Polymarket markets are likely closed/resolved
- You'd need to seed actual historical Polymarket data for those markets

To populate with real data, you would need to:
1. Find the Polymarket market IDs for those 2024 races
2. Add them to `polymarket_tracked_markets` table
3. Run odds refresh to pull historical data

For now, the ballot data will display correctly, but betting odds will be empty.

---

## Summary

✅ **Push notifications**: Fixed silent error handling  
✅ **War Room**: Now shows helpful message when district info missing  
✅ **Ballot screen**: Already working correctly  
⚠️ **Action needed**: Run `Scripts/update_profile_district.sql` to add your district info  

After updating your profile, all features should work properly!
