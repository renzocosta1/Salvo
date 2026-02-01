# Task #7: Ranks, XP, and Call of Duty-style Profile UI

**Status:** 🚧 In Progress  
**Date Started:** February 1, 2026

---

## What We're Building

A **Call of Duty-style Profile screen** with tactical UI showing:

1. ✅ **Rank Badge** - Visual rank display (Recruit, Warrior, Centurion)
2. ✅ **Level & XP** - Current level and total XP earned
3. ✅ **XP Progress Bar** - Progress to next level
4. ✅ **Compare Stats** - Look up other users by ID
5. ⏳ **Victory Screen** - Animation when missions are verified (Coming next)

---

## Completed Features

### 1. Rank Display
- **Colors:**
  - Centurion: Gold (#ffd700)
  - Warrior: Hard Party Green (#00ff88)
  - Recruit: Gray (#a0a0a0)
- **Shows:** Rank name and level range

### 2. Level & XP System
- **Large Level Number** - Prominent display
- **Total XP** - All-time XP earned
- **Progress Bar** - Visual progress to next level
- **XP Formula:** `next_level_xp = (level + 1)² × 100`

### 3. Compare Stats Feature
- Input field for user ID
- Lookup button
- Displays other user's:
  - Display name
  - Level
  - XP
  - Rank

### 4. UI Design
- High-contrast tactical colors
- Dark background (#0a0a0a)
- Hard Party Green accents (#00ff88)
- Monospace font for headers
- Bold, large numbers for key stats

---

## How to Test

### Test Your Profile

1. Open Expo app
2. Tap **"Profile"** tab (user icon)
3. Should see:
   - Your rank badge (Recruit if Level 0-4)
   - Your current level and XP
   - Progress bar to next level
   - Compare Stats section

### Test Compare Stats

1. In the Profile tab, scroll to **"Compare Stats"**
2. Enter your own user ID (from Supabase profiles table)
3. Tap **"LOOKUP"**
4. Should see your stats appear

### Test Rank Colors

**To test different ranks:**

Go to **Supabase Dashboard** → **SQL Editor** → Run:

```sql
-- Set yourself to Warrior (Level 5)
UPDATE profiles
SET xp = 2500, level = 5
WHERE id = 'YOUR_USER_ID';

-- Recompute rank
SELECT recompute_user_rank('YOUR_USER_ID');
```

Refresh the Profile tab - rank should now be **green (Warrior)**

```sql
-- Set yourself to Centurion (Level 10)
UPDATE profiles
SET xp = 10000, level = 10
WHERE id = 'YOUR_USER_ID';

SELECT recompute_user_rank('YOUR_USER_ID');
```

Rank should now be **gold (Centurion)**

---

## Coming Next

### Victory Screen Animation
When a mission is verified, show:
- 🎉 Animated "+100 XP" popup
- 📊 XP bar filling animation
- 🎖️ "RANK UP!" animation (if leveled up)
- ✨ Particle effects / glow
- 🔊 Sound effects (optional)

**Using:** `react-native-reanimated` for smooth 60fps animations

---

## Files Modified

- `app/(tabs)/two.tsx` - Profile screen UI

---

## XP & Leveling Reference

**Formula:** `level = floor(sqrt(xp / 100))`

| Level | XP Required | Rank      |
|-------|-------------|-----------|
| 0     | 0           | Recruit   |
| 1     | 100         | Recruit   |
| 2     | 400         | Recruit   |
| 3     | 900         | Recruit   |
| 4     | 1,600       | Recruit   |
| 5     | 2,500       | Warrior   |
| 6     | 3,600       | Warrior   |
| 7     | 4,900       | Warrior   |
| 8     | 6,400       | Warrior   |
| 9     | 8,100       | Warrior   |
| 10    | 10,000      | Centurion |

---

**Next:** Implement Victory Screen animation with Reanimated! 🎬
