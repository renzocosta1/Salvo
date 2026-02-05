# Task 23: Address Entry - Quick Start Guide

## ✅ What's Complete

**Task 22:** Google Civic API integration  
**Task 23:** Address entry in onboarding flow

## 🚀 Quick Start (3 Steps)

### Step 1: Run Database Migration (2 minutes)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **SQL Editor**
4. Copy and paste this:

```sql
-- Add address fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address_line1 TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state TEXT DEFAULT 'Maryland';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS zip_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS county TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS legislative_district TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS congressional_district TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_profiles_county ON profiles(county);
CREATE INDEX IF NOT EXISTS idx_profiles_legislative_district ON profiles(legislative_district);
CREATE INDEX IF NOT EXISTS idx_profiles_congressional_district ON profiles(congressional_district);
```

5. Click **Run** (or press Cmd+Enter)
6. Wait for "Success" message

### Step 2: Verify Setup (30 seconds)

Check that you have the Google Civic API key in `.env`:
```bash
EXPO_PUBLIC_GOOGLE_CIVIC_API_KEY=AIzaSyAjFkX-P2SEXQ8inNz7vRXG_GPwgBsdf68
```
✅ Already configured!

### Step 3: Test It! (2 minutes)

```bash
npm start
```

Then:
1. Create a new test account
2. Sign the oath
3. Enter personal details (age/gender)
4. **Enter your address** ← NEW SCREEN!
5. Watch it auto-detect your district
6. Complete onboarding

## 📱 What Users See

### New Onboarding Flow:
```
Sign Up/Login
    ↓
Oath (scroll + sign)
    ↓
Personal Details (age + gender)
    ↓
📍 Address Entry ← NEW!
    ↓
Feature Selection
    ↓
Main App
```

### Address Screen Features:
- ✅ Street address input
- ✅ City input
- ✅ State dropdown (all 50 states)
- ✅ ZIP code input
- ✅ Auto-detects county + districts
- ✅ Manual fallback if API fails
- ✅ Privacy notice

## 🎯 What Gets Saved

When user enters address, we save to `profiles` table:
- `address_line1` - "8620 Jacks Reef Rd"
- `city` - "Laurel"
- `state` - "MD"
- `zip_code` - "20724"
- `county` - "Anne Arundel"
- `congressional_district` - "MD-5"
- `legislative_district` - "District 32"
- `geocoded_at` - "2026-02-05T03:30:00Z"

## ✅ Already Tested

We tested with 3 real addresses:
1. ✅ Maryland (your address)
2. ✅ Maryland (Annapolis)
3. ✅ South Carolina (works nationwide!)

## 🔧 Troubleshooting

### Problem: Address lookup fails
**Solution:** User sees alert with option to enter district manually

### Problem: API key error
**Solution:** Check `.env` file has `EXPO_PUBLIC_GOOGLE_CIVIC_API_KEY`

### Problem: Database error
**Solution:** Run the migration SQL above

## 📚 Files Created/Modified

**Created:**
- `app/(onboarding)/address.tsx` - New address screen
- `Scripts/add-address-fields.sql` - Quick migration
- `TASK_23_COMPLETE.md` - Full documentation

**Modified:**
- `app/(onboarding)/personal-details.tsx` - Updated navigation

**Already Exists (from Task 22):**
- `lib/districts/googleCivicApi.ts` - API integration
- `lib/districts/districtLookup.ts` - Lookup functions

## 🎉 That's It!

Run the migration, start the app, create a test account, and watch the magic happen!

---

**Questions?** Check `TASK_23_COMPLETE.md` for full details.

**Ready for:** Task 24! 🚀
