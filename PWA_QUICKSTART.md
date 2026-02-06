# Salvo PWA Quick Start

**Get your PWA deployed in 10 minutes.**

---

## Step 1: Generate PWA Icons

```bash
npm install
npm run pwa:icons
```

This creates `public/icon-192.png` and `public/icon-512.png`.

---

## Step 2: Generate VAPID Keys for Push Notifications

```bash
node Scripts/generate-vapid-keys.js
```

Copy the output to your `.env` file:
```env
EXPO_PUBLIC_VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv...
VAPID_PRIVATE_KEY=UUxI4O8-FbRouAevSmBQ6o8...
```

---

## Step 3: Create Push Subscriptions Table

In Supabase SQL Editor, run:

```sql
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

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX push_subscriptions_user_id_idx ON push_subscriptions(user_id);
```

---

## Step 4: Build & Test Locally

```bash
npm run web:build
npm run web:serve
```

Visit `http://localhost:3000` and test:
- ✅ Install prompt appears on mobile browser
- ✅ Offline mode works (disable network in DevTools)
- ✅ Icons and manifest load correctly

---

## Step 5: Deploy to Vercel

```bash
npm install -g vercel
vercel login
npm run deploy:vercel
```

**Add environment variables in Vercel dashboard:**
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_GOOGLE_CIVIC_API_KEY`
- `EXPO_PUBLIC_VAPID_PUBLIC_KEY`
- `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`

---

## Step 6: Test on iPhone & Android

### iPhone (iOS 16.4+ required):
1. Open Safari, visit your Vercel URL
2. Tap **Share** button → **Add to Home Screen**
3. Tap **Add**
4. Open Salvo from home screen
5. Subscribe to push notifications when prompted

### Android:
1. Open Chrome, visit your Vercel URL
2. Tap **Install** banner (or menu → Add to Home screen)
3. Open Salvo from home screen
4. Subscribe to push notifications

---

## Step 7: Send Test Push Notification

Create Supabase Edge Function `supabase/functions/send-push/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import webpush from "npm:web-push"

const VAPID_PUBLIC_KEY = Deno.env.get('EXPO_PUBLIC_VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!

webpush.setVapidDetails(
  'mailto:your-email@salvo.vote',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
)

serve(async (req) => {
  const { userId, title, body, url } = await req.json()
  
  const { data: subs } = await supabaseAdmin
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)
  
  const results = await Promise.all(
    subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body, data: { url } })
      )
    )
  )
  
  return new Response(JSON.stringify({ sent: results.length }))
})
```

Deploy:
```bash
supabase functions deploy send-push
```

Add VAPID keys to Supabase Edge Function environment:
```bash
supabase secrets set VAPID_PRIVATE_KEY=your_private_key
```

Test:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/send-push \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"userId":"user-uuid","title":"Test","body":"Push notification works!"}'
```

---

## Troubleshooting

**Icons not showing?**
- Run `npm run pwa:icons` to generate them
- Check `public/icon-192.png` and `public/icon-512.png` exist
- Reinstall PWA after adding icons

**Push notifications not working on iOS?**
- iOS must be 16.4+
- PWA must be installed to home screen (not running in Safari)
- User cannot be in EU country (Apple restriction)
- Check VAPID keys are in .env

**Service worker not registering?**
- Must be HTTPS (Vercel provides this automatically)
- Check browser console for errors
- Verify `public/sw.js` exists

---

## Next Steps

- Set up custom domain (e.g., `app.salvo.vote`)
- Implement push notification sending logic for Election Day alerts
- Add more routes to service worker precache for offline mode
- Monitor PWA install rate and push notification opt-in rate

---

## Full Documentation

See `docs/PWA_DEPLOYMENT_GUIDE.md` for comprehensive deployment instructions.

---

**Ready to go un-bannable? 🚀**
