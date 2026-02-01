# Social Authentication Setup Guide

## Overview
This guide will help you enable Google and Apple Sign-In for Salvo using Supabase OAuth.

---

## Step 1: Disable Email Confirmation (Recommended for Testing)

1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication** → **Settings**
3. Scroll to **Email Auth**
4. **Uncheck** "Enable email confirmations"
5. Click **Save**

This will allow users to sign up without needing to verify their email, making the flow much smoother.

---

## Step 2: Enable Google OAuth

### A. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Go to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**
5. Select **Web application**
6. Add authorized redirect URIs:
   ```
   https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
   ```
   Replace `YOUR_SUPABASE_PROJECT_REF` with your actual Supabase project reference
7. Copy your **Client ID** and **Client Secret**

### B. Configure in Supabase

1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication** → **Providers**
3. Find **Google** and click to expand
4. Toggle **Enable Sign in with Google**
5. Paste your **Client ID**
6. Paste your **Client Secret**
7. Click **Save**

---

## Step 3: Enable Apple OAuth

### A. Apple Developer Account Required

**Important**: Apple Sign-In requires an **Apple Developer Account** ($99/year).

If you have an Apple Developer account:

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Create a new **Service ID**
4. Enable **Sign in with Apple**
5. Configure your domain and redirect URLs:
   ```
   https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback
   ```
6. Create a **Key** for Sign in with Apple
7. Download the `.p8` key file

### B. Configure in Supabase

1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication** → **Providers**
3. Find **Apple** and click to expand
4. Toggle **Enable Sign in with Apple**
5. Enter your **Services ID**
6. Enter your **Team ID**
7. Enter your **Key ID**
8. Upload or paste your **Private Key** (.p8 file contents)
9. Click **Save**

---

## Step 4: Update Supabase Site URL

1. Go to your **Supabase Dashboard**
2. Navigate to **Authentication** → **URL Configuration**
3. Set **Site URL** to:
   - For local development: `exp://localhost:19000` or `http://localhost:19000`
   - For production: Your app's custom URL scheme
4. Add **Redirect URLs**:
   ```
   exp://localhost:19000/*
   myapp://*
   ```
5. Click **Save**

---

## Step 5: Test the Flow

### Testing Google Sign-In:

1. Open your app
2. Tap **"Continue with Google"**
3. Should open a browser window
4. Select your Google account
5. Grant permissions
6. Should redirect back to the app
7. Should see the Oath screen (if first-time user)

### Testing Apple Sign-In:

1. Open your app
2. Tap **"Continue with Apple"**
3. Should open Apple Sign-In
4. Authenticate with Face ID/Touch ID
5. Choose to share or hide email
6. Should redirect back to the app
7. Should see the Oath screen (if first-time user)

---

## Troubleshooting

### "Provider not configured" Error
- Make sure you've enabled the provider in Supabase dashboard
- Verify your Client ID and Client Secret are correct
- Check that redirect URLs are properly configured

### Redirect Not Working
- Verify your Site URL in Supabase matches your app's URL scheme
- Make sure you've added all necessary redirect URLs
- For iOS, ensure your `app.json` has the correct scheme configured

### Profile Not Created
- Check that the database trigger `handle_new_user()` is installed
- Run the migration: `Scripts/apply_task2_migration.sql`
- Verify the trigger is firing by checking Supabase logs

### Email Confirmation Blocking Signup
- Go to Authentication → Settings → Email Auth
- Uncheck "Enable email confirmations"
- This is recommended for a smoother user experience

---

## For Development (Simplified Flow)

If you want to skip social auth setup for now and just test with email:

1. **Disable email confirmation** (Step 1 above)
2. Users can sign up with email/password instantly
3. They'll see the Oath screen immediately
4. Add social auth later when ready to deploy

---

## Security Notes

- **Never commit** OAuth credentials to your repository
- Store them as environment variables or in Supabase dashboard only
- Use different OAuth apps for development and production
- Rotate your secrets if they're ever exposed

---

## Next Steps

Once social auth is working:
- Test the complete flow: Sign in → Oath → Main App
- Verify profile creation in Supabase dashboard
- Test on both iOS and Android
- Configure deep linking for production

---

**Need Help?**
- [Supabase OAuth Docs](https://supabase.com/docs/guides/auth/social-login)
- [Google OAuth Setup](https://support.google.com/cloud/answer/6158849)
- [Apple Sign-In Setup](https://developer.apple.com/sign-in-with-apple/)
