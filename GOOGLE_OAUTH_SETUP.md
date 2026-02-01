# Google OAuth Setup Guide

## Issue Fixed
Google OAuth was creating accounts in Supabase but not logging users into the app. The problem was:
1. Deep link handler wasn't parsing OAuth tokens from URL fragments (`#`)
2. Development redirect URLs weren't configured in Supabase
3. OAuth tokens weren't being extracted properly from the callback

## Changes Made

### 1. AuthProvider Deep Link Handler
- Now parses tokens from both URL hash fragments (`#`) and search params (`?`)
- Handles both development (`exp://`) and production (`salvo://`) schemes
- Properly calls `supabase.auth.setSession()` with extracted tokens

### 2. OAuth Sign-In Functions
- Uses `Linking.createURL('auth-callback')` to generate the correct redirect URL
- Works in both development (exp://) and production (salvo://)
- Simplified flow - lets AuthProvider handle session setup

## Supabase Configuration Required

**IMPORTANT**: You must add these redirect URLs to your Supabase project:

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to **Authentication** → **URL Configuration**
4. Add these to **Redirect URLs**:

### Development URLs (Expo Go)
```
exp://10.0.0.150:8081/--/auth-callback
exp://localhost:8081/--/auth-callback
exp://127.0.0.1:8081/--/auth-callback
```

**Note**: Replace `10.0.0.150` with your actual local IP address shown in Expo console.

### Production URL (When built)
```
salvo://auth-callback
```

### Wildcard for Development (Recommended)
If Supabase supports wildcards, you can use:
```
exp://*:8081/--/auth-callback
```

## Testing the Fix

1. **Clear existing sessions**:
   - Tap the title "Welcome to Salvo" 5 times on login screen
   - Select "Clean Start (Wipe All Auth Data)"

2. **Test Google Sign-In**:
   - Tap "Continue with Google"
   - Select your Google account
   - Should redirect back to app and log you in
   - Check terminal for logs:
     ```
     [Google OAuth] Redirect URL: exp://...
     [OAuth Deep Link] Received: exp://...
     [OAuth Deep Link] Tokens found in hash fragment
     [OAuth Deep Link] Setting session from deep link callback
     [OAuth Deep Link] Session set successfully: your-email@gmail.com
     ```

3. **Expected Flow**:
   - Login screen → Google account picker → App shows loading → Oath screen

## Troubleshooting

### Still loops back to login?
- Check Supabase redirect URLs are configured correctly
- Verify your Expo dev URL in terminal matches Supabase config
- Check terminal logs for "[OAuth Deep Link]" messages

### "No OAuth tokens found in URL"?
- The redirect URL might not match Supabase configuration
- Check Supabase logs: Authentication → Logs

### Account created but can't sign in?
- Use email/password to sign in manually
- Or clear orphaned accounts from Supabase Authentication → Users

## Development vs Production

### Development (Expo Go)
- Uses `exp://` scheme with your local network IP
- Must be added to Supabase redirect URLs
- Changes each time your IP changes

### Production (Standalone Build)
- Uses `salvo://` custom scheme
- Consistent across all devices
- Single redirect URL needed

## Next Steps

1. ✅ Add Expo dev URLs to Supabase redirect URLs
2. ✅ Test Google OAuth flow
3. ✅ Verify Apple OAuth (uses same deep link handler)
4. ✅ Test in production build with `salvo://` scheme
