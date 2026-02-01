# Task #3 Visual Bug - Investigation Notes

**Date**: January 31, 2026  
**Status**: Committed to GitHub, continue on Mac  
**Commit**: `d6a61c0` - "feat: Task #3 Command Feed implementation (WIP - visual bug)"

---

## 🐛 The Bug

**Symptom**: DirectiveCard components not rendering visually on Command Feed screen (iOS)

**What Works**:
- ✅ Data fetching from Supabase (confirmed in logs)
- ✅ Real-time subscriptions working
- ✅ FlatList rendering (logs show `[FlatList] Rendering item: RAID THE CITADEL`)
- ✅ DirectiveCard component executing (logs show correct data)
- ✅ Header visible ("COMMAND FEED", "SIGN OUT", "WARRIOR • LEVEL 0", "LIVE")

**What Doesn't Work**:
- ❌ DirectiveCard visual rendering (black screen below header)
- ❌ No red debug borders visible (added 3px red border for testing)
- ❌ No text content visible from cards

---

## 📊 Terminal Logs (Working)

```
LOG  [useDirectives] Directives fetched successfully: 2 items
LOG  [CommandFeed] State: { directivesCount: 2, hasProfile: true, loading: false }
LOG  [DirectiveCard] Rendering: { 
  title: 'RAID THE CITADEL', 
  currentSalvos: 125, 
  targetGoal: 500, 
  progress: '25.0' 
}
```

---

## 🔍 Investigation Steps Taken

1. ✅ Verified data fetch from Supabase
2. ✅ Added inline color styles (replacing Tailwind classes)
3. ✅ Switched from FlashList to FlatList
4. ✅ Added debug red border (3px, #ff4444) to cards
5. ✅ Added minHeight: 150 to cards
6. ✅ Added comprehensive logging throughout
7. ❌ Cards still not visible despite all fixes

---

## 🎯 Next Steps (Mac Investigation)

### 1. Check iOS Simulator Rendering
- Open app on Mac iOS simulator
- Check if issue is Windows-specific or cross-platform

### 2. Try Simplified DirectiveCard
```tsx
// Minimal test component
export function DirectiveCard({ directive }) {
  return (
    <View style={{ 
      backgroundColor: 'red', 
      height: 200, 
      margin: 20,
      padding: 20 
    }}>
      <Text style={{ color: 'white', fontSize: 24 }}>
        TEST CARD
      </Text>
    </View>
  );
}
```

### 3. Check SafeAreaView Layout
- Possible issue with `SafeAreaView` clipping content
- Try removing `edges={['top']}` or switching to regular `View`

### 4. Check FlatList ContentContainer
- Remove `contentContainerStyle`
- Add `ListHeaderComponent` for testing
- Check if `flex: 1` on FlatList is causing layout collapse

### 5. Inspect Element (React Native Debugger)
- Use React Native Debugger to inspect component tree
- Check if cards exist in hierarchy but are positioned off-screen
- Verify actual computed styles

---

## 📁 Key Files

**Components**:
- `app/(tabs)/index.tsx` - Command Feed screen (using FlatList)
- `components/feed/DirectiveCard.tsx` - Directive card component (with debug red border)
- `components/feed/EmptyFeed.tsx` - Empty state component

**Data Layer**:
- `hooks/useDirectives.ts` - Directive fetching hook with real-time updates
- `lib/supabase/directives.ts` - Supabase queries for directives
- `lib/supabase/types.ts` - TypeScript types

**Database**:
- `Scripts/insert_test_directive_legendary.sql` - Test data script

---

## 🧪 Test Data

**Directive in Database**:
- **Title**: RAID THE CITADEL
- **Description**: "Secure the perimeter and deploy the main salvo battery. Citizen-led operation."
- **Progress**: 125 / 500 salvos (25%)
- **Party**: Hard Party
- **Expected Color**: Orange accent (#ff6b35) at 25% progress

Run the SQL script in Supabase if data is missing:
```bash
# In Supabase SQL Editor, run:
Scripts/insert_test_directive_legendary.sql
```

---

## 🎨 Expected Visual Design

**DirectiveCard** (when working):
```
┌─────────────────────────────────────────┐
│ ○ 1H AGO                                │ (gray text)
│                                         │
│ RAID THE CITADEL                        │ (bold white, 20px)
│                                         │
│ Secure the perimeter and deploy the     │ (gray, 14px)
│ main salvo battery. Citizen-led...      │
│                                         │
│ PILLAGE METER          125 / 500        │ (gray label, white numbers)
│ ██████░░░░░░░░░░░░░░░░░░  25.0%        │ (orange bar)
└─────────────────────────────────────────┘
Card: Dark bg (#1a1a1a), gray border
```

---

## 💡 Potential Issues to Check

1. **Tailwind Config Not Loading**: Some inline styles used, but check `tailwind.config.js`
2. **SafeAreaView Layout Collapse**: Try switching to regular `View`
3. **FlatList Estimated Size**: Currently removed `estimatedItemSize`
4. **iOS-Specific Layout Bug**: Might work on Android/Mac but not Windows iOS sim
5. **NativeWind Conflict**: Inline styles might conflict with className
6. **Pressable Transform**: Check if `transform` style is causing positioning issues

---

## 📱 How to Test on Mac

```bash
# 1. Pull latest from GitHub
git pull origin main

# 2. Install dependencies (if needed)
npm install

# 3. Start Expo
npx expo start

# 4. Open iOS Simulator
# Press 'i' in terminal

# 5. Check terminal logs
# Look for [DirectiveCard] and [FlatList] logs

# 6. Try pull-to-refresh on Command Feed
# Swipe down to trigger refresh
```

---

## 🔧 Quick Fix Attempts

If the issue persists on Mac:

### Attempt 1: Remove All Styling
```tsx
// DirectiveCard.tsx - minimal version
return (
  <View style={{ backgroundColor: 'red', height: 200, margin: 20 }}>
    <Text style={{ color: 'white', fontSize: 24 }}>
      {directive.title}
    </Text>
  </View>
);
```

### Attempt 2: Replace FlatList with ScrollView
```tsx
// index.tsx
<ScrollView style={{ flex: 1 }}>
  {directives.map(d => <DirectiveCard key={d.id} directive={d} />)}
</ScrollView>
```

### Attempt 3: Remove SafeAreaView
```tsx
// index.tsx - replace SafeAreaView with View
<View className="flex-1 bg-tactical-bg">
  {/* ... */}
</View>
```

---

## ✅ What's Complete (Task #3)

- ✅ Directive fetching from Supabase
- ✅ Real-time salvo subscriptions
- ✅ Pull-to-refresh
- ✅ Empty state ("No Active Directives")
- ✅ Party-wide and band-specific filtering
- ✅ TypeScript types and error handling
- ✅ Test data SQL script
- ✅ Navigation to directive detail screen
- ⚠️ Visual rendering (data works, display broken)

---

## 📝 GitHub Repo

**Repository**: https://github.com/renzocosta1/Salvo  
**Branch**: `main`  
**Latest Commit**: `d6a61c0`

---

Good luck debugging on Mac! 🚀
