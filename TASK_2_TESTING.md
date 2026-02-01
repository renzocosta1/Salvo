# Task #2: Testing Checklist

## Pre-Testing Setup

### 1. Apply Database Migration
- [ ] Open Supabase Dashboard
- [ ] Go to SQL Editor
- [ ] Run `Scripts/apply_task2_migration.sql`
- [ ] Verify "Migration applied successfully!" message
- [ ] Confirm trigger exists: Check that `handle_new_user()` function is listed

### 2. Enable Email Authentication
- [ ] Go to Authentication → Providers in Supabase
- [ ] Enable Email provider
- [ ] Disable "Confirm Email" for testing (can re-enable later)
  - Settings → Auth → Email Auth → Uncheck "Enable email confirmations"
- [ ] Set Site URL to `http://localhost` or your dev URL

### 3. Start the Development Server
```bash
npm start
# or
npx expo start
```

## Test Cases

### ✅ Test 1: Initial App Launch (Unauthenticated)
**Expected**: Login screen appears

- [ ] Launch the app
- [ ] Verify login screen appears with:
  - "SALVO" title
  - "THE GATES" subtitle
  - Email input field
  - Password input field
  - "Sign In" button
  - "Sign Up" link at bottom

### ✅ Test 2: Navigation to Signup
**Expected**: Signup screen appears

- [ ] Click "Sign Up" link on login screen
- [ ] Verify signup screen appears with:
  - "JOIN SALVO" title
  - "RECRUIT REGISTRATION" subtitle
  - Display Name field (optional)
  - Email field
  - Password field
  - Confirm Password field
  - "Create Account" button
  - "Sign In" link at bottom

### ✅ Test 3: Form Validation (Signup)
**Expected**: Validation errors appear

- [ ] Leave all fields empty, click "Create Account"
- [ ] Verify email error: "Email is required"
- [ ] Verify password error: "Password is required"

- [ ] Enter invalid email (e.g., "test"), click "Create Account"
- [ ] Verify email error: "Email is invalid"

- [ ] Enter valid email, password "123", confirm "456"
- [ ] Verify password error: "Password must be at least 6 characters"
- [ ] Verify confirm error: "Passwords do not match"

### ✅ Test 4: Successful Signup
**Expected**: Account created, redirected to login or directly logged in

- [ ] Enter valid details:
  - Display Name: "Test Warrior"
  - Email: "test@example.com"
  - Password: "password123"
  - Confirm: "password123"
- [ ] Click "Create Account"
- [ ] If email confirmation is disabled: automatically logged in and see Oath screen
- [ ] If email confirmation is enabled: see success message, check email, verify, then log in

### ✅ Test 5: Profile Auto-Creation
**Expected**: Profile created automatically in database

- [ ] After signup, open Supabase Dashboard
- [ ] Go to Table Editor → profiles
- [ ] Find the newly created profile
- [ ] Verify:
  - `id` matches the user's auth UID
  - `display_name` = "Test Warrior" (or email prefix if left blank)
  - `role` = "warrior"
  - `level` = 0
  - `xp` = 0
  - `oath_signed_at` = NULL
  - `contract_version_id` = NULL
  - `party_id` = NULL

### ✅ Test 6: Oath Screen Appears (Blocking)
**Expected**: Full-screen oath overlay, cannot proceed without scrolling

- [ ] After logging in, verify Oath screen appears immediately
- [ ] Verify screen shows:
  - "THE GATES" title
  - "READ THE OATH TO PROCEED" subtitle
  - Scrollable contract text
  - Progress bar showing 0%
  - "JOIN THE HARD PARTY" button (DISABLED/greyed out)
  - Message: "You must scroll to the bottom to sign the oath"

- [ ] Try clicking the JOIN button
- [ ] Verify button does nothing (disabled state)

### ✅ Test 7: Scroll Detection
**Expected**: Progress bar updates, button enables at bottom

- [ ] Slowly scroll down through the Oath text
- [ ] Verify progress bar fills up as you scroll
- [ ] Verify percentage updates (e.g., 25%, 50%, 75%)
- [ ] Continue scrolling to the very bottom
- [ ] Verify progress bar reaches 100%
- [ ] Verify "JOIN THE HARD PARTY" button turns green and becomes clickable
- [ ] Verify the warning message disappears

### ✅ Test 8: Signing the Oath
**Expected**: Profile updated, redirected to main app

- [ ] Click "JOIN THE HARD PARTY" button
- [ ] Verify button shows loading spinner
- [ ] After a moment, should be redirected to the main app (tabs)

### ✅ Test 9: Profile Updated After Oath
**Expected**: Database reflects oath signature

- [ ] Open Supabase Dashboard → Table Editor → profiles
- [ ] Find your test user's profile
- [ ] Verify:
  - `oath_signed_at` = timestamp (e.g., "2026-01-30T12:34:56.789Z")
  - `contract_version_id` = UUID (should match the v1 contract)
  - `party_id` = UUID of "Hard Party"
  - `role` = "warrior"
  - `level` = 0

### ✅ Test 10: Returning User (Oath Already Signed)
**Expected**: Goes directly to main app

- [ ] Log out (manually delete session or restart app and log in again)
- [ ] Log in with the same credentials
- [ ] Verify: directly goes to main app (tabs)
- [ ] Verify: Oath screen does NOT appear

### ✅ Test 11: Login Validation
**Expected**: Error handling works

- [ ] Log out
- [ ] Try logging in with incorrect password
- [ ] Verify error alert: "Login Failed" with appropriate message
- [ ] Try logging in with non-existent email
- [ ] Verify error alert appears

### ✅ Test 12: Auth State Persistence
**Expected**: Session persists across app restarts

- [ ] Log in successfully
- [ ] Close the app completely
- [ ] Reopen the app
- [ ] Verify: automatically logged in, goes to main app (no login screen)

## Edge Cases

### Test 13: Contract Version Check
**Scenario**: What if contract version changes?

- [ ] Update contract_versions table with a new version:
```sql
INSERT INTO contract_versions (version_tag, body_text)
VALUES ('v2', 'Updated Oath text here...');
```
- [ ] Expected: Next time user logs in, should see Oath screen again
- [ ] (This test is optional for now, can defer to later)

### Test 14: Hard Party Not Found
**Scenario**: What if Hard Party doesn't exist?

- [ ] Temporarily delete Hard Party from parties table
- [ ] Try signing the Oath
- [ ] Expected: Should see error alert "Failed to join party"
- [ ] Re-add Hard Party and try again

### Test 15: Network Error Handling
**Scenario**: What if Supabase is unreachable?

- [ ] Disconnect from internet
- [ ] Try logging in
- [ ] Expected: Should see appropriate error message
- [ ] Reconnect and verify app recovers

## Visual QA

### Tactical UI Theme Verification
- [ ] Background color is dark (#0A0A0A or close)
- [ ] Text is white/high contrast
- [ ] Accent color is Hard Party Green (#00FF41)
- [ ] Buttons have tactical/military aesthetic
- [ ] Inputs have proper borders and focus states
- [ ] Typography is bold and uppercase for titles
- [ ] Progress bar is visible and accurate
- [ ] Loading spinners use green color

### Responsiveness
- [ ] Test on different screen sizes (phone, tablet)
- [ ] Verify keyboard doesn't obscure input fields
- [ ] Verify ScrollView in Oath screen scrolls smoothly
- [ ] Verify touch targets are large enough for buttons

## Performance

- [ ] App loads quickly (<2s to login screen)
- [ ] No lag when typing in input fields
- [ ] Scroll in Oath screen is smooth (no jank)
- [ ] Button press has immediate feedback
- [ ] Profile fetch after login is fast (<1s)

## Status

Once all tests pass:
- [ ] Mark Task #2 as **COMPLETE**
- [ ] Update tasks.json status to "done"
- [ ] Commit changes to git
- [ ] Proceed to Task #3: Command Feed

## Notes

Add any issues or observations here:
- 
- 
- 
