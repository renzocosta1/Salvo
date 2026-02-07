# How to Test Push Notifications

## Quick Test Methods

### Method 1: In-App Test Button (Easiest)

1. **Open the app** → Go to **Profile** tab
2. You'll see a **"Test Push Notifications"** card
3. Tap **"Send to Me"** to send yourself a notification
4. Or tap **"Send to All"** to send to all subscribed users

### Method 2: Command Line Script

```bash
node Scripts/test-push-notification.js
```

This sends a test notification to all subscribed users.

---

## Prerequisites

### 1. Generate VAPID Keys (If Not Done)

```bash
node Scripts/generate-vapid-keys.js
```

This will output:
```
EXPO_PUBLIC_VAPID_PUBLIC_KEY=BEl62iUYgUivxIkv...
VAPID_PRIVATE_KEY=UUxI4O8-FbRouAevSmBQ6o8...
```

**Add these to your `.env` file**

### 2. Run Migration 007 (Push Subscriptions Table)

In Supabase SQL Editor:
```bash
# Run the contents of:
docs/migrations/007_push_subscriptions.sql
```

### 3. Deploy Edge Function

```bash
# Login to Supabase CLI
npx supabase login

# Deploy the send-push function
npx supabase functions deploy send-push

# Add VAPID keys to Edge Function environment
npx supabase secrets set EXPO_PUBLIC_VAPID_PUBLIC_KEY="your_public_key"
npx supabase secrets set VAPID_PRIVATE_KEY="your_private_key"
```

---

## Testing Flow

### Step 1: Subscribe to Notifications

1. **On Web (PWA)**:
   - Open app in browser at your Vercel URL
   - On iPhone: Add to Home Screen first (Safari → Share → Add to Home Screen)
   - Open the PWA from home screen
   - Go to Profile tab
   - Toggle "Enable Push Notifications" ON
   - Grant permission when prompted

2. **Check Subscription**:
   ```sql
   -- In Supabase SQL Editor:
   SELECT * FROM push_subscriptions;
   ```
   You should see your subscription with endpoint, keys, etc.

### Step 2: Send Test Notification

**Option A: Use In-App Button**
- Profile tab → Test Push Notifications → Send to Me

**Option B: Use Command Line**
```bash
node Scripts/test-push-notification.js
```

**Option C: Use Supabase Dashboard**
Go to Edge Functions → send-push → Invoke with:
```json
{
  "title": "🎯 Test from Dashboard",
  "body": "This is a manual test!",
  "icon": "/icon-192.png"
}
```

### Step 3: Verify Receipt

- **On iOS**: Notification appears as banner at top
- **On Android**: Notification appears in notification tray
- **If PWA is open**: Notification may appear as in-app message

---

## Troubleshooting

### "No subscriptions found"
- Make sure you've subscribed to notifications first
- Check `push_subscriptions` table in Supabase
- On iOS, PWA must be installed to home screen

### "Edge Function error"
- Verify VAPID keys are set in Edge Function environment:
  ```bash
  npx supabase secrets list
  ```
- Redeploy function if needed:
  ```bash
  npx supabase functions deploy send-push
  ```

### "Notification doesn't appear"
- Check browser console for errors
- Verify service worker is registered (DevTools → Application → Service Workers)
- Check notification permissions (Browser settings)
- On iOS: Must use standalone PWA, not Safari browser

### Test on Multiple Devices

1. Install PWA on iPhone
2. Install PWA on Android
3. Subscribe to notifications on both
4. Send test → both should receive

---

## Advanced Testing

### Send to Specific User

```typescript
// In-app or via Edge Function
{
  "title": "Personal Message",
  "body": "This is only for you!",
  "userIds": ["user-uuid-here"]
}
```

### Send with Custom Data

```typescript
{
  "title": "Mission Alert",
  "body": "New directive available",
  "data": {
    "type": "directive",
    "directiveId": "directive-uuid",
    "url": "/directive/123"
  }
}
```

### Check Sent Count

The response includes:
```json
{
  "sent": 2,
  "failed": 0,
  "total": 2
}
```

---

## Production Checklist

Before going live:

- [x] VAPID keys generated and added to .env
- [x] Migration 007 applied to Supabase
- [x] Edge Function deployed with VAPID secrets
- [x] Test notifications working on iOS PWA
- [x] Test notifications working on Android PWA
- [x] Service worker registered and active
- [x] Notification permissions working
- [x] In-app test buttons functional

---

## Files Reference

- **Edge Function**: `supabase/functions/send-push/index.ts`
- **Test Script**: `Scripts/test-push-notification.js`
- **VAPID Generator**: `Scripts/generate-vapid-keys.js`
- **Migration**: `docs/migrations/007_push_subscriptions.sql`
- **Hook**: `lib/pwa/use-web-push.ts`
- **Toggle Component**: `components/NotificationToggle.tsx`
- **Test Button**: `components/TestNotificationButton.tsx`

---

**Need Help?** Check `PWA_QUICKSTART.md` for full PWA setup guide.
