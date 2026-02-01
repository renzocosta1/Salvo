# Task #2: The Gates - Implementation Guide

## Overview
Task #2 implements the authentication flow and mandatory Oath screen for Salvo. This is a hard-blocking gate system where users cannot access the app until they:
1. Sign up / Log in
2. Read and sign The Oath (scroll to bottom required)

## What Was Implemented

### 1. Database Migration
**File**: `docs/migrations/001_add_profile_trigger.sql`

This migration adds a trigger that automatically creates a profile when a user signs up via Supabase Auth.

**To apply this migration:**
```sql
-- Run this in Supabase SQL Editor
-- Copy/paste the contents of docs/migrations/001_add_profile_trigger.sql
```

### 2. Auth System
- **Auth Context** (`lib/auth/AuthContext.tsx`) - Type definitions for auth state
- **Auth Provider** (`lib/auth/AuthProvider.tsx`) - Manages session and profile state
- **useAuth Hook** (`lib/auth/useAuth.ts`) - Easy access to auth state throughout app

### 3. UI Components
- **AuthInput** (`components/auth/AuthInput.tsx`) - Tactical-styled text input
- **AuthButton** (`components/auth/AuthButton.tsx`) - Tactical-styled button with loading states

### 4. Screens
- **Login Screen** (`app/(auth)/login.tsx`) - Email/password authentication
- **Signup Screen** (`app/(auth)/signup.tsx`) - User registration
- **Oath Screen** (`app/(gates)/oath.tsx`) - Blocking overlay with scroll requirement

### 5. Root Guard Logic
- **Updated** `app/_layout.tsx` with auth guard that:
  - Shows loading spinner while checking auth state
  - Redirects to login if not authenticated
  - Shows Oath screen if authenticated but hasn't signed
  - Allows app access only after Oath is signed

## Setup Instructions

### Step 1: Apply Database Migration

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy the contents of `docs/migrations/001_add_profile_trigger.sql`
4. Paste and run the migration
5. Verify the trigger was created successfully

### Step 2: Seed "Hard Party" in Database

If not already done, run this in Supabase SQL Editor:

```sql
-- Ensure Hard Party exists
INSERT INTO parties (name, general_user_id)
VALUES ('Hard Party', NULL)
ON CONFLICT (name) DO NOTHING;
```

### Step 3: Update Contract Text (Optional)

The Oath screen uses the text from the `contract_versions` table. The default seed from Task #1 has placeholder text. To update:

```sql
UPDATE contract_versions
SET body_text = 'YOUR FULL OATH TEXT HERE'
WHERE version_tag = 'v1';
```

Or use the default comprehensive Oath text that's already built into the app as a fallback.

### Step 4: Enable Email Auth in Supabase

1. Go to **Authentication** → **Providers** in Supabase dashboard
2. Enable **Email** provider
3. Configure email templates (optional)
4. Set **Site URL** to your app URL (e.g., `exp://localhost:8081` for local dev)
5. Add redirect URLs if needed

### Step 5: Run the App

```bash
npm start
# or
npx expo start
```

## Testing the Auth Flow

### Test Case 1: New User Signup
1. Launch the app
2. Should see **Login Screen**
3. Click "Sign Up" link
4. Fill in:
   - Display Name (optional)
   - Email
   - Password
   - Confirm Password
5. Click **CREATE ACCOUNT**
6. Check email for verification (Supabase default setting)
7. After verification, log in

### Test Case 2: Oath Screen
1. Log in with a new user
2. Should automatically see **The Oath** screen
3. Try clicking **JOIN THE HARD PARTY** button
   - Should be disabled (greyed out)
4. Scroll down through the entire Oath text
5. Watch the progress bar fill up
6. Once scrolled to bottom, button should turn green
7. Click **JOIN THE HARD PARTY**
8. Should be redirected to the main app

### Test Case 3: Returning User
1. Log out (we'll add logout button later)
2. Log back in
3. Should go directly to main app (skip Oath screen)

### Test Case 4: Profile Auto-Creation
1. Sign up a new user
2. Check the `profiles` table in Supabase
3. Verify a profile was automatically created with:
   - `id` = user's auth.uid
   - `role` = 'warrior'
   - `level` = 0
   - `xp` = 0
   - `oath_signed_at` = NULL (until they sign)

### Test Case 5: Oath Signature
1. Sign up and complete the Oath
2. Check the `profiles` table
3. Verify the profile was updated with:
   - `oath_signed_at` = timestamp
   - `contract_version_id` = current version UUID
   - `party_id` = Hard Party UUID

## Architecture Overview

### Auth Flow Diagram

```
┌─────────────────┐
│   App Launch    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  AuthProvider   │ ← Checks session via Supabase
│  (Loading...)   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
No Session  Session Exists
    │         │
    │         ▼
    │    ┌──────────────┐
    │    │ Fetch Profile│
    │    └──────┬───────┘
    │           │
    │      ┌────┴─────┐
    │      │          │
    │      ▼          ▼
    │  Oath Signed  No Oath
    │      │          │
    ▼      ▼          ▼
 ┌────────┐  ┌─────────────┐
 │ Login  │  │  Oath Screen│
 │ Screen │  │  (Blocking) │
 └────┬───┘  └──────┬──────┘
      │             │
      │             ▼
      │      ┌─────────────┐
      │      │ Sign Oath   │
      │      │ Update DB   │
      │      └──────┬──────┘
      │             │
      └─────────────┴─────────┐
                              ▼
                        ┌───────────┐
                        │  Main App │
                        │  (Tabs)   │
                        └───────────┘
```

### Key Design Decisions

#### 1. Profile Auto-Creation via Trigger
**Why**: Ensures profile always exists after signup. Prevents race conditions where the client tries to read a profile before it's created.

#### 2. Blocking Oath Screen
**Why**: The Oath is non-negotiable. Users cannot access any part of the app until they've read and signed it. This is enforced at the root layout level.

#### 3. Scroll-to-Bottom Requirement
**Why**: Forces users to actually engage with the contract text rather than blindly clicking "Accept". The scroll progress bar provides visual feedback.

#### 4. Contract Versioning
**Why**: If The Oath needs to be updated in the future, we can create a new contract version. Users with an old `contract_version_id` will see the Oath screen again.

#### 5. Hard Party Assignment
**Why**: All users start in the "Hard Party". This is the root organization. Future features may allow multiple parties, but for MVP, all users join Hard Party.

## Troubleshooting

### Profile Not Loading
- Check that the trigger was applied successfully
- Verify Supabase connection in `lib/supabase.ts`
- Check `.env` file has correct `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Oath Screen Not Appearing
- Verify profile exists and has `oath_signed_at = NULL`
- Check console for errors in `AuthProvider`

### Join Button Not Enabling
- Make sure you scroll all the way to the bottom of the ScrollView
- Check scroll handler logic in `oath.tsx`

### Database Permission Errors
- Verify RLS policies are enabled (from schema.sql in Task #1)
- Check that `profiles_insert_own` and `profiles_update_own` policies exist

## Next Steps (Task #3)

After The Gates are working, Task #3 will implement:
- Command Feed (Directive list)
- War Log UI
- Directive detail screens

But users must pass through The Gates first!

## Files Modified/Created

### Created
- `lib/auth/AuthContext.tsx`
- `lib/auth/AuthProvider.tsx`
- `lib/auth/useAuth.ts`
- `lib/auth/index.ts`
- `components/auth/AuthInput.tsx`
- `components/auth/AuthButton.tsx`
- `app/(auth)/_layout.tsx`
- `app/(auth)/login.tsx`
- `app/(auth)/signup.tsx`
- `app/(gates)/oath.tsx`
- `docs/migrations/001_add_profile_trigger.sql`
- `TASK_2_IMPLEMENTATION_GUIDE.md` (this file)

### Modified
- `app/_layout.tsx` - Added auth guard logic and AuthProvider

## Status
✅ Task #2: Complete

All acceptance criteria met:
- [x] Authentication flow with email/password
- [x] Blocking Oath screen overlay
- [x] Scroll-to-bottom requirement
- [x] Join button enabled only after scroll
- [x] Profile updated with `oath_signed_at` and `contract_version_id`
- [x] Users assigned to "Hard Party" with role='warrior', level=0
- [x] Auto-profile creation via database trigger
