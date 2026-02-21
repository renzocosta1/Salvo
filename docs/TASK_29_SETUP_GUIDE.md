# Task 29: GPS & Ballot Photo Verification - Setup Guide

## Overview
Task 29 implements tactical mission verification using GPS geolocation and AI-powered photo verification with Google Gemini 2.0 Flash.

## Implementation Status

### ✅ Completed Subtasks

1. **Subtask 1: Update Commands Tab for Mission Display**
   - Transformed Command Center to show tactical missions for ALL users (not just Generals/Captains)
   - Missions display with deadlines, progress bars, and mission types
   - Dark tactical theme with neon green accents

2. **Subtask 2: Early Raid GPS Check-in and Photo Upload**
   - Web Geolocation API integration for PWA
   - 100m proximity checking to Early Voting centers
   - Photo upload to Supabase Storage
   - Client-side verification workflow

3. **Subtask 3: Election Day Google Maps Deep Linking**
   - Cross-platform Maps URL generation
   - Deep linking for iOS, Android, and Web
   - Precinct coordinate integration

4. **Subtask 4: Gemini AI Verification and Squad Status UI**
   - Supabase Edge Function: `verify-voted-sticker`
   - Google Gemini 2.0 Flash integration
   - "I Voted" sticker detection
   - XP award system
   - Completed mission tracking

## Setup Instructions

### 1. Create Supabase Storage Bucket

Run this SQL in Supabase SQL Editor:

```sql
-- Create storage bucket for mission proof photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('mission-proofs', 'mission-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for mission-proofs bucket
CREATE POLICY "Users can upload their own mission proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'mission-proofs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Anyone can view mission proofs"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'mission-proofs');
```

### 2. Deploy Edge Function

```bash
# Navigate to project root
cd "c:\Coding Projects\Salvo"

# Deploy the verify-voted-sticker Edge Function
supabase functions deploy verify-voted-sticker

# Set environment variables in Supabase Dashboard
# Go to: Project Settings > Edge Functions > Secrets
# Add:
# - GOOGLE_API_KEY (or GEMINI_API_KEY): Your Google AI API key
# - SUPABASE_URL: Your Supabase project URL
# - SUPABASE_SERVICE_ROLE_KEY: Your service role key
```

### 3. Verify Mission Data Seeded

Ensure the 4 tactical missions exist in your database:

```sql
SELECT id, title, mission_type, requires_gps, mission_deadline
FROM directives
WHERE mission_type IN ('EARLY_RAID', 'ELECTION_DAY_SIEGE')
ORDER BY created_at;
```

Expected results:
- 🎯 Relational Raid (no mission_type)
- 🗳️ Digital Ballot (no mission_type)
- ⚡ Early Raid (mission_type: EARLY_RAID, requires_gps: true)
- 🔥 Election Day Siege (mission_type: ELECTION_DAY_SIEGE, requires_gps: false)

### 4. Test the Flow

#### Test GPS Check-in (PWA):
1. Open app in browser
2. Navigate to Commands tab
3. Tap "Early Raid" mission
4. Tap "Check GPS Location"
5. Allow location permissions
6. Should show your coordinates

#### Test Photo Verification:
1. Navigate to Election Day Siege mission
2. Tap "Upload 'I Voted' Photo"
3. Take/select a photo with an "I Voted" sticker
4. Wait for AI verification
5. Should see success message with XP award

### 5. Early Voting Center Coordinates

Update `app/(tabs)/mission/[id].tsx` with actual Early Voting center coordinates for Montgomery County:

```typescript
const earlyVotingCenters = [
  { name: 'Silver Spring Civic Center', lat: 38.9937, lon: -77.0261 },
  { name: 'Germantown Community Center', lat: 39.1732, lon: -77.2664 },
  { name: 'Wheaton Community Center', lat: 39.0392, lon: -77.0511 },
  { name: 'Mid-County Community Center', lat: 39.0458, lon: -77.0198 },
  // Add more as needed
];
```

## Architecture

### Files Created/Modified

#### New Files:
- `app/(tabs)/command-center.tsx` - Redesigned Commands tab
- `app/(tabs)/mission/[id].tsx` - Mission detail screen with GPS/photo upload
- `lib/supabase/verification.ts` - Verification service functions
- `supabase/functions/verify-voted-sticker/index.ts` - Gemini AI Edge Function

#### Modified Files:
- `lib/supabase/types.ts` - Added mission_type, mission_deadline, requires_gps
- `lib/supabase/directives.ts` - Updated queries to include new fields

### Data Flow

```
User taps mission → Mission Detail Screen
  ↓
GPS Check (if required) → Geolocation API
  ↓
Photo Upload → Supabase Storage (mission-proofs bucket)
  ↓
AI Verification → verify-voted-sticker Edge Function
  ↓
Gemini 2.0 Flash → JSON verdict { verdict, confidence, reasoning }
  ↓
Record Verification → election_day_verifications table
  ↓
Award XP → profiles table (xp, level)
  ↓
Show Success → User sees completion modal
```

## Testing Checklist

- [ ] Commands tab shows all 4 missions
- [ ] Mission cards display correctly with deadlines
- [ ] Tapping mission navigates to detail screen
- [ ] GPS location works in browser (PWA)
- [ ] Photo upload opens file picker
- [ ] Edge Function verifies "I Voted" stickers
- [ ] XP is awarded on successful verification
- [ ] Google Maps opens with precinct location
- [ ] Already-verified users see "Mission Complete" message
- [ ] Squad progress bars update correctly

## Known Limitations (PWA-specific)

1. **Contact Access**: Web browsers cannot access device contacts (security restriction)
2. **Native Camera**: Uses file input instead of camera API on some browsers
3. **Background GPS**: No continuous GPS tracking (one-time location check only)
4. **Offline Support**: Photo upload requires network connection

## Next Steps

### Optional Enhancements:
1. Add Squad Status badges showing district peer completions
2. Implement real-time leaderboard for mission completions
3. Add push notifications when squad members complete missions
4. Create mission replay/history view
5. Add streak tracking for consecutive mission completions

## Troubleshooting

### Photo Upload Fails
- Check storage bucket exists: `SELECT * FROM storage.buckets WHERE id = 'mission-proofs'`
- Verify RLS policies allow inserts
- Check file size limit (default: 50MB)

### GPS Not Working
- Ensure HTTPS (geolocation requires secure context)
- Check browser permissions
- Verify location services enabled on device

### Edge Function Errors
- Check GOOGLE_API_KEY is set correctly
- Verify Gemini API quota not exceeded
- Check Edge Function logs in Supabase Dashboard

### AI Verification Issues
- Test with clear, well-lit photos
- Ensure "I Voted" sticker is visible
- Try different photo angles if rejected

## API References

- [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [Google Gemini API](https://ai.google.dev/docs)
- [Supabase Storage](https://supabase.com/docs/guides/storage)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

**Implementation Complete: February 9, 2026**
