# Task 25 Setup Guide

## Step 1: Run Database Migration

1. Open Supabase Dashboard: https://supabase.com/dashboard/project/zzkttbyaqihrezzowbar
2. Go to **SQL Editor**
3. Create new query
4. Copy and paste the contents of `Scripts/create_polymarket_cache.sql`
5. Click **Run**

## Step 2: Fetch Initial Data

### Option A: Via Supabase Dashboard
1. Go to **Edge Functions**
2. Find `fetch-polymarket-odds`
3. Click **Invoke**
4. Check response shows `"success": true`

### Option B: Via App
Open the app, go to Home tab, pull down to refresh!

## Step 3 (Optional): Set Up Auto-Refresh

1. In Supabase Dashboard, go to **Edge Functions**
2. Click **Cron Jobs** tab
3. Click **Create Cron Job**
4. **Schedule:** `*/15 * * * *` (every 15 minutes)
5. **Function:** `fetch-polymarket-odds`
6. Click **Create**

## Step 4 (Optional): Add More Markets

```sql
INSERT INTO polymarket_tracked_markets (slug, display_name, category, priority) VALUES
  ('your-market-slug-here', 'Display Name', 'category', 2);
```

Find market slugs at: https://polymarket.com

## Done!

Your War Room HUD is live! 🎉
