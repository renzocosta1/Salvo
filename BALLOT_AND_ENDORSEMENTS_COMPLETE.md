# Ballot & Endorsement System - Complete Implementation

## Overview
Complete overhaul of the ballot system with clean 2026 PRIMARY data and a powerful admin interface for leaders to manage endorsements across all Maryland geographies.

---

## Part 1: Ballot Data Cleanup

### What Was Fixed
1. **Removed incorrect 2024 data**:
   - ❌ Larry Hogan for US Senate (ran in 2024, not 2026)
   - ❌ Robin Ficker for US Senate (2024 race)
   - ❌ Wes Moore vs Dan Cox general election matchup (this is a PRIMARY ballot)
   - ❌ US Senator race entirely (Maryland's next Senate election is 2028, not 2026)

2. **Created clean 2026 placeholders**:
   - ✅ Generic candidate names: "Republican Candidate A", "Republican Candidate B", etc.
   - ✅ Marked as `is_placeholder = true` in database
   - ✅ Orange "TBD" badges in UI to indicate placeholders
   - ✅ One candidate per race pre-endorsed (can be changed by leaders)

3. **Standardized ballot structure** (10 races per ballot):
   1. U.S. Representative (District-specific)
   2. Governor (Statewide)
   3. State Senator (District-specific)
   4. House of Delegates (District-specific, Vote for up to 3)
   5. County Executive (County-specific)
   6. County Council (County-specific, Vote for up to 4)
   7. Board of Education (County-specific, Vote for up to 2)
   8. Circuit Court Judge (Continuance in Office)
   9. Appellate Court Judge (Continuance in Office)
   10. Constitutional Amendment (Ballot question)

### Ballot UI Improvements
- ✅ **Read-only voting guide** (no user interaction)
- ✅ **Scantron-style filled ovals** for endorsed candidates
- ✅ **Green highlighting** with "✓ ENDORSED" badges
- ✅ **Incumbent display** under each race title
- ✅ **Correct county name** in header (fixed Anne Arundel bug)
- ✅ **Placeholder badges** ("TBD" for placeholder candidates)
- ✅ **Official Maryland ballot aesthetic** - clean, professional, mobile-optimized

---

## Part 2: Endorsement Admin System

### Architecture

```
Leader Account
    ↓
Admin Tab (Shield Icon)
    ↓
Geography Filter (County → District)
    ↓
Race List (10 races per geography)
    ↓
Endorsement Controls (Radio/Checkboxes)
    ↓
Confirmation Dialog (Shows impact: X users affected)
    ↓
Database Update (md_ballot_candidates.hard_party_endorsed)
    ↓
Audit Log (Who, what, when, how many affected)
    ↓
Propagates to All Users (Real-time or on next refresh)
```

### Database Schema

#### New Tables
1. **`endorsement_audit_log`**:
   - Tracks every endorsement change
   - Fields: changed_by_user_id, candidate_id, race_id, previous_endorsed, new_endorsed, affected_geography, estimated_users_affected, created_at
   - RLS: Only leaders can insert/view

#### New Columns
1. **`profiles.leadership_role`**: 'state_leader' | 'county_leader' | 'district_leader' | null
2. **`profiles.county`**: User's county (for geography matching)
3. **`profiles.legislative_district`**: User's legislative district
4. **`profiles.congressional_district`**: User's congressional district
5. **`md_ballot_candidates.is_placeholder`**: Boolean flag for generic placeholders
6. **`md_ballot_races.incumbent_name`**: Current office holder name
7. **`md_ballot_races.max_selections`**: How many candidates can be selected (1 for single-select, 3+ for multi-select)

### Services Created

#### `lib/supabase/endorsements.ts`
- `updateEndorsement(candidateId, endorsed, leaderId, geography, userCount)` - Update single candidate
- `setExclusiveEndorsement(raceId, candidateId, ...)` - For single-select races (radio button behavior)
- `getAffectedUserCount(race, county, district, congressionalDistrict)` - Calculate impact
- `fetchRacesForGeography(county, district)` - Load races for admin UI
- `getRecentEndorsementChanges(leaderId)` - For undo feature (Phase 2)

### UI Components

#### 1. `components/admin/GeographyFilter.tsx`
- County dropdown (Montgomery, Anne Arundel, Baltimore, etc.)
- District dropdown (auto-populated based on county)
- "Load Races" button
- Disabled state during loading

#### 2. `components/admin/RaceEndorsementCard.tsx`
- Race title, incumbent, vote instruction
- Impact bar ("Affects X users in Y geography")
- Candidate list with radio buttons (single-select) or checkboxes (multi-select)
- Green "ENDORSED" badges for current endorsements
- Orange "PLACEHOLDER" badges for generic candidates
- Confirmation dialogs for all changes
- Warning box if race contains placeholders

#### 3. `app/(tabs)/admin-endorsements.tsx`
- Access control (leaders only)
- Geography filter at top
- Race cards for selected geography
- Loading states
- Empty states with helpful guidance

### Navigation Update

#### `app/(tabs)/_layout.tsx`
- Added conditional "Admin" tab (shield icon)
- Only visible if `profile.leadership_role` is set
- Non-leaders don't see the tab at all

---

## User Flows

### Regular User Flow (No Changes)
1. Open app → See Ballot tab
2. Ballot shows endorsed candidates in green
3. Placeholder candidates show "TBD" badge
4. User takes ballot guide to voting booth
5. Votes for all green-highlighted candidates

### Leader Flow (NEW!)
1. **Login** → See "Admin" tab in navigation
2. **Tap Admin tab** → Geography filter appears
3. **Select geography**: Montgomery County → District 15 → "Load Races"
4. **View all races** (10 races with candidates)
5. **Endorse candidate**: Tap a candidate
6. **Confirmation dialog**: "This will affect 147 users in Montgomery County, District 15. Continue?"
7. **Confirm** → Endorsement updated
8. **Success** → All users in that geography see the new endorsement on their ballots

### Multi-Select Race Example (House of Delegates)
- Race allows "Vote for up to 3"
- Leader can endorse up to 3 candidates
- Checkboxes allow multiple selections
- Exceeding 3 disables remaining candidates
- Confirmation shows all endorsed candidates

---

## Geography Matching Logic

### Federal Races
- **U.S. Representative**: Filtered by `congressional_district` (MD-1, MD-2, ... MD-8)
- **Governor**: Statewide (all Maryland users)

### State Races
- **State Senator**: Filtered by `county` + `legislative_district` (e.g., Montgomery District 15)
- **House of Delegates**: Same as State Senator

### County Races
- **County Executive**: Filtered by `county` only (e.g., all Montgomery County users)
- **County Council**: Same as County Executive

### Local/Judicial/Ballot Questions
- Filtered by `county` + `legislative_district` (most specific geography)

---

## Impact Calculation Examples

**Scenario 1: Governor Race (Statewide)**
- Leader endorses "Republican Candidate A" for Governor
- Impact: "Affects ~5,000 users in Maryland (Statewide)"
- All Maryland users see this endorsement

**Scenario 2: House of Delegates District 15**
- Leader endorses 3 candidates for House of Delegates
- Impact: "Affects ~147 users in Montgomery County, District 15"
- Only users in Montgomery District 15 see this endorsement

**Scenario 3: County Executive**
- Leader endorses candidate for Montgomery County Executive
- Impact: "Affects ~1,200 users in Montgomery County"
- All Montgomery County users (across all districts) see this endorsement

---

## Security Features

### Access Control
- Only users with `leadership_role` set can access admin screen
- Non-leaders see "Access Denied" with lock icon
- Navigation tab only visible to leaders (hidden from regular users)

### Validation
- **Single-select enforcement**: Radio button behavior, only one candidate can be endorsed
- **Multi-select limits**: Can't exceed `max_selections` (e.g., 3 for House of Delegates)
- **Confirmation required**: All changes require explicit confirmation with impact preview
- **Audit trail**: Every change logged with who, what, when, how many affected

### Data Integrity
- Geography scoping prevents cross-contamination (can't accidentally endorse wrong district)
- Placeholder warnings alert leaders when ballot needs updating
- RLS policies prevent non-leaders from modifying endorsements directly in database

---

## SQL Scripts Reference

### Schema Migrations (Run in order)
1. `Scripts/add_max_selections_column.sql` - Add max_selections to races
2. `Scripts/add_is_placeholder_field.sql` - Add is_placeholder to candidates
3. `Scripts/add_leadership_roles.sql` - Add leadership_role and geography to profiles
4. `Scripts/create_endorsement_audit_log.sql` - Create audit log table

### Ballot Data Cleanup (Run in order)
1. `Scripts/cleanup_montgomery_old_data.sql` - Delete old Montgomery data
2. `Scripts/seed_2026_primary_clean.sql` - Seed clean 2026 PRIMARY placeholders (Montgomery + Anne Arundel)

### Manual Step
- Set your user as state leader: `UPDATE profiles SET leadership_role = 'state_leader' WHERE id = 'YOUR_USER_ID';`

---

## Testing Scenarios

### Test 1: Ballot Display (Regular User)
- [ ] Open Ballot tab
- [ ] See correct county in header (Anne Arundel or Montgomery)
- [ ] Races in order: House → Governor → State Senate → Delegates → County → Board of Ed → Judges → Amendment
- [ ] NO "U.S. Senator" race
- [ ] Placeholder candidates show orange "TBD" badge
- [ ] Endorsed candidates have green highlighting and filled ovals
- [ ] Incumbents shown under race titles

### Test 2: Admin Access Control
- [ ] Login as regular user (no leadership_role)
- [ ] "Admin" tab NOT visible in navigation
- [ ] Login as leader (leadership_role set)
- [ ] "Admin" tab IS visible in navigation

### Test 3: Endorsement Workflow (Leader Account)
- [ ] Tap "Admin" tab
- [ ] See geography filter
- [ ] Select "Montgomery" → "District 15" → "Load Races"
- [ ] See 10 races
- [ ] Tap a non-endorsed candidate for Governor race
- [ ] See confirmation dialog with user impact count
- [ ] Confirm change
- [ ] See success message
- [ ] Switch to Ballot tab → new endorsement visible (green highlight)

### Test 4: Multi-Select Race (House of Delegates)
- [ ] In Admin tab, load a geography
- [ ] Find "House of Delegates" race (Vote for up to 3)
- [ ] Endorse first candidate → success
- [ ] Endorse second candidate → success
- [ ] Endorse third candidate → success
- [ ] Try to endorse fourth candidate → should work (can un-endorse one of the first 3)
- [ ] Verify on Ballot tab: see 3 green-highlighted candidates

### Test 5: Cross-Geography Isolation
- [ ] In Admin tab, endorse candidates for Montgomery District 15
- [ ] Switch to Anne Arundel account
- [ ] Check Ballot tab → should NOT see Montgomery District 15 endorsements
- [ ] Should see Anne Arundel District 32 endorsements (separate geography)

---

## Known Limitations & Future Work

### Current Limitations
1. **Placeholder candidates**: All candidates are generic until real candidates file
2. **Manual candidate updates**: Replacing placeholders with real names requires SQL (admin UI in Phase 2)
3. **No undo feature**: Can change endorsements, but no quick undo (audit log exists for manual undo)
4. **State leader only**: Currently only testing with state leader (county/district leaders in Phase 2)
5. **No bulk operations**: Must endorse each race individually (bulk tools in Phase 2)

### Future Enhancements (Phase 2)
1. **Hierarchical permissions**: County leaders can only endorse county races, district leaders only district races
2. **Candidate management**: Add/remove/rename candidates directly in admin UI
3. **Bulk operations**: Copy endorsements between districts, endorse all placeholders as TBD
4. **Undo feature**: Quick undo button for recent changes
5. **Real-time preview**: See ballot changes before saving
6. **Export to PDF**: Print ballot guide for distribution
7. **Import from CSV**: Bulk upload real candidate names when they file

---

## Files Created

### SQL Scripts
- `Scripts/add_max_selections_column.sql`
- `Scripts/add_is_placeholder_field.sql`
- `Scripts/add_leadership_roles.sql`
- `Scripts/create_endorsement_audit_log.sql`
- `Scripts/cleanup_montgomery_old_data.sql`
- `Scripts/seed_2026_primary_clean.sql`

### TypeScript Services
- `lib/supabase/endorsements.ts`

### UI Components
- `components/admin/GeographyFilter.tsx`
- `components/admin/RaceEndorsementCard.tsx`
- `app/(tabs)/admin-endorsements.tsx`

### Documentation
- `DEPLOY_ENDORSEMENT_ADMIN.md` (deployment guide)
- `BALLOT_AND_ENDORSEMENTS_COMPLETE.md` (this file)

### Modified Files
- `lib/supabase/ballot.ts` (added is_placeholder, max_selections to types)
- `lib/supabase.ts` (added leadership_role, geography fields to Profile type)
- `app/(tabs)/_layout.tsx` (added conditional Admin tab)
- `components/OfficialBallotView.tsx` (added placeholder badges, county prop, incumbent display)

---

## Next Steps

1. **Deploy to Supabase**: Run all SQL scripts in order (see `DEPLOY_ENDORSEMENT_ADMIN.md`)
2. **Set yourself as state leader**: Update your profile with `leadership_role = 'state_leader'`
3. **Test the system**: Use the testing checklist above
4. **Update placeholder candidates**: When real 2026 candidates file, replace placeholders with actual names
5. **Appoint local leaders**: Set `leadership_role` for county/district leaders as your team grows

---

## Quick Start Commands

```bash
# 1. Add database columns
# Run: Scripts/add_max_selections_column.sql
# Run: Scripts/add_is_placeholder_field.sql
# Run: Scripts/add_leadership_roles.sql
# Run: Scripts/create_endorsement_audit_log.sql

# 2. Clean old data
# Run: Scripts/cleanup_montgomery_old_data.sql

# 3. Seed 2026 clean data
# Run: Scripts/seed_2026_primary_clean.sql

# 4. Set yourself as leader (replace YOUR_USER_ID)
# UPDATE profiles SET leadership_role = 'state_leader' WHERE id = 'YOUR_USER_ID';

# 5. Restart and test
npx expo start
```

---

## Success Criteria

✅ Ballot shows only 2026 Republican PRIMARY races (no US Senator)  
✅ All candidates are placeholders with "TBD" badges  
✅ Endorsed candidates highlighted in green with filled ovals  
✅ Correct county name in ballot header  
✅ Consistent race ordering across all geographies  
✅ "Admin" tab visible for leaders only  
✅ Leaders can select county/district and load races  
✅ Leaders can endorse/un-endorse candidates  
✅ Confirmation dialog shows impact before changes  
✅ Audit log tracks all endorsement changes  
✅ Changes propagate to all users in affected geography  

---

**Status**: ✅ COMPLETE - Ready for deployment and testing!
