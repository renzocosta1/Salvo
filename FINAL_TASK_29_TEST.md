# Final Task 29 Testing Guide

**Status**: Edge Function deployed ✅, API Key set ✅, Now need to set up storage bucket

---

## Step 1: Create Storage Bucket (5 minutes)

### Go to Supabase SQL Editor:
1. Open: https://supabase.com/dashboard/project/zzkttbyaqihrezzowbar/sql
2. Click "New Query"
3. Copy and paste this SQL:

```sql
-- Create storage bucket for mission proof photos
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

-- Verify it worked
SELECT id, name, public FROM storage.buckets WHERE id = 'mission-proofs';
```

4. Click "Run" (should show 1 row with mission-proofs bucket)

---

## Step 2: Refresh Your PWA

1. **Delete Salvo app** from home screen
2. **Clear Safari cache** (Settings → Safari → Clear History)
3. Open Safari → **salvo-eight.vercel.app**
4. Tap Share → "Add to Home Screen" → **Make sure "Open as Web App" is ON** → Add
5. **Open Salvo from home screen** (not Safari)

---

## Step 3: Test Task 29 Features

### ✅ Feature 1: Mission Display
1. Log in with email/password (not Google)
2. Tap "Commands" tab
3. You should see 4 mission cards
4. **Expected**: Missions display correctly ✅

### ✅ Feature 2: Google Maps Navigation
1. Tap "🔥 Election Day Siege" mission
2. Tap "🗺️ Navigate to Polling Place"
3. **Expected**: Opens Google Maps in new tab with Montgomery County coordinates
4. **If it redirects to App Store**: This is an iOS limitation we'll document

### ✅ Feature 3: Photo Upload & AI Verification
1. Still in "Election Day Siege" mission
2. Tap "📸 Upload 'I Voted' Photo"
3. Select ANY test photo from your phone
4. **Expected**:
   - Shows "Uploading photo..."
   - Then "Verifying with AI..."
   - Then EITHER:
     - ✅ "Mission Complete! +250 XP" (if photo looks like a voting sticker)
     - ❌ "Verification Failed - No I Voted sticker detected" (if random photo)
5. **This is the MAIN feature we need to test!**

### ✅ Feature 4: GPS Check-in (Early Raid)
1. Go to "⚡ Early Raid" mission
2. Tap "📍 Check GPS Location"
3. Allow location permission
4. **Expected**: Shows your coordinates and says "Not at voting center" (unless you're in Montgomery County)

### ✅ Feature 5: Push Notifications
1. Go to "Profile" tab
2. Enable "Push Notifications"
3. Allow permission
4. **If toggle resets**: This is a separate bug we'll fix later, not critical for Task 29

---

## What to Report Back:

Focus on testing **Photo Upload & AI Verification** - that's the core of Task 29!

Tell me:
1. Did photo upload work? (Shows "Uploading photo...")
2. Did AI verification run? (Shows "Verifying with AI...")
3. What result did you get? (Success or Failure message)
4. Did XP get awarded if successful?

---

## Known Issues (Document for Later):
- White bars in iOS PWA (Safari limitation)
- Google OAuth breaks standalone mode (iOS security)
- Push notification toggle might reset (state management issue)
- Maps might redirect to App Store on some devices (iOS deep linking)

**These are UI polish issues. The CORE FUNCTIONALITY is what matters for Task 29 completion!**

---

Run the SQL script first, then test photo verification and report back!
