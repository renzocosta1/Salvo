# Endorsement Update Failure - RLS Policy Missing

## Problem

Endorsements appeared to save successfully in the UI, but no data was actually written to the database:
- ✅ Batch update function ran (`Processing 14 changes...`)
- ✅ Function reported success (`Successfully processed all changes`)
- ❌ Database showed 0 endorsements after save
- ❌ Ballots didn't update with endorsements

## Root Cause

**Row Level Security (RLS) policy missing** for UPDATE operations on `md_ballot_candidates` table.

### Existing Policy (Read-Only):
```sql
CREATE POLICY "Ballot candidates are publicly readable"
  ON md_ballot_candidates FOR SELECT
  USING (true);
```

This policy ONLY allows SELECT (reading). There was **no policy for UPDATE**.

### What Happened:
1. User (with `leadership_role = 'state_leader'`) clicked "Save Endorsements"
2. `batchUpdateEndorsements()` function ran
3. Supabase attempted UPDATE query:
   ```sql
   UPDATE md_ballot_candidates
   SET hard_party_endorsed = true
   WHERE id = 'candidate-id';
   ```
4. **RLS silently blocked the update** (no permission)
5. Function didn't detect the failure (error not returned)
6. Function reported "success" despite 0 rows updated
7. User saw success message but data unchanged

## Solution

**Created**: `Scripts/add_endorsement_update_policy.sql`

Adds RLS policy allowing leaders to UPDATE endorsements:

```sql
CREATE POLICY "Leaders can update endorsements"
  ON md_ballot_candidates
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.leadership_role IS NOT NULL
        AND profiles.leadership_role IN ('district_leader', 'county_leader', 'state_leader')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.leadership_role IS NOT NULL
        AND profiles.leadership_role IN ('district_leader', 'county_leader', 'state_leader')
    )
  );
```

### How It Works:
- **USING clause**: Checks if user can update (has leadership_role)
- **WITH CHECK clause**: Validates the update is allowed
- **Roles checked**: `district_leader`, `county_leader`, `state_leader`

## Deployment

### Step 1: Run SQL Script
In Supabase SQL Editor, run:
```sql
-- File: Scripts/add_endorsement_update_policy.sql
```

**Expected Output**: 1 row showing the policy was created

### Step 2: Verify Policy
Check that policy exists:
```sql
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'md_ballot_candidates';
```

**Expected Output**:
```
policyname                          | cmd    | roles
-------------------------------------|--------|------------------
Ballot candidates are publicly readable | SELECT | {public}
Leaders can update endorsements      | UPDATE | {authenticated}
```

### Step 3: Test Endorsement
1. Reload Expo app
2. Go to Admin → Endorsements
3. Select candidates
4. Click "Save X Changes"
5. Check logs for:
   ```
   [batch] Updating candidate xxx to true...
   [batch] Update result: { data: [...], error: null }
   ```
6. Verify endorsements persist in database
7. Check ballot shows ✓ for endorsed candidates

## Additional Improvements

Also added **detailed logging** to `batchUpdateEndorsements()` to catch future issues:

```typescript
// Before each update
console.log(`[batch] Updating candidate ${candidateId} to ${endorsed}...`);

// After each update
console.log(`[batch] Update result:`, { data, error });

// Better error messages
if (error) {
  return {
    success: false,
    error: `RLS Error: ${error.message}. Leaders may need UPDATE permission...`
  };
}
```

This will help diagnose any future RLS or permission issues.

## Testing Checklist

After running the SQL script:
- [ ] Policy shows in `pg_policies` table
- [ ] Endorsement updates succeed (check logs)
- [ ] Data persists in `md_ballot_candidates` table
- [ ] Ballots show endorsements with ✓ checkmarks
- [ ] Admin panel shows correct endorsement counts
- [ ] Success message displays correct user count
- [ ] Audit log entries created for each change

## Related Files

- `Scripts/add_endorsement_update_policy.sql` - RLS policy fix
- `lib/supabase/endorsements.ts` - Batch update function with logging
- `READY_TO_TEST_ENDORSEMENTS.md` - Testing instructions (updated)
- `ENDORSEMENT_SYSTEM_IMPROVED.md` - Full UX redesign docs
- `docs/migrations/005_alpha_schema.sql` - Original schema with RLS

## Lessons Learned

1. **Always check RLS policies** when adding UPDATE/INSERT/DELETE operations
2. **Supabase doesn't always return errors** for RLS violations
3. **Add `.select()` to updates** to verify rows were actually modified
4. **Log database results** to catch silent failures
5. **Test with actual database constraints** before claiming "success"

## Future Prevention

Consider adding to development checklist:
- [ ] Check existing RLS policies before new data mutations
- [ ] Test UPDATE/INSERT/DELETE with non-admin users
- [ ] Verify `.select()` returns expected number of rows
- [ ] Add logging for all database mutations
- [ ] Document required permissions for each operation
