# Task #4 - Subtask #2: Configure RLS Rate Limiting ✅

**Date**: February 1, 2026  
**Status**: ✅ **COMPLETE** (Pending SQL script execution)

---

## 📋 Subtask Details

**Title**: Configure RLS Rate Limiting for Salvos  
**Description**: Implement Row Level Security (RLS) on the salvos table to enforce rate limits on the server side.  
**Dependencies**: Subtask #1 ✅  
**Test Strategy**: Spam the Raid button to test rate limiting. Verify that the database rejects the 11th salvo within 60 seconds.

---

## ✅ Implementation

### 1. Database Insertion Function
**File**: `lib/supabase/directives.ts`

```typescript
export async function insertSalvo(
  userId: string,
  directiveId: string
): Promise<{ success: boolean; error: Error | null }>
```

**Features**:
- ✅ Inserts salvo to `salvos` table
- ✅ Captures user_id and directive_id
- ✅ Automatic timestamp (created_at)
- ✅ Error handling for rate limits
- ✅ Error handling for network issues
- ✅ Returns success/error status

**Error Detection**:
- Rate limit errors (code `42501` or message contains "rate limit")
- Network errors
- Database errors

---

### 2. RLS Policy SQL Script
**File**: `Scripts/rls_salvos_rate_limit.sql`

**Policy #1: INSERT with Rate Limiting**
```sql
CREATE POLICY "Enable insert for authenticated users with rate limit"
ON salvos
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND
  (
    SELECT COUNT(*)
    FROM salvos
    WHERE user_id = auth.uid()
      AND directive_id = salvos.directive_id
      AND created_at > NOW() - INTERVAL '60 seconds'
  ) < 10
);
```

**How It Works**:
1. Checks if user is authenticated (`auth.uid() = user_id`)
2. Counts salvos by this user for this directive in last 60 seconds
3. Only allows INSERT if count < 10
4. Rejects with error if count >= 10

**Policy #2: SELECT Access**
```sql
CREATE POLICY "Enable read access for all authenticated users"
ON salvos
FOR SELECT
TO authenticated
USING (true);
```

Allows all authenticated users to read salvos (for counting/leaderboards).

---

### 3. Updated Directive Detail Screen
**File**: `app/directive/[id].tsx`

**Changes**:
- ✅ Imported `insertSalvo` function
- ✅ Imported `useAuth` hook to get user ID
- ✅ Made `handleRaid` async
- ✅ Replaced mock alert with real database insertion
- ✅ Optimistic UI update (increments count immediately)
- ✅ Success alert: "⚔️ Salvo recorded!"
- ✅ Error alert: Shows rate limit or network error
- ✅ Console logs for debugging

**User Flow**:
1. User taps RAID button
2. Button shows "RAIDING..." (debounced 500ms)
3. `insertSalvo` called with user_id + directive_id
4. If success:
   - Local count increments (+1)
   - Alert: "RAID SUCCESSFUL - Salvo recorded!"
   - Pillage Meter updates
5. If rate limit:
   - Alert: "RAID FAILED - Rate limit exceeded. You can only raid 10 times per minute."
6. If network error:
   - Alert: "ERROR - Network error. Check your connection."

---

## 🧪 Testing Instructions

### Step 1: Run the SQL Script in Supabase

**Before testing the app**, you must run the RLS policy script:

1. Open **Supabase Dashboard** → **SQL Editor**
2. Open the file: `Scripts/rls_salvos_rate_limit.sql`
3. Copy the entire script
4. Paste into SQL Editor
5. Click **Run**
6. Expected output: "Success. X commands completed."

**Verify Policies**:
```sql
SELECT * FROM pg_policies WHERE tablename = 'salvos';
```

You should see 2 policies:
- "Enable insert for authenticated users with rate limit"
- "Enable read access for all authenticated users"

---

### Step 2: Test in the App

**Test 1: Normal Raid**
1. Open the app, navigate to a directive
2. Tap RAID button once
3. Wait 1 second
4. **Expected**: Alert "RAID SUCCESSFUL - Salvo recorded!"
5. **Check**: Progress increments (e.g., 125 → 126)

**Test 2: Rate Limit (Spam)**
1. Tap RAID button **10 times rapidly** (as fast as possible)
2. Wait for alerts
3. **Expected**:
   - First 10 raids: Success alerts
   - 11th raid: "RAID FAILED - Rate limit exceeded"
4. **Check terminal logs**: Should show "Failed: Rate limit exceeded"

**Test 3: Wait and Retry**
1. After hitting rate limit, **wait 60 seconds**
2. Tap RAID button again
3. **Expected**: Success! (Rate limit window expired)

**Test 4: Multiple Directives**
1. Rate limits are **per directive**
2. If you hit the limit on "RAID THE CITADEL"
3. You can still raid other directives

---

## 📊 Expected Behavior

### Success Case
```
[RAID] Button tapped - inserting to database...
[RAID] Salvo inserted successfully!
Alert: "RAID SUCCESSFUL - ⚔️ Salvo recorded! The Pillage Meter will update momentarily."
Progress: 125 → 126
```

### Rate Limit Case
```
[RAID] Button tapped - inserting to database...
[RAID] Failed: Rate limit exceeded. You can only raid 10 times per minute.
Alert: "RAID FAILED - Rate limit exceeded. You can only raid 10 times per minute."
Progress: No change
```

### Network Error Case
```
[RAID] Button tapped - inserting to database...
[RAID] Unexpected error: Network request failed
Alert: "ERROR - Network error. Check your connection and try again."
Progress: No change
```

---

## 🔍 Database Verification

**Check Salvos Count**:
```sql
SELECT 
  directive_id,
  user_id,
  COUNT(*) as salvo_count,
  MAX(created_at) as last_raid
FROM salvos
WHERE user_id = 'YOUR_USER_ID'
GROUP BY directive_id, user_id;
```

**Check Recent Salvos (Last Minute)**:
```sql
SELECT *
FROM salvos
WHERE user_id = 'YOUR_USER_ID'
  AND created_at > NOW() - INTERVAL '60 seconds'
ORDER BY created_at DESC;
```

---

## 🎨 UI Updates

### Success State
- **Alert Title**: "RAID SUCCESSFUL"
- **Alert Message**: "⚔️ Salvo recorded! The Pillage Meter will update momentarily."
- **Button**: Returns to "RAID" after 1 second
- **Progress**: Increments immediately (optimistic update)

### Error State
- **Alert Title**: "RAID FAILED" or "ERROR"
- **Alert Message**: Specific error (rate limit, network, etc.)
- **Button**: Returns to "RAID" immediately
- **Progress**: No change

---

## 🚀 What's Next: Subtask #3

**"Setup Supabase Realtime Subscription"**

**Goal**: Subscribe to salvo INSERT events to update the Pillage Meter in real-time

**Features**:
- Real-time updates when ANY user raids
- Auto-increment progress without refresh
- Multi-device sync (see others' raids instantly)
- Visual feedback (meter animates up)

**Dependencies**: None (can run in parallel with Subtask #2) ✅

---

## ✅ Subtask #2 Status: READY FOR TESTING

**Before Testing**:
1. ⚠️ **Run the SQL script** in Supabase SQL Editor first!
2. Verify RLS policies are created

**Then**:
1. Reload the app
2. Navigate to a directive
3. Tap RAID button 10 times rapidly
4. 11th tap should fail with rate limit error

**Let me know the results!** 🚀
