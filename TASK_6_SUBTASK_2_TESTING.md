# Task #6 Subtask #2: Testing AI Vision

## What We Built

The Edge Function now:
1. ✅ Fetches the user_mission and mission records from database
2. ✅ Downloads the proof image from Supabase Storage
3. ✅ Converts image to Base64
4. ✅ Sends to Google Gemini 1.5 Flash AI with verification prompt
5. ✅ Parses AI response (verdict, confidence, reasoning)
6. ✅ Returns structured JSON with verification result

## How to Test

### STEP 1: Upload a Test Photo in the App

1. **Open Expo app** on your phone
2. **Tap the "🎯 TEST MISSION (TEMP)" button** on Command screen
3. **Take/pick a photo of your desktop** (matches the mission)
4. **Tap "Submit Proof"**
5. Wait for "Processing..." screen

### STEP 2: Get the user_mission ID

Go to Supabase Dashboard → **Table Editor** → `user_missions` table

Find the most recent entry where:
- `status = 'pending'`
- `proof_url` is NOT NULL

**Copy the `id`** (it will be a UUID like `550e8400-e29b-41d4-a716-446655440000`)

### STEP 3: Manually Trigger the Edge Function

Open your **Cursor terminal** and run this PowerShell command (replace `YOUR_USER_MISSION_ID` with the actual ID):

```powershell
$userMissionId = "YOUR_USER_MISSION_ID"  # Replace with real UUID

$response = Invoke-RestMethod -Uri "https://zzkttbyaqihrezzowbar.supabase.co/functions/v1/verify-mission" -Method Post -Headers @{"Authorization"="Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp6a3R0YnlhcWlocmV6em93YmFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4MTQ5MTAsImV4cCI6MjA4NTM5MDkxMH0.WT2Ogr1hfQrMOQ0kTdRQmQAv4Jha47e978wClxPhtD8";"Content-Type"="application/json"} -Body "{`"record`": {`"id`": `"$userMissionId`"}}"
$response | ConvertTo-Json
```

### STEP 4: Expected Output

If the photo shows a desktop (matches mission), you should see:

```json
{
    "success": true,
    "userMissionId": "550e8400-e29b-41d4-a716-446655440000",
    "missionTitle": "Photograph Your Desktop",
    "verdict": true,
    "confidence": 0.95,
    "reasoning": "The image clearly shows a desktop computer setup with monitor, keyboard, and other typical desktop components.",
    "message": "Mission proof VERIFIED! Well done, soldier."
}
```

If the photo is wrong (e.g., random object), you should see:

```json
{
    "success": true,
    "userMissionId": "550e8400-e29b-41d4-a716-446655440000",
    "missionTitle": "Photograph Your Desktop",
    "verdict": false,
    "confidence": 0.85,
    "reasoning": "The image does not show a desktop computer. It appears to be [whatever you photographed].",
    "message": "Mission proof REJECTED. Try again."
}
```

### STEP 5: Check Logs (Optional)

Go to Supabase Dashboard → **Edge Functions** → `verify-mission` → **Logs**

You should see detailed logs showing:
- Image download
- Base64 conversion
- Gemini API request
- AI response parsing
- Final verdict

## What's Next?

Once you confirm the AI is correctly analyzing images, we'll move to **Subtask #3**:
- Update the database with the verdict
- Set `user_missions.status` to `'verified'` or `'rejected'`
- Add error handling for edge cases

---

## Troubleshooting

**If you get "No proof_url" error:**
- Make sure you completed Task #5's image upload
- Check the `user_missions` table to confirm `proof_url` is not NULL

**If AI response seems wrong:**
- The AI is designed to be strict
- Try uploading a clearer photo
- Check Gemini logs in Supabase Dashboard

**If function times out:**
- Large images might take longer
- Wait 30-60 seconds for response
- Check Edge Function logs for errors
