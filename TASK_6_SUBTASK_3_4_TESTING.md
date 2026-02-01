# Task #6 Subtasks #3 & #4: Testing Guide

## What We Implemented

**Subtask #3:** Status Update Logic and Error Handling
- Updates `user_missions.status` to `'verified'` or `'rejected'`
- Sets `verified_at` timestamp and `verified_by = 'gemini-ai'`
- Comprehensive error handling

**Subtask #4:** XP Award and Rank Recomputation
- Calls `award_mission_xp_and_recompute_rank()` SQL function
- Awards XP to user profile
- Automatically recalculates rank based on new XP total

---

## How to Test

### STEP 1: Reset Mission (Already Done)

If you already ran the reset script, skip this. Otherwise:

```sql
UPDATE user_missions
SET status = 'pending', proof_photo_url = NULL, submitted_at = NULL
WHERE id = 'a9fa63d8-eac4-488f-8ec8-ce1722953f49';
```

### STEP 2: Check Your Current XP (Baseline)

Go to **Supabase Dashboard** → **Table Editor** → `profiles`

Find your user and note:
- Current `xp` value
- Current `level` value
- Current `rank_id` value

**Example:**
```
xp: 0
level: 0
rank_id: (some UUID for "Recruit")
```

### STEP 3: Upload Photo in App

1. Open Expo app
2. Tap "🎯 TEST MISSION (TEMP)"
3. Take/pick photo of your desktop
4. Tap "Submit Proof"

### STEP 4: Trigger AI Verification

Run in your terminal:

```powershell
$userMissionId = "a9fa63d8-eac4-488f-8ec8-ce1722953f49"
Invoke-RestMethod -Uri "https://zzkttbyaqihrezzowbar.supabase.co/functions/v1/verify-mission" -Method Post -Headers @{"Authorization"="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6a3R0YnlhcWlocmV6em93YmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTQ5MTAsImV4cCI6MjA4NTM5MDkxMH0.WT2Ogr1hfQrMOQ0kTdRQmQAv4Jha47e978wClxPhtD8";"Content-Type"="application/json"} -Body "{`"record`": {`"id`": `"$userMissionId`"}}" | ConvertTo-Json
```

### STEP 5: Expected Response (VERIFIED)

```json
{
  "success": true,
  "verdict": true,
  "confidence": 0.95,
  "reasoning": "The image clearly depicts a computer desk...",
  "status": "verified",
  "xpAwarded": 100,
  "message": "Mission proof VERIFIED! Well done, soldier. +100 XP awarded!"
}
```

### STEP 6: Verify Database Updates

Go to **Supabase Dashboard** and check:

#### A. `user_missions` table
- `status` should be `'verified'`
- `verified_at` should have a timestamp
- `verified_by` should be `'gemini-ai'`

#### B. `profiles` table
- `xp` should have increased by 100 (or whatever the mission reward is)
- `level` might have increased (if you gained enough XP)
- `rank_id` might have changed (if you leveled up past a rank threshold)

**Example:**
```
BEFORE:
xp: 0
level: 0
rank_id: <Recruit UUID>

AFTER:
xp: 100
level: 1  (because sqrt(100/100) = 1)
rank_id: <Recruit UUID> (still Recruit, level 1-4)
```

---

## Testing REJECTION Flow

To test the rejection flow, upload a photo of something that's NOT a desktop:

1. Reset mission (use script)
2. Upload photo of something random (e.g., a plant, your hand, etc.)
3. Run the AI verification command
4. Expected response:

```json
{
  "success": true,
  "verdict": false,
  "confidence": 0.85,
  "reasoning": "The image does not show a desktop or workspace...",
  "status": "rejected",
  "message": "Mission proof REJECTED. Try again. Status updated to rejected."
}
```

5. Check `user_missions` table:
   - `status` should be `'rejected'`
   - `verified_at` should be NULL
   - NO XP awarded

---

## What to Look For

### ✅ Success Indicators

1. **AI Response:**
   - `verdict: true`
   - `xpAwarded` field present
   - Message says "+100 XP awarded!"

2. **Database:**
   - `user_missions.status = 'verified'`
   - `user_missions.verified_at` has timestamp
   - `profiles.xp` increased by 100
   - `profiles.level` recalculated (if applicable)

3. **Logs (Supabase Dashboard → Edge Functions → verify-mission → Logs):**
   - "Successfully updated user_mission to verified"
   - "Awarding XP for mission: 100"
   - "Successfully awarded XP and recomputed rank"

### ❌ Error Indicators

If something fails:
- Check Edge Function logs for errors
- Verify RLS policies allow service role to update tables
- Ensure SQL function `award_mission_xp_and_recompute_rank` exists

---

## XP and Leveling Formula

From the schema:
```sql
level = floor(sqrt(xp / 100))
```

**Examples:**
- 0 XP → Level 0
- 100 XP → Level 1
- 400 XP → Level 2
- 900 XP → Level 3
- 2500 XP → Level 5 (Warrior rank starts here)

**Ranks:**
- **Recruit:** Level 0-4
- **Warrior:** Level 5-9
- **Centurion:** Level 10+ (manually approved)

---

## Next Steps

Once this works:
- **Subtask #5:** Create database webhook to auto-trigger verification on photo upload
- App will automatically verify missions without manual terminal commands!

---

**Status:** Ready for testing! 🚀
