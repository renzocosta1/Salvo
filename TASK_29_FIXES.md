# Task 29 Bug Fixes - February 14, 2026

## Issues Fixed ✅

### 1. Maps Redirecting to Apple Store ✅
**Problem**: When tapping "Navigate to Polling Place", the app opened Google Maps web, but clicking "Start" redirected to App Store even though Maps app was installed.

**Root Cause**: iOS Safari in PWA mode doesn't handle `maps://` URL scheme properly from web context.

**Fix**: Changed the code to ALWAYS use the web Google Maps URL (`https://www.google.com/maps/dir/?api=1&destination=...`) instead of trying to use native app schemes. This works universally across all platforms and doesn't trigger App Store redirects.

**Files Changed**:
- `app/(tabs)/mission/[id].tsx` - Simplified `handleOpenMaps()` to only use web URL

---

### 2. White Status Bar at Top ✅
**Problem**: PWA on iOS showed a white bar at the top instead of matching the dark theme.

**Root Cause**: The `apple-mobile-web-app-status-bar-style` was set to `"black-translucent"` which makes the status bar overlay on content and can appear white depending on what's behind it.

**Fix**: Changed to `"black"` which gives a solid black status bar with white text, matching our dark theme perfectly.

**Files Changed**:
- `app/+html.tsx` - Changed meta tag from `"black-translucent"` to `"black"`
- Added additional `theme-color` meta tag for dark mode

---

### 3. Push Notifications Not Persisting ✅
**Problem**: When enabling push notifications, then switching away from the app and back, the toggle would reset to disabled.

**Root Cause**: The subscription check on mount wasn't properly handling the case where a subscription exists but the state wasn't being set correctly.

**Fix**: 
- Added explicit state resets when no subscription is found
- Added check for existing subscription before creating a new one (prevents duplicates)
- Added better console logging to debug subscription state
- Ensured subscription is saved to database on every subscribe call

**Files Changed**:
- `lib/pwa/use-web-push.ts` - Improved subscription state management

---

### 4. Test Notification Section Removed ✅
**Problem**: There was a "Test Push Notifications" section on the profile screen that the user wanted removed.

**Fix**: Removed the `<TestNotificationButton />` component from the profile screen. The component still exists in case you want to use it via code/admin panel.

**Files Changed**:
- `app/(tabs)/two.tsx` - Removed TestNotificationButton import and usage

---

## Issues That Need Server-Side Fixes ⚠️

### 5. Photo Verification Not Working ⚠️
**Problem**: When uploading a photo, it shows "loading" briefly then returns to the "Upload 'I Voted' Photo" button without any feedback.

**Root Cause**: The Gemini AI Edge Function (`verify-voted-sticker`) is either:
- Not deployed to Supabase
- Deployed but the Gemini API key isn't configured
- Returning an error that's not being shown

**Fix Applied**: Added better error messaging to show what went wrong.

**What You Need To Do**:

#### Option 1: Deploy the Edge Function (Recommended)
```bash
cd "c:\Coding Projects\Salvo"

# Make sure you're logged into Supabase CLI
npx supabase login

# Link to your project (if not already linked)
npx supabase link --project-ref zzkttbyaqihrezzowbar

# Deploy the function
npx supabase functions deploy verify-voted-sticker

# Set the required secrets (environment variables)
npx supabase secrets set GOOGLE_API_KEY=AIzaSyD2h2hscV61WmUzFuvHMfVy-6QdGBdnJJ4
```

#### Option 2: Check If Already Deployed
1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/zzkttbyaqihrezzowbar
2. Navigate to **Edge Functions** in the left sidebar
3. Check if `verify-voted-sticker` is listed
4. If yes, click on it and check the **Secrets** tab
5. Make sure `GOOGLE_API_KEY` is set

#### Option 3: Test the Function
```bash
# Test the function locally first
npx supabase functions serve verify-voted-sticker

# In another terminal, test it:
curl -i --location --request POST 'http://localhost:54321/functions/v1/verify-voted-sticker' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"photo_url":"https://example.com/test.jpg","mission_type":"ELECTION_DAY_SIEGE"}'
```

---

## Testing Instructions 🧪

### 1. Test Status Bar Fix (iOS PWA)
1. If the PWA is already installed, **delete it from home screen**
2. Open Safari and go to your app URL
3. Tap Share → Add to Home Screen
4. Open the PWA from home screen
5. The status bar at the top should now be solid black, matching the app

### 2. Test Maps Fix
1. Open the PWA
2. Go to Commands tab
3. Tap "Election Day Siege" mission
4. Tap "Navigate to Polling Place"
5. Should open Google Maps web with directions
6. Should NOT redirect to App Store

### 3. Test Push Notifications Fix
1. Open the PWA
2. Go to Profile tab
3. Enable "Push Notifications" toggle
4. Permission prompt should appear - tap "Allow"
5. Toggle should show enabled
6. Switch to another app (don't close PWA)
7. Switch back to PWA
8. Toggle should STILL be enabled ✅

### 4. Test Photo Verification (After Deploying Edge Function)
1. Go to Commands tab
2. Tap "Election Day Siege" mission
3. Tap "Upload 'I Voted' Photo"
4. Select any test photo
5. Should show "Uploading photo..."
6. Then "Verifying with AI..."
7. Then either:
   - ✅ Success: "Mission Complete! +250 XP"
   - ❌ Rejection: "Verification Failed" with reason

If you see an error about Edge Function, check the deployment steps above.

---

## Summary of Changes

| Issue | Status | Priority | Fix Location |
|-------|--------|----------|--------------|
| Maps → App Store | ✅ Fixed | High | `mission/[id].tsx` |
| White status bar | ✅ Fixed | High | `app/+html.tsx` |
| Push notifications reset | ✅ Fixed | High | `use-web-push.ts` |
| Test notification section | ✅ Removed | Low | `two.tsx` |
| Photo verification | ⚠️ Deploy Edge Function | Critical | Supabase Dashboard |

---

## Next Steps

1. **Deploy the Gemini Edge Function** (see instructions above)
2. **Test on your phone** using the testing instructions
3. **Report back** if any issues remain

Once the Edge Function is deployed, Task 29 should be 100% complete! 🎉

---

**Updated**: February 14, 2026
**Build**: PWA with fixes applied
