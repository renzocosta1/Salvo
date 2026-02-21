# Task 29 Testing Guide 🧪

**Quick Start:** Follow these steps to test GPS & Photo Verification features

---

## ⚡ Quick Setup (5 minutes)

### Step 1: Run the Setup SQL Script

Open Supabase SQL Editor and run this:

```bash
# Copy the SQL file contents
Get-Content "Scripts\setup_mission_photo_storage.sql" | Set-Clipboard

# Then paste in Supabase SQL Editor and run
```

Or manually paste this SQL:

```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mission-proofs',
  'mission-proofs',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Set up RLS policies
DROP POLICY IF EXISTS "Users can upload mission proofs" ON storage.objects;
CREATE POLICY "Users can upload mission proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'mission-proofs');

DROP POLICY IF EXISTS "Public read access for mission proofs" ON storage.objects;
CREATE POLICY "Public read access for mission proofs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'mission-proofs');
```

**Verify:** Run this to check:
```sql
SELECT id, name, public FROM storage.buckets WHERE id = 'mission-proofs';
```

### Step 2: Deploy the Edge Function

```powershell
# Navigate to your project
cd "c:\Coding Projects\Salvo"

# Deploy the function
npx supabase functions deploy verify-voted-sticker

# If you get errors about Supabase CLI not installed:
npm install -g supabase
# Then try again
```

### Step 3: Set Edge Function Environment Variables

Go to: **Supabase Dashboard → Project Settings → Edge Functions → Secrets**

Add these variables:
```
GOOGLE_API_KEY = AIzaSyD2h2hscV61WmUzFuvHMfVy-6QdGBdnJJ4
SUPABASE_URL = https://zzkttbyaqihrezzowbar.supabase.co
SUPABASE_SERVICE_ROLE_KEY = [Get from Supabase Settings → API]
```

**To get Service Role Key:**
1. Go to Supabase Dashboard
2. Settings → API
3. Copy "service_role" key (starts with `eyJ...`)

---

## 🧪 Testing Flow

### Test 1: Commands Tab Displays Missions ✅

**What to test:**
1. Open http://localhost:8081 in your browser
2. Log in with your test account
3. Navigate to the **Commands** tab (should be in the bottom navigation)

**Expected Result:**
- You should see 4 mission cards:
  - 🎯 Relational Raid
  - 🗳️ Digital Ballot
  - ⚡ Early Raid
  - 🔥 Election Day Siege
- Each card shows progress bars and deadlines
- Dark theme with neon green accents

**Screenshot Expected:**
```
┌─────────────────────────────────────┐
│ 🎯 Tactical Commands                │
│ Montgomery County & MD-6 • Primary  │
├─────────────────────────────────────┤
│ ⚡ Early Raid: Vote Early...         │
│ ⏰ 133 DAYS LEFT                     │
│ [Progress Bar: 0/2500]              │
│ 📍 GPS Required                      │
│ Start Mission →                     │
├─────────────────────────────────────┤
│ 🔥 Election Day Siege...             │
│ ...                                 │
└─────────────────────────────────────┘
```

---

### Test 2: GPS Geolocation (Web) ✅

**What to test:**
1. Tap the "⚡ Early Raid" mission card
2. On the mission detail screen, tap **"📍 Check GPS Location"**
3. Browser will prompt for location permission → **Allow**

**Expected Result:**
- You'll see: "Your Location: [latitude], [longitude]"
- If you're NOT near an Early Voting center:
  - Alert: "⚠️ Not at Voting Center - You must be within 100m..."
- If you ARE near one (unlikely unless you're in Montgomery County):
  - Alert: "✅ Location Verified - You are at an Early Voting center!"

**Debug Mode (Test Proximity Logic):**

To simulate being at a voting center, temporarily edit the code:

Open: `app/(tabs)/mission/[id].tsx`

Find the `checkProximity` function and change:
```typescript
const isWithin100m = earlyVotingCenters.some((center) => {
  const distance = getDistanceInMeters(userLat, userLon, center.lat, center.lon);
  return distance <= 100;
});
```

To:
```typescript
const isWithin100m = true; // Force success for testing
```

Now try again - you should see the success message!

---

### Test 3: Photo Upload & AI Verification 🎯

**What to test:**
1. Go to the "🔥 Election Day Siege" mission
2. Tap **"📸 Upload 'I Voted' Photo"**
3. File picker opens → Select a photo

**Test Photo Options:**

**Option A: Find a real "I Voted" sticker photo**
- Google Image Search: "I voted sticker"
- Download one
- Upload it

**Option B: Create a test image**
- Take a photo of any sticker/badge
- Upload it (should get rejected but you'll see the AI reasoning)

**Expected Flow:**

1. **Upload Phase:**
   ```
   Button shows: "Uploading photo..."
   Spinner animates
   Duration: 2-5 seconds
   ```

2. **AI Verification Phase:**
   ```
   Button shows: "Verifying with AI..."
   Spinner animates
   Duration: 5-10 seconds
   ```

3. **Success Result:**
   ```
   🎉 MISSION COMPLETE!
   
   Your "I Voted" sticker has been verified!
   
   +250 XP awarded!
   
   Confidence: 95%
   
   Reasoning: "Clear 'I Voted' sticker visible in the image"
   ```

4. **Rejection Result:**
   ```
   ⚠️ Verification Failed
   
   Your photo could not be verified.
   
   Reason: "No 'I Voted' sticker detected in the image"
   
   Confidence: 88%
   
   Please try again with a clearer photo.
   ```

---

### Test 4: Google Maps Deep Linking 🗺️

**What to test:**
1. Go to "🔥 Election Day Siege" mission
2. Tap **"🗺️ Navigate to Polling Place"**

**Expected Result:**
- **On Desktop:** Google Maps web opens in new tab with destination set
- **On Mobile:** Native Google Maps app opens (or browser if app not installed)
- Destination should be Montgomery County coordinates: `39.0458, -77.0198`

**Verify:** The map should show a location in Maryland, USA

---

### Test 5: Duplicate Prevention ✅

**What to test:**
1. After successfully verifying a photo, try to upload another one
2. Go back to the mission detail screen

**Expected Result:**
- You should see a **"✅ Mission Complete!"** card instead of action buttons
- Message: "You've already verified your vote"
- Photo upload button should be hidden

---

## 🐛 Troubleshooting

### Problem: Storage bucket error

**Error:** "Failed to upload photo"

**Solution:**
```sql
-- Check if bucket exists
SELECT * FROM storage.buckets WHERE id = 'mission-proofs';

-- If it doesn't exist, run the setup SQL again
```

### Problem: Edge Function not found

**Error:** "Failed to verify photo" or 404 error

**Solution:**
```bash
# Check if function is deployed
npx supabase functions list

# Redeploy if needed
npx supabase functions deploy verify-voted-sticker
```

### Problem: GPS permission denied

**Error:** Location permission blocked

**Solution:**
1. Chrome: Click the 🔒 icon in address bar → Site Settings → Location → Allow
2. Or open DevTools → Console → Look for geolocation errors
3. Try in an incognito window (permissions reset)

### Problem: Photo verification times out

**Error:** Request takes > 30 seconds

**Solution:**
1. Check Supabase Edge Function logs:
   - Supabase Dashboard → Edge Functions → verify-voted-sticker → Logs
2. Look for errors
3. Common issues:
   - Google API key not set
   - API quota exceeded
   - Image too large (>50MB)

### Problem: No missions showing

**Error:** "No active missions"

**Solution:**
```sql
-- Check if missions exist
SELECT id, title, mission_type FROM directives;

-- If empty, run the seed script
-- Copy from Scripts/seed_montgomery_alpha_data.sql
```

---

## 📊 Test Results Checklist

Check off each test as you complete it:

- [ ] **Test 1:** Commands tab shows 4 missions
- [ ] **Test 2:** GPS location captured successfully
- [ ] **Test 3:** Photo uploads to Supabase Storage
- [ ] **Test 4:** Gemini AI verifies photo (success or rejection)
- [ ] **Test 5:** XP awarded after verification
- [ ] **Test 6:** Google Maps opens with correct location
- [ ] **Test 7:** Duplicate verification prevented
- [ ] **Test 8:** Loading states work correctly
- [ ] **Test 9:** Error handling works for failed uploads

---

## 🎥 Video Test Demo (Optional)

Record your screen while testing to show:
1. Navigation from Commands tab
2. GPS check-in process
3. Photo upload and AI verification
4. Success message with XP award

This helps debug if anything doesn't work!

---

## 📝 Quick Verification Commands

```sql
-- Check if photo was uploaded
SELECT * FROM storage.objects 
WHERE bucket_id = 'mission-proofs' 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if verification was recorded
SELECT * FROM election_day_verifications 
ORDER BY verified_at DESC 
LIMIT 5;

-- Check if XP was awarded
SELECT id, display_name, xp, level 
FROM profiles 
WHERE id = 'your-user-id';
```

---

## 🚀 Next Steps After Testing

If all tests pass:
1. Deploy to production (Vercel)
2. Test on real mobile device
3. Add more Early Voting center coordinates
4. Monitor Edge Function usage/costs

If tests fail:
1. Check the specific error messages
2. Look at browser console (F12 → Console tab)
3. Check Supabase logs
4. Share error details for debugging

---

**Need Help?** Check these files:
- `docs/TASK_29_SETUP_GUIDE.md` - Detailed setup
- `TASK_29_COMPLETE.md` - Architecture overview
- `supabase/functions/verify-voted-sticker/index.ts` - Edge Function code
