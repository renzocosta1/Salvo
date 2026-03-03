# Endorsement Admin System - Deployment Guide

## Overview
Complete endorsement management system for leaders to set candidate endorsements with geography-based filtering. Includes ballot data cleanup to remove 2024 election data and use proper 2026 placeholders.

## Changes Summary

### Database Schema
1. **Added `is_placeholder` field** to `md_ballot_candidates` - marks generic placeholder candidates
2. **Added `leadership_role` field** to `profiles` - enables leader access control
3. **Added geography fields** to `profiles` - county, legislative_district, congressional_district
4. **Created `endorsement_audit_log` table** - tracks all endorsement changes for accountability

### Ballot Data Cleanup
- **Removed US Senator race** (2028 election, not 2026)
- **Removed incorrect 2024 candidates** (Larry Hogan, Robin Ficker for Senate)
- **Removed general election matchups** (Wes Moore vs Dan Cox)
- **Created clean 2026 PRIMARY placeholders** with generic candidate names
- **Standardized race ordering** across all counties

### New Services
- `lib/supabase/endorsements.ts` - endorsement CRUD operations, affected user counting, audit logging

### New UI Components
- `components/admin/GeographyFilter.tsx` - county/district picker
- `components/admin/RaceEndorsementCard.tsx` - race display with endorsement controls
- `app/(tabs)/admin-endorsements.tsx` - full admin screen with access control

### Modified Files
- `app/(tabs)/_layout.tsx` - added conditional "Admin" tab for leaders
- `lib/supabase/ballot.ts` - added `is_placeholder` and `max_selections` to types
- `lib/supabase.ts` - added `leadership_role` and geography fields to Profile type

---

## Deployment Steps

### Step 1: Run Database Migrations

Run these SQL scripts **IN ORDER** in Supabase SQL Editor:

#### 1.1: Add new columns to existing tables
```bash
Scripts/add_max_selections_column.sql
Scripts/add_is_placeholder_field.sql
Scripts/add_leadership_roles.sql
```

Expected output:
- `max_selections` column added to `md_ballot_races`
- `is_placeholder` column added to `md_ballot_candidates`
- `leadership_role`, `county`, `legislative_district`, `congressional_district` added to `profiles`

#### 1.2: Create audit log table
```bash
Scripts/create_endorsement_audit_log.sql
```

Expected output:
- New table `endorsement_audit_log` created
- RLS policies applied (leaders can insert/view)

### Step 2: Clean Up Old Ballot Data

#### 2.1: Remove incorrect 2024/general election data
```bash
Scripts/cleanup_montgomery_old_data.sql
```

This deletes all Montgomery County ballot data (will be replaced with clean 2026 data).

### Step 3: Seed Clean 2026 Primary Ballot Data

#### 3.1: Seed Montgomery (Districts 15-20) and Anne Arundel (District 32)
```bash
Scripts/seed_2026_primary_clean.sql
```

Expected output:
- Montgomery County: 6 ballots (Districts 15, 16, 17, 18, 19, 20)
- Anne Arundel County: 1 ballot (District 32)
- Each ballot has 10 races (House, Governor, State Senate, Delegates, County Exec, Council, Board of Ed, 2 Judges, 1 Amendment)
- NO US Senator race
- All candidates are generic placeholders ("Republican Candidate A", etc.)
- One candidate per race is marked as `hard_party_endorsed = true` (can be changed via admin UI)

#### 3.2: Verify clean data
Run this query:
```sql
SELECT 
  b.county,
  b.legislative_district,
  r.race_title,
  COUNT(c.id) as candidates,
  SUM(CASE WHEN c.hard_party_endorsed THEN 1 ELSE 0 END) as endorsed,
  SUM(CASE WHEN c.is_placeholder THEN 1 ELSE 0 END) as placeholders
FROM md_ballots b
JOIN md_ballot_races r ON b.id = r.ballot_id
JOIN md_ballot_candidates c ON r.id = c.race_id
WHERE b.election_date = '2026-06-23'
GROUP BY b.county, b.legislative_district, r.race_title
ORDER BY b.county, b.legislative_district, r.position_order;
```

You should see:
- NO "U.S. Senator" races
- NO "Larry Hogan", "Robin Ficker", or other 2024 candidates
- All candidates marked as placeholders (except Yes/No for judges/amendments)

### Step 4: Set Yourself as State Leader

Find your user ID in Supabase:
```sql
SELECT id, display_name, email 
FROM auth.users 
WHERE email = 'your-email@example.com';
```

Then set your leadership role:
```sql
UPDATE profiles 
SET leadership_role = 'state_leader' 
WHERE id = 'YOUR_USER_ID_HERE';
```

Verify:
```sql
SELECT id, display_name, leadership_role, county, legislative_district
FROM profiles
WHERE leadership_role IS NOT NULL;
```

### Step 5: Test the App

1. **Restart Expo** (if needed):
   ```bash
   npx expo start
   ```

2. **Check Ballot Tab** (both accounts):
   - Anne Arundel account should show: House MD-5 → Governor → State Senate → Delegates → County races
   - Montgomery account should show: House MD-6 → Governor → State Senate → Delegates → County races
   - County name should be correct in header
   - All candidates are placeholders with orange "PLACEHOLDER" badges
   - One candidate per race is endorsed (green highlighting)

3. **Check Admin Tab** (leader account only):
   - Should see new "Admin" tab in navigation (shield icon)
   - Tap "Admin" tab
   - Should see "Admin: Endorsements" screen with geography filter

4. **Test Endorsement Changes**:
   - Select "Montgomery" county → "District 15"
   - Click "Load Races"
   - Should see all 10 races for Montgomery District 15
   - Tap a non-endorsed candidate to endorse them
   - Confirmation dialog should show: "This will affect X users in Montgomery County, District 15"
   - Confirm the change
   - Go back to Ballot tab → refresh → should see new endorsement

---

## Testing Checklist

### Database
- [ ] `max_selections` column exists in `md_ballot_races`
- [ ] `is_placeholder` column exists in `md_ballot_candidates`
- [ ] `leadership_role` column exists in `profiles`
- [ ] `endorsement_audit_log` table exists with RLS policies
- [ ] No "U.S. Senator" races in ballot data
- [ ] All Montgomery and Anne Arundel ballots have 10 races (not 11)
- [ ] All candidates are marked as placeholders
- [ ] Your user has `leadership_role = 'state_leader'`

### UI - Ballot Tab
- [ ] Correct county name in header (not hardcoded "Montgomery")
- [ ] Races in correct order (House → Governor → State Senate → Delegates → County → Board of Ed → Judges → Amendment)
- [ ] Placeholder candidates show orange "PLACEHOLDER" badge
- [ ] Endorsed candidates have green highlighting and filled ovals
- [ ] Incumbents shown under race titles

### UI - Admin Tab (Leaders Only)
- [ ] "Admin" tab appears in navigation (shield icon)
- [ ] Non-leaders see "Access Denied" message
- [ ] Leaders see geography filter (county and district pickers)
- [ ] After loading races, see all races for selected geography
- [ ] Can toggle endorsements with confirmation dialog
- [ ] Impact count shows ("This will affect X users...")
- [ ] After endorsement change, ballot updates for all users

---

## Admin UI User Flow

1. **Leader logs in** → Sees "Admin" tab in navigation
2. **Selects geography**: 
   - County dropdown (Montgomery, Anne Arundel, etc.)
   - District dropdown (auto-populated based on county)
   - "Load Races" button
3. **Views races** for selected geography (10 races per ballot)
4. **Endorses candidates**:
   - Tap candidate to toggle endorsement
   - Confirmation dialog shows impact ("X users affected")
   - For single-select races (Governor, House), only one candidate can be endorsed at a time
   - For multi-select races (Delegates, County Council), up to max_selections can be endorsed
5. **Changes propagate** immediately to all users in that geography
6. **Audit trail** logged in `endorsement_audit_log` table

---

## Security & Validation

### Access Control
- Only users with `leadership_role` set can access admin screen
- RLS policies on `endorsement_audit_log` (only leaders can insert/view)
- Non-leaders see "Access Denied" message

### Endorsement Rules
- **Single-select races**: Only one candidate can be endorsed (radio button behavior)
- **Multi-select races**: Up to `max_selections` candidates can be endorsed (checkbox behavior)
- **Confirmation required**: All endorsement changes require user confirmation
- **Impact preview**: Shows how many users will be affected before confirming

### Data Integrity
- Audit log tracks: who, what, when, how many users affected
- Geography scoping prevents mistakes (can only see races relevant to selected geography)
- Placeholder warnings alert leaders when ballot data needs updating

---

## Future Enhancements (Phase 2)

### Hierarchical Permissions
- **State leaders**: Can endorse any race in Maryland
- **County leaders**: Can only endorse county-wide races (County Executive, County Council, Board of Ed)
- **District leaders**: Can only endorse district-specific races (State Senator, House of Delegates)

### Bulk Operations
- "Copy endorsements from District 15 to District 16" (for similar ballots)
- "Endorse all placeholders as TBD" (mass operation)
- "Import endorsements from CSV" (when real candidates file)

### Candidate Management
- Add/remove/rename candidates directly in admin UI (currently requires SQL)
- Replace placeholder with real candidate name when they file
- Bulk replace all "Republican Candidate A" across multiple districts

### Enhanced UI
- Undo button for recent changes (query audit log)
- Real-time preview of ballot changes
- Search/filter races by type or keyword
- Export endorsements to PDF for printing

---

## Troubleshooting

### Admin tab not showing
- Check that user's `leadership_role` is set: 
  ```sql
  SELECT leadership_role FROM profiles WHERE id = 'YOUR_USER_ID';
  ```
- Should be `'state_leader'`, `'county_leader'`, or `'district_leader'`

### "No races found" in admin UI
- Make sure ballot data is seeded for that county/district combination
- Run: `SELECT * FROM md_ballots WHERE county = 'Montgomery' AND legislative_district = '15';`

### Endorsement changes not showing on ballot
- Refresh the ballot tab (pull down to refresh)
- Check that `hard_party_endorsed` was updated:
  ```sql
  SELECT candidate_name, hard_party_endorsed 
  FROM md_ballot_candidates 
  WHERE race_id = 'RACE_ID';
  ```

### Affected user count is 0
- Users need `county`, `legislative_district`, and `congressional_district` set in their profiles
- Check: `SELECT county, legislative_district FROM profiles LIMIT 10;`

---

## Key Design Decisions

1. **Use `hard_party_endorsed` field** - simpler than separate endorsements table, endorsements are part of ballot data
2. **Generic placeholders** - "Republican Candidate A/B/C" until real candidates file in 2026
3. **Geography-first workflow** - prevents mistakes by forcing leaders to select specific geography before editing
4. **Confirmation dialogs** - all endorsement changes require explicit confirmation with impact preview
5. **Audit logging** - complete trail of who changed what and when for accountability
6. **Access control via `leadership_role`** - simple role-based access, expandable to hierarchical later
7. **Read-only ballot for users** - users see endorsed candidates, can't change them (enforces bloc voting)
