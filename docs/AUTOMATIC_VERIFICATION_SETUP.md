# Automatic Mission Verification Setup

## Overview

This guide sets up **automatic AI verification** so that missions are verified instantly when users upload photos - no manual terminal commands needed!

---

## Method 1: Supabase Database Webhooks (RECOMMENDED)

### Step 1: Go to Webhooks Dashboard

1. Open **Supabase Dashboard**
2. Navigate to **Database** → **Webhooks**
3. Click **"Create a new hook"** or **"Enable Webhooks"**

### Step 2: Configure the Webhook

**Name:** `auto-verify-mission-proof`

**Table:** `user_missions`

**Events:** Select `UPDATE`

**HTTP Request:**
- **Method:** `POST`
- **URL:** `https://zzkttbyaqihrezzowbar.supabase.co/functions/v1/verify-mission`
- **HTTP Headers:**
  ```
  Content-Type: application/json
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6a3R0YnlhcWlocmV6em93YmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTQ5MTAsImV4cCI6MjA4NTM5MDkxMH0.WT2Ogr1hfQrMOQ0kTdRQmQAv4Jha47e978wClxPhtD8
  ```

**HTTP Params (Payload):**
```json
{
  "record": {
    "id": "{{ record.id }}"
  }
}
```

**Conditions (Filter):**
Add a filter to only trigger when proof is submitted:
```
old_record.proof_photo_url is null
AND
new_record.proof_photo_url is not null
AND
new_record.status = 'submitted'
```

### Step 3: Save and Enable

1. Click **"Create webhook"** or **"Save"**
2. Make sure the webhook is **enabled** (toggle should be green/on)

---

## Method 2: SQL Trigger with pg_net (ALTERNATIVE)

If webhooks UI is not available, you can use a SQL trigger:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run the script in `Scripts/setup_automatic_verification_webhook.sql`
3. This creates a database trigger that calls the Edge Function via `pg_net`

**Note:** This method is synchronous and may slow down updates slightly.

---

## How It Works

### Before (Manual):
1. User uploads photo → Status = 'submitted'
2. **YOU manually run terminal command**
3. AI verifies → Status = 'verified'
4. XP awarded

### After (Automatic):
1. User uploads photo → Status = 'submitted'
2. **Webhook automatically triggers Edge Function**
3. AI verifies → Status = 'verified'
4. XP awarded
5. **All in ~5-10 seconds!**

---

## Testing the Automatic Flow

### Step 1: Reset Mission
Run `Scripts/complete_mission_reset.sql` in Supabase SQL Editor

### Step 2: Delete Old Images
Go to **Storage** → `mission-proofs` bucket → Delete all files

### Step 3: Test in App
1. Open Expo app
2. Tap **"🎯 TEST MISSION (TEMP)"**
3. Tap **"START MISSION"**
4. Take/pick a photo of your desktop
5. Tap **"SUBMIT PROOF"**
6. Wait 5-10 seconds
7. **Refresh the screen** (go back and re-enter mission)
8. Status should show **"✓ VERIFIED"**!

### Step 4: Verify in Database
Check **Supabase Dashboard** → **Table Editor**:

**`user_missions` table:**
- `status` = `'verified'`
- `verified_at` has timestamp
- `verified_by` = `'gemini-ai'`

**`profiles` table:**
- `xp` increased by 100
- `level` increased (if applicable)

---

## Checking Webhook Logs

### Via Supabase Dashboard
1. Go to **Database** → **Webhooks**
2. Click on your webhook (`auto-verify-mission-proof`)
3. View **"Logs"** or **"History"** tab
4. See successful/failed webhook calls

### Via Edge Function Logs
1. Go to **Edge Functions** → `verify-mission`
2. View **"Logs"** tab
3. See AI verification logs

---

## Expected Flow Timeline

```
t=0s:    User taps "Submit Proof"
t=1s:    Photo uploaded to Storage
t=2s:    Database updated (status = 'submitted')
t=2s:    Webhook triggered
t=3s:    Edge Function receives request
t=3-8s:  AI analyzes photo (Gemini API)
t=9s:    Database updated (status = 'verified')
t=9s:    XP awarded
t=10s:   User sees "✓ VERIFIED" when refreshing
```

---

## Troubleshooting

### Webhook Not Firing
- Check webhook is **enabled** in dashboard
- Verify **conditions/filters** are correct
- Check webhook **logs** for errors

### AI Not Verifying
- Check **Edge Function logs** for errors
- Verify Gemini API key is valid
- Check if function received the webhook payload

### XP Not Awarded
- Check Edge Function logs for XP award errors
- Verify `award_mission_xp_and_recompute_rank` function exists
- Check RLS policies allow service role to update profiles

---

## Next Steps

Once automatic verification works:
1. Remove the **"🎯 TEST MISSION (TEMP)"** button from the app
2. Build a proper **Missions List** screen
3. Add real-time updates so users don't need to refresh
4. Add **Victory Screen** animation when mission is verified!

---

**Status:** Ready to implement! 🚀
