# Endorsement System UX Improvements

## Problem

The original endorsement system had poor UX:
- ❌ Each candidate selection triggered an immediate confirmation dialog
- ❌ Page reloaded and scrolled to top after each save
- ❌ Hard to endorse multiple candidates in multi-select races
- ❌ No visual feedback of pending changes
- ❌ Ballots didn't update immediately after endorsements

## Solution: Batch Selection Mode

### 1. **Batch Selection UI**

**Before**: Click → Confirm → Save → Reload → Scroll to top (repeat for each candidate)

**After**: Select multiple → Review changes → Confirm once → Save all → Stay in place

#### Key Changes:
- ✅ Click candidates to toggle selection (no immediate save)
- ✅ Visual feedback with orange "PENDING" badges
- ✅ Scroll position maintained
- ✅ Single confirmation dialog at the end
- ✅ Batch save in one transaction

### 2. **Visual Feedback**

#### Candidate Row States:
- **Green border + "ENDORSED"** badge: Currently endorsed (saved in database)
- **Orange border + "PENDING"** badge: Pending endorsement (not yet saved)
- **Orange border + "TO REMOVE"** badge: Pending removal (will be un-endorsed)
- **Gray/disabled**: Cannot select (max selections reached for multi-select)

#### Endorsement Counter:
- Shows "X/Y Endorsed" (combining database + pending changes)
- Updates live as you select/deselect candidates

### 3. **Floating Action Button**

Appears at bottom when you have pending changes:

```
┌─────────────────────────────────┐
│  Cancel  │  Save X Change(s)   │
└─────────────────────────────────┘
```

- **Cancel**: Discards all pending changes (with confirmation)
- **Save**: Shows summary and saves all changes in batch

### 4. **Save Confirmation Dialog**

Shows comprehensive summary before saving:

```
Save Endorsements?

You are about to:
✓ Endorse 3 candidate(s)
✗ Un-endorse 1 candidate(s)

This will affect 22 users in Anne Arundel County, District 32.

Changes will apply immediately to all ballots.

[Cancel]  [Save All Changes]
```

### 5. **Batch Update Logic**

**Single-Select Races (President, US Senate)**:
1. Clear all endorsements in the race
2. Set the one selected candidate as endorsed
3. Log one audit entry

**Multi-Select Races (Circuit Judges, Board of Ed)**:
1. Update each candidate individually
2. Log separate audit entries for each

**Performance**:
- All updates in single transaction
- No multiple page reloads
- Immediate ballot updates for all affected users

## Implementation Details

### Files Modified

1. **`app/(tabs)/admin-endorsements.tsx`**
   - Added `pendingChanges` Map to track selections
   - Added `handleToggleSelection()` for immediate feedback
   - Added `handleSaveAllChanges()` for batch processing
   - Added floating action button UI
   - Added instruction banner

2. **`components/admin/RaceEndorsementCard.tsx`**
   - Updated to use `pendingChanges` for visual state
   - Removed Alert.confirm on each click
   - Added `getEffectiveEndorsement()` helper
   - Added pending/removed visual indicators
   - Added orange border for pending changes

3. **`lib/supabase/endorsements.ts`**
   - Added `batchUpdateEndorsements()` function
   - Handles single-select vs multi-select logic
   - Logs audit entries for all changes
   - Returns success/error for user feedback

### Key Concepts

**Optimistic UI Updates**:
- Selections update UI immediately
- No database calls until "Save" is clicked
- Pending changes stored in React state Map

**Effective Endorsement State**:
```typescript
const getEffectiveEndorsement = (candidate) => {
  // Check pending changes first
  const pending = pendingChanges.get(candidate.id);
  if (pending !== undefined) {
    return pending.endorsed;
  }
  // Fall back to database state
  return candidate.hard_party_endorsed;
};
```

**Single-Select Auto-Deselect**:
```typescript
// When selecting in single-select race,
// automatically un-select all others
if (isSingleSelect && newEndorsed) {
  race.candidates.forEach((c) => {
    if (c.id !== candidate.id && isEndorsed(c)) {
      onToggleSelection(c.id, false, ...);
    }
  });
}
```

## Testing Checklist

### Single-Select Races (President, US Senate)
- ✅ Can only select one candidate at a time
- ✅ Selecting another automatically deselects the first
- ✅ Pending state shows orange border + "PENDING" badge
- ✅ Save button shows "Save 1 Change"
- ✅ After save, only selected candidate is endorsed

### Multi-Select Races (Judges, Board of Ed)
- ✅ Can select up to max_selections candidates
- ✅ Checkbox UI appears (not radio)
- ✅ Can toggle multiple candidates before saving
- ✅ Disabled state when max selections reached
- ✅ Save button shows "Save X Changes"
- ✅ After save, all selected candidates are endorsed

### UX Flow
- ✅ Click candidates to toggle selection
- ✅ Scroll position maintained while selecting
- ✅ Pending changes badge visible
- ✅ Floating button appears when changes exist
- ✅ Cancel button discards all changes (with confirm)
- ✅ Save shows comprehensive confirmation dialog
- ✅ Success message shows affected user count
- ✅ Ballots update immediately for all users

### Error Handling
- ✅ Database errors shown in alert
- ✅ Partial failures handled gracefully
- ✅ Audit log failures don't block save
- ✅ Loading states prevent double-saves

## Future Enhancements

### Phase 2 (Not Yet Implemented)
- [ ] Keyboard shortcuts (Space to toggle, Enter to save)
- [ ] Bulk operations (Select all, Clear all)
- [ ] Preview affected ballots before saving
- [ ] Undo last batch of changes
- [ ] Export endorsement decisions to CSV
- [ ] Compare endorsements between districts

### Phase 3 (Not Yet Implemented)
- [ ] Real-time collaboration (see other leaders' changes)
- [ ] Endorsement proposals (require approval)
- [ ] Conditional endorsements (based on district sub-regions)
- [ ] Historical endorsement tracking/analytics

## Related Documentation

- `DEPLOY_2024_BALLOT_TESTING.md` - Ballot testing setup
- `DATA_ACCURACY_NOTES.md` - 2024 candidate data verification
- `FIXES_2024_POLYMARKET.md` - Polymarket integration fixes
