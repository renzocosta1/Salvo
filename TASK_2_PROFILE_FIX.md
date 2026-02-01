# 🐛 Task #2: Profile Fetch Error - FIXED

## Issue Description

**Problem**: App was stuck in an infinite loop trying to fetch a non-existent profile:
- ❌ Error: "PGRST116 - The result contains 0 rows"
- ❌ App skipped to Oath screen instead of Login screen
- ❌ Infinite retry loop consuming resources
- ❌ User couldn't access signup/login screens

## Root Cause

### 1. **Infinite Retry Loop** in `AuthProvider.tsx`
```typescript
// BROKEN CODE (Lines 46-51):
if (error) {
  console.error('Error fetching profile:', error);
  // Retry after a short delay
  setTimeout(() => fetchProfile(userId), 1000);  // ❌ INFINITE LOOP!
  return;
}
```

**Problem**: When profile fetch failed, it retried **forever** without a stop condition. The `return` statement prevented `setLoading(false)` in the `finally` block from executing, so the app was stuck in loading state forever.

### 2. **Auth Guard Logic Issue** in `app/_layout.tsx`
```typescript
// BROKEN LOGIC (Line 70):
if (session && (!profile?.oath_signed_at || !profile?.contract_version_id)) {
  if (!inGatesGroup) {
    router.replace('/(gates)/oath');  // ❌ Redirects even when profile is null!
  }
}
```

**Problem**: When `profile` is `null` (doesn't exist), the condition `!profile?.oath_signed_at` evaluates to `true`, causing a redirect to the Oath screen. But the Oath screen requires a profile to update!

This created the scenario:
1. User deleted profiles from Supabase
2. Old session still exists in AsyncStorage
3. App tries to fetch profile → fails
4. Auth guard sees: `session = exists`, `profile = null`
5. Auth guard thinks: "User needs to sign oath!" (wrong!)
6. Redirects to Oath screen
7. Oath screen tries to fetch profile → fails again
8. Infinite loop

---

## ✅ The Fix

### 1. **Fixed Infinite Retry Loop** (`lib/auth/AuthProvider.tsx`)

```typescript
const fetchProfile = async (userId: string, retryCount = 0) => {
  const MAX_RETRIES = 3;  // ✅ Max retry limit
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, party:parties(*), rank:ranks(*)')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      
      // Retry up to MAX_RETRIES times
      if (retryCount < MAX_RETRIES) {  // ✅ Retry counter!
        console.log(`Retrying profile fetch (${retryCount + 1}/${MAX_RETRIES})...`);
        setTimeout(() => fetchProfile(userId, retryCount + 1), 1000);
        return;
      }
      
      // ✅ Max retries reached - stop trying!
      console.log('Profile not found after retries. User may need to sign oath.');
      setProfile(null);
      setLoading(false);  // ✅ Always set loading to false!
      return;
    }

    setProfile(data as Profile);
    setLoading(false);  // ✅ Set loading to false on success too!
  } catch (error) {
    console.error('Error fetching profile:', error);
    setProfile(null);
    setLoading(false);  // ✅ Always set loading to false!
  }
};
```

**Changes**:
- Added `retryCount` parameter with `MAX_RETRIES = 3`
- Always calls `setLoading(false)` after max retries or success
- Gracefully handles "profile doesn't exist" scenario

### 2. **Fixed Auth Guard Logic** (`app/_layout.tsx`)

```typescript
// ✅ NEW: Handle orphaned sessions (session exists but no profile)
if (session && !profile) {
  console.log('Session exists but no profile found - signing out');
  supabase.auth.signOut();  // ✅ Clear orphaned session
  router.replace('/(auth)/login');  // ✅ Redirect to login
  return;
}

// ✅ UPDATED: Only redirect to oath if profile EXISTS
if (session && profile && (!profile.oath_signed_at || !profile.contract_version_id)) {
  if (!inGatesGroup) {
    router.replace('/(gates)/oath');
  }
  return;
}
```

**Changes**:
- Added check for orphaned sessions: `if (session && !profile)`
- Signs out the user if session exists but profile doesn't
- Updated oath check to require `profile` to exist first: `if (session && profile && ...)`

---

## 🎯 Expected Behavior (After Fix)

### **Scenario 1: Fresh Install / No Session**
1. User opens app
2. AuthProvider: `session = null`, `profile = null`, `loading = false`
3. Auth guard redirects to `/(auth)/login` ✅
4. User sees Login screen ✅

### **Scenario 2: New Signup**
1. User signs up with email/password
2. Supabase creates user in `auth.users`
3. Database trigger auto-creates profile in `profiles` table
4. AuthProvider fetches profile (retries up to 3 times if needed)
5. Profile found: `role = 'warrior'`, `oath_signed_at = null`
6. Auth guard redirects to `/(gates)/oath` ✅
7. User signs oath → Profile updated → Redirected to main app ✅

### **Scenario 3: Orphaned Session (Your Case)**
1. User opens app with old session
2. Profile was deleted from Supabase
3. AuthProvider tries to fetch profile → fails
4. After 3 retries: `session = exists`, `profile = null`, `loading = false`
5. Auth guard detects orphaned session
6. Auth guard signs out user and redirects to `/(auth)/login` ✅
7. User can now sign up again ✅

### **Scenario 4: Google Sign-In**
1. User taps "Continue with Google"
2. Redirects to Google → Authenticates
3. Redirects back via `salvo://auth-callback`
4. Supabase creates user in `auth.users`
5. Database trigger auto-creates profile
6. AuthProvider fetches profile
7. Auth guard redirects to `/(gates)/oath` ✅
8. User signs oath → Redirected to main app ✅

---

## 🧪 Testing Instructions

### **Test 1: Fresh Start (No Session)**
1. Force close Expo Go
2. Reopen and load the app
3. **Expected**: See Login screen immediately
4. **Verify**: No infinite error logs in console

### **Test 2: Email Signup**
1. Tap "Sign Up"
2. Enter email, password, display name
3. Tap "Create Account"
4. **Expected**: See Oath screen after ~1-2 seconds
5. **Verify**: No "Error fetching profile" messages
6. Scroll to bottom and tap "JOIN THE HARD PARTY"
7. **Expected**: Redirected to main app

### **Test 3: Google Sign-In**
1. Tap "Continue with Google"
2. Choose account
3. **Expected**: Redirected back to app → Oath screen
4. Sign oath
5. **Expected**: Redirected to main app

### **Test 4: Check Database**
After signup, verify in Supabase:
1. Go to **Table Editor → profiles**
2. Find your profile
3. **Verify**:
   - `id` matches your user ID
   - `role` = `'warrior'`
   - `level` = `0`
   - `xp` = `0`
   - `oath_signed_at` = `null` (before signing)
   - `party_id` = `null` (before signing)

After signing oath:
1. Refresh Supabase
2. **Verify**:
   - `oath_signed_at` has a timestamp
   - `party_id` links to "Hard Party"
   - `contract_version_id` is set

---

## 🚨 Key Takeaways

1. **Always set `loading = false`**: Even on errors! Otherwise the app gets stuck.
2. **Add retry limits**: Never create infinite loops. Use max retry counters.
3. **Handle edge cases**: Orphaned sessions, missing profiles, etc.
4. **Check existence before accessing properties**: `if (session && profile && profile.field)`

---

## 📊 Files Modified

1. `lib/auth/AuthProvider.tsx`:
   - Added `MAX_RETRIES` and `retryCount` parameter
   - Fixed `setLoading(false)` calls
   - Added graceful error handling

2. `app/_layout.tsx`:
   - Added `supabase` import
   - Added orphaned session detection and cleanup
   - Fixed auth guard logic to check profile existence

---

## ✅ Status

**Task #2 is now TRULY ready for testing!** 🎉

All auth flows should work:
- ✅ Email signup/login
- ✅ Google Sign-In
- ✅ Apple Sign-In
- ✅ Oath screen
- ✅ Profile auto-creation
- ✅ No more infinite loops!
- ✅ No more orphaned sessions!

---

**Reload your app and test it now!** The errors should be gone and you should see the Login screen.
