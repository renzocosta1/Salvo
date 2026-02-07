# How to Load Task 30 Seed Data (Montgomery County + Missions)

Run this **once** in your Supabase project. Running it twice will insert duplicate missions.

---

## Step 1: Open Supabase SQL Editor

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your Salvo project
3. In the left sidebar, click **SQL Editor**

---

## Step 2: Run the Seed Script

1. Click **New query**
2. Open this file in your project: `Scripts/seed_montgomery_alpha_data.sql`
3. Copy the **entire file** (Ctrl+A, Ctrl+C)
4. Paste into the SQL Editor
5. Click **Run** (or Ctrl+Enter)

---

## Step 3: Check the Result

You should see:

- **Success** with no red errors
- In the **Results** panel, three result sets at the end:
  1. **First table**: 4 rows – the 4 tactical missions (title, mission_type, target_goal, mission_deadline, requires_gps)
  2. **Second table**: 7 rows – one per Montgomery County district (14–20) with race counts
  3. **Third table**: Many rows – races per district with endorsed/total candidate counts

In the **Messages** (or Logs) area you may see notices like:
- `Created The Hard Party with ID: ...` (if the party didn’t exist)
- `Seeded 4 tactical missions`
- `Created ballot for District 14` … through `District 20`
- `Seeded ballot data for Montgomery County Districts 14-20`

---

## Step 4: Optional – Verify in Table Editor

- **directives**: 4 new rows (Relational Raid, Digital Ballot, Early Raid, Election Day Siege)
- **md_ballots**: 7 rows (Montgomery, Districts 14–20)
- **md_ballot_races**: 63 rows (9 races × 7 districts)
- **md_ballot_candidates**: ~200 rows

---

## If Something Fails

- **“relation md_ballots does not exist”**  
  Run migration `docs/migrations/005_alpha_schema.sql` first.

- **“column mission_type does not exist”**  
  Same: run `005_alpha_schema.sql` (it adds `mission_type`, `mission_deadline`, `requires_gps` to `directives`).

- **Duplicate key or constraint error**  
  You may have run the script before. Either leave the data as-is or delete the seeded rows from `directives`, `md_ballot_candidates`, `md_ballot_races`, `md_ballots` (in that order, due to foreign keys) and run the script again.

---

## Run Only Once

This script does **not** use “upsert” for directives. Running it multiple times will insert 4 new missions each time. Run it **once** per environment (dev/staging/prod).
