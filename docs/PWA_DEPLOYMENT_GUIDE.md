# Salvo PWA Deployment Guide

## Overview

This guide covers deploying Salvo as a Progressive Web App (PWA) to Vercel or Netlify. The PWA enables:
- **Un-bannable access**: Direct home screen installation bypasses app stores
- **Offline functionality**: War Room and Ballot cached for no-signal areas
- **Push notifications**: Election Day alerts on iOS 16.4+ and Android
- **Better performance**: Faster loading with service worker caching

---

## Prerequisites

### 1. Generate PWA Icons

```bash
npm run pwa:icons
```

This creates `icon-192.png` and `icon-512.png` in the `public/` folder.

**Manual alternative:** Copy your app icon to `public/` and resize to 192x192 and 512x512 pixels.

### 2. Generate VAPID Keys for Push Notifications

Install web-push globally:
```bash
npm install -g web-push
```

Generate VAPID keys:
```bash
npx web-push generate-vapid-keys
```

**Output example:**
```
Public Key: BEl62iUYgUivxIkv69yViEuiBIa-Ib27SDbQjaDTbVJWk...
Private Key: UUxI4O8-FbRouAevSmBQ6o8...
```

Add to `.env`:
```env
# Web Push Notifications (VAPID)
EXPO_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here  # Server-side only!
```

⚠️ **NEVER commit the private key to Git!** Keep it in `.env` (which is `.gitignore`d).

### 3. Create Push Subscriptions Table in Supabase

Run this SQL in your Supabase SQL Editor:

```sql
-- Table for storing Web Push subscriptions
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'web',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own subscriptions
CREATE POLICY "Users can insert own subscriptions" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own subscriptions" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions" ON push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions" ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX push_subscriptions_user_id_idx ON push_subscriptions(user_id);
```

---

## Build the PWA

Export the static web build:

```bash
npm run web:build
```

This creates a `dist/` folder with your optimized PWA.

**Test locally before deploying:**
```bash
npm run web:serve
```

Visit `http://localhost:3000` and test:
- ✅ Install prompt appears on mobile
- ✅ Offline mode works (disable network in DevTools)
- ✅ Manifest and icons load correctly

---

## Deploy to Vercel (Recommended)

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login

```bash
vercel login
```

### Step 3: Deploy

```bash
npm run deploy:vercel
```

Or use the Vercel CLI directly:
```bash
vercel --prod
```

### Step 4: Configure Environment Variables

In the Vercel dashboard:
1. Go to **Settings > Environment Variables**
2. Add all variables from your `.env` file:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_GOOGLE_CIVIC_API_KEY`
   - `EXPO_PUBLIC_VAPID_PUBLIC_KEY`
   - `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`

⚠️ **Do NOT add the VAPID private key to Vercel!** It should only be in Supabase Edge Functions.

### Step 5: Configure Custom Domain

1. Go to **Settings > Domains**
2. Add your domain (e.g., `app.salvo.vote`)
3. Follow DNS configuration instructions

### Step 6: Test Production Deployment

On your iPhone or Android:
1. Visit your deployed URL
2. Install PWA to home screen
3. Test offline mode
4. Subscribe to push notifications
5. Verify notifications work (you'll need to implement the send function in Supabase)

---

## Deploy to Netlify (Alternative)

### Step 1: Install Netlify CLI

```bash
npm install -g netlify-cli
```

### Step 2: Login

```bash
netlify login
```

### Step 3: Initialize & Deploy

```bash
netlify init
```

Follow the prompts, then:

```bash
npm run deploy:netlify
```

### Step 4: Configure Environment Variables

In the Netlify dashboard:
1. Go to **Site settings > Environment variables**
2. Add all public environment variables (same as Vercel)

### Step 5: Set Up Continuous Deployment

1. In **Site settings > Build & deploy**
2. Link your GitHub repository
3. Set build command: `npm run web:build`
4. Set publish directory: `dist`

Now every push to `main` automatically deploys!

---

## iOS PWA Installation Instructions

**For users with iOS 16.4+ (required for push notifications):**

1. Open Safari and visit `https://your-domain.com`
2. Tap the **Share** button (square with arrow) at the bottom
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **"Add"** in the top right
5. Find the Salvo icon on your home screen

**After installation:**
- The app runs in standalone mode (no browser bars)
- You can subscribe to push notifications
- Offline mode caches War Room and Ballot

⚠️ **EU Limitation**: iOS PWAs in EU countries do not support push notifications due to the Digital Markets Act.

---

## Android PWA Installation Instructions

**Chrome/Edge on Android:**

### Option 1: Native Install Prompt
If your browser supports it, you'll see an "Install Salvo" banner at the bottom. Tap **Install**.

### Option 2: Manual Installation
1. Open your site in Chrome/Edge
2. Tap the **menu (⋮)** in the top right
3. Tap **"Add to Home screen"** or **"Install app"**
4. Tap **Add**

**After installation:**
- Full offline support
- Push notifications enabled
- Runs like a native app

---

## Testing Checklist

Before going live, test on real devices:

### iOS (16.4+)
- [ ] Install PWA to home screen
- [ ] App launches in standalone mode
- [ ] Offline mode works (War Room, Ballot cached)
- [ ] Push notification permission prompt appears
- [ ] Can subscribe to notifications
- [ ] Service worker updates correctly

### Android
- [ ] Install prompt appears automatically
- [ ] Install to home screen works
- [ ] Standalone mode works
- [ ] Offline caching functional
- [ ] Push notifications work
- [ ] Service worker caching effective

### Desktop (Chrome/Edge)
- [ ] Install prompt works
- [ ] PWA installs to taskbar/dock
- [ ] Service worker caching works
- [ ] Push notifications functional

---

## Sending Push Notifications

To send push notifications from your backend, you'll need to create a Supabase Edge Function:

```typescript
// supabase/functions/send-push/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import webpush from "npm:web-push"

const VAPID_PUBLIC_KEY = Deno.env.get('EXPO_PUBLIC_VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!

webpush.setVapidDetails(
  'mailto:your-email@example.com',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

serve(async (req) => {
  const { userId, title, body, url } = await req.json()
  
  // Get user's push subscriptions
  const { data: subscriptions } = await supabaseAdmin
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)
  
  const results = await Promise.all(
    subscriptions.map(sub =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        },
        JSON.stringify({ title, body, data: { url } })
      )
    )
  )
  
  return new Response(JSON.stringify({ sent: results.length }))
})
```

---

## Troubleshooting

### "Service Worker registration failed"
- Check that `public/sw.js` exists and is accessible
- Verify your site is served over HTTPS (required for service workers)
- Check browser console for detailed errors

### Push notifications don't work on iOS
- Verify iOS version is 16.4+
- Ensure PWA is installed to home screen (not running in Safari)
- Check that user is not in an EU country
- Verify VAPID keys are correctly configured

### Offline mode not working
- Check Service Worker is registered (DevTools > Application > Service Workers)
- Verify cache storage has entries (DevTools > Application > Cache Storage)
- Test by disabling network in DevTools, not airplane mode (airplane mode may behave differently)

### Icons not showing
- Verify `public/icon-192.png` and `public/icon-512.png` exist
- Check manifest.json paths are correct (`/icon-192.png`, not `./icon-192.png`)
- Clear browser cache and reinstall PWA

---

## Performance Optimization

### Cache Strategy
The service worker uses:
- **Cache-first** for static assets (JS, CSS, images)
- **Network-first** for navigation (HTML pages)
- **Network-only** for Supabase API calls (always fresh data)

### Bundle Size
To reduce bundle size:
```bash
npm run web:build -- --clear
```

### Pre-caching Critical Routes
Edit `public/sw.js` to add more routes to `PRECACHE_URLS`:
```javascript
const PRECACHE_URLS = [
  '/',
  '/(tabs)',
  '/(tabs)/command-center',
  '/mission/[id]',  // Add your critical routes
];
```

---

## Security Considerations

1. **VAPID Private Key**: Never expose in client-side code or commit to Git
2. **HTTPS Required**: PWAs must be served over HTTPS (Vercel/Netlify handle this)
3. **RLS Policies**: Ensure push_subscriptions table has proper Row Level Security
4. **Content Security Policy**: Consider adding CSP headers in Vercel/Netlify config

---

## Monitoring & Analytics

Track PWA performance:
- Install rate (compare web traffic vs. installed users)
- Service worker cache hit rate
- Push notification subscription rate
- Offline usage patterns

Use Vercel/Netlify Analytics or integrate Google Analytics with PWA tracking.

---

## Next Steps

1. Generate icons: `npm run pwa:icons`
2. Generate VAPID keys and add to `.env`
3. Create push_subscriptions table in Supabase
4. Build PWA: `npm run web:build`
5. Deploy to Vercel: `npm run deploy:vercel`
6. Test on real devices
7. Configure custom domain
8. Implement Supabase Edge Function for push notifications
9. Monitor and iterate!

---

For questions or issues, check:
- [Expo PWA Docs](https://docs.expo.dev/guides/progressive-web-apps)
- [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)
- [iOS Safari PWA Support](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados)
