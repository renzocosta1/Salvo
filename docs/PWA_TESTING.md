# PWA Testing Guide

## PWA Fixes Applied (Feb 2026)

1. **Service Worker cache bust** – Bumped `salvo-v1` → `salvo-v2`. Old PWA caches are cleared on next load.
2. **Network-first for JS/CSS** – App shell and mission flow update as soon as you deploy, instead of serving stale bundles.
3. **`/directive/[id]` redirect** – Any link to the old directive screen (tap + Pillage Meter) now redirects to the full mission screen (GPS, photo upload, Maps).
4. **SW update check** – Service worker checks for updates every 60s when PWA is open. In standalone mode, the app auto-reloads when a new version is available.

## Testing PWA on Phone

### Deploy and Test

1. Build: `npm run web:build`
2. Deploy: `npm run deploy:vercel` (or your deploy command)
3. On your phone, open the deployed URL (e.g. `https://salvo-eight.vercel.app`)
4. Add to Home Screen (browser menu → Add to Home Screen)
5. Open the PWA from the home screen – you should see the same mission flow as localhost (GPS, photo upload, Maps, etc.)

### If You Still See the Old Tap Flow

1. Remove the PWA from your home screen.
2. In the browser, clear site data for the Salvo URL (Settings → Site Settings → Clear data).
3. Add the PWA to the home screen again.
4. Or wait ~60s with the app open – the SW update check should trigger a reload.

### Session / Onboarding Repeating on PWA

If you see age check or address entry again on an account that already completed onboarding:

- **Different origins** – `localhost` and your deployed URL use different origins. Supabase auth is origin-specific; sessions do not share across origins.
- **Solution** – Use the same URL for testing (either deploy and test on the deployed URL, or use a tunnel like ngrok for localhost on your phone).
- **PWA storage** – On some mobile browsers, PWA storage can differ from the browser. If you install the PWA from the deployed URL, your session should persist within that PWA.

## Mission Flow (Task 29)

- **Command tab** → mission cards → tap → full mission screen
- **Mission screen** includes: GPS check-in, photo upload, AI verification, Google Maps link
- The old “TAP TO PILLAGE” orange circle flow is deprecated; `/directive/[id]` now redirects to the mission screen.
