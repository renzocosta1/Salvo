# Task #5 Debug Summary - Mission Not Found Issue

## Date: February 1, 2026

## Problem
When attempting to access the mission detail screen (`/mission/[id]`), the app displayed:
- Error: "MISSION NOT FOUND"
- Supabase error: "Cannot coerce the result to a single JSON object" (PGRST116)
- Error details: "The result contains 0 rows"

## Root Cause Analysis

### Investigation Process
1. **Initial Hypothesis**: Missing RLS policies on `missions` table
   - Created `Scripts/fix_missions_rls.sql` to add RLS policies
   - Result: Policies were added successfully but issue persisted

2. **Second Hypothesis**: Stale authentication session
   - User signed out and back in to refresh JWT token
   - Result: Issue persisted

3. **Final Discovery**: Mission record never actually existed in database
   - The original `Scripts/insert_test_mission.sql` script used a subquery that failed silently
   - When queried directly via SQL Editor, mission table was empty
   - Error code PGRST116 confirmed 0 rows returned

### The Actual Root Cause
**The mission was never inserted into the database**. The original insert script:

```sql
INSERT INTO missions (
  party_id,
  ...
) VALUES (
  (SELECT id FROM parties WHERE name = 'Hard Party' LIMIT 1),
  ...
);
```

This subquery approach failed silently if:
- The party name didn't match exactly
- There were multiple parties with similar names
- The query ran before parties were seeded

## The Fix

### Solution: Force Insert with Explicit IDs
Created `Scripts/force_insert_test_mission.sql` that:

1. **Lists all parties** to verify correct party_id
2. **Deletes any existing test missions** to avoid conflicts
3. **Uses explicit UUIDs** instead of subqueries:
   ```sql
   INSERT INTO missions (
     id,
     party_id,
     ...
   ) VALUES (
     '4b4df90a-c0d5-4d7e-aaec-2e92204eff8f'::uuid,  -- Explicit mission ID
     '74df6a5a-0abe-40ab-b70b-03a28722485e'::uuid,  -- Explicit party ID
     ...
   )
   ```
4. **Includes ON CONFLICT clause** for idempotency
5. **Verifies insertion** with SELECT query

### Supporting Script: RLS Policy Setup
`Scripts/fix_missions_rls.sql` ensures proper Row-Level Security policies:

```sql
-- Allow all authenticated users to view missions
CREATE POLICY "missions_select" ON missions 
FOR SELECT TO authenticated USING (true);

-- Allow users to manage their own mission records
CREATE POLICY "user_missions_select_own" ON user_missions 
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "user_missions_insert_own" ON user_missions 
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_missions_update_own" ON user_missions 
FOR UPDATE TO authenticated USING (auth.uid() = user_id);
```

## Files Modified

### Scripts Created
1. **`Scripts/fix_missions_rls.sql`** - RLS policy setup for missions and user_missions
2. **`Scripts/force_insert_test_mission.sql`** - Reliable mission insertion with explicit IDs
3. **`Scripts/verify_rls_status.sql`** - Debugging script to check RLS configuration

### Code Files (Debug Only - No Functional Changes)
- `lib/supabase/missions.ts` - Temporarily added debug logs (now removed)
- `app/mission/[id].tsx` - Temporarily added debug logs (now removed)

## Verification

After applying the fix:
1. ✅ Mission exists in database (`SELECT COUNT(*) FROM missions` returns 1)
2. ✅ RLS policies allow authenticated users to view missions
3. ✅ App successfully loads mission detail screen
4. ✅ Mission data displays correctly (title, description, XP reward)

## Lessons Learned

### Best Practices for SQL Scripts
1. **Always verify data existence** before using subqueries
2. **Use explicit IDs** for critical test data
3. **Include verification queries** at the end of insert scripts
4. **Use ON CONFLICT** clauses for idempotent scripts
5. **Test scripts in isolation** before running in production

### Debugging Approach
1. **Use runtime evidence** over assumptions
2. **Instrument at multiple levels** (UI, data layer, database)
3. **Verify authentication state** when dealing with RLS
4. **Check both RLS policies AND actual data existence**
5. **Test queries directly in SQL Editor** to isolate app vs. database issues

## Testing Checklist

After fix applied:
- [x] Mission displays in mission detail screen
- [x] Mission title, description, and XP reward are correct
- [x] RLS policies allow authenticated access
- [x] No console errors
- [ ] START MISSION button works (next test)
- [ ] Camera/gallery picker works (next test)
- [ ] Image upload to Storage works (next test)
- [ ] Status update to 'submitted' works (next test)

## Next Steps

Continue with Task #5 testing:
1. Test mission start flow
2. Test image picker (camera + gallery)
3. Test image upload to Supabase Storage
4. Test proof submission workflow
5. Verify `user_missions` record creation and updates

---

**Status**: ✅ ISSUE RESOLVED
**Impact**: Task #5 can now proceed with full testing
