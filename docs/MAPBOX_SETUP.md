# Mapbox Setup Guide

## Step 1: Get Your Mapbox Access Token

1. Go to https://account.mapbox.com/auth/signup/
2. Sign up for a **free account**
3. After signing in, go to https://account.mapbox.com/access-tokens/
4. Copy your **Default Public Token** (starts with `pk.`)

**Free Tier Includes:**
- 50,000 map loads per month (plenty for testing!)
- No credit card required

---

## Step 2: Add Token to Your .env File

Create or update `.env` in the project root:

```env
EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.YOUR_TOKEN_HERE
```

Replace `pk.YOUR_TOKEN_HERE` with your actual token.

---

## Step 3: Restart Expo

After adding the token:

```bash
# Stop the current Expo server (Ctrl+C)
npx expo start --clear
```

---

## Mapbox Style

We'll use a **dark tactical map style** for the Fog of War effect:

**Style URL:** `mapbox://styles/mapbox/dark-v11`

This gives us:
- Dark background (perfect for fog of war)
- Minimal labels
- Tactical military feel
- Hard Party Green (#00ff88) hexagons will pop!

---

## H3 Resolution 9 Details

**What is H3?**
- Uber's hexagonal grid system
- Covers the entire Earth with hexagons
- Resolution 9 = ~0.1 km² hexagons (perfect for city exploration)

**Example:**
- Your location: `(37.7749, -122.4194)` (San Francisco)
- H3 Index: `89283082c3fffff`
- Hexagon size: ~350m across (about 3-4 city blocks)

---

## Testing Locations

**Montgomery County, MD** (your area):
- Silver Spring: `(38.9907, -77.0261)`
- Bethesda: `(38.9807, -77.1006)`
- Rockville: `(39.0840, -77.1528)`

---

**Next:** Once you have your Mapbox token, we'll create the map screen! 🗺️
