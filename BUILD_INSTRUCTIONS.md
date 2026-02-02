# 🏗️ Creating a Development Build for Mapbox

## Why You Need This

Expo Go doesn't support custom native modules like Mapbox. You need to create a **development build** - it's like Expo Go, but custom-built for your app with all native modules included.

---

## 🤖 Option A: Android Development Build (EASIEST)

### Prerequisites
- Android phone with USB debugging enabled
- USB cable to connect phone to computer

### Steps:

1. **Stop Expo** (if running):
   - Press `Ctrl+C` in terminal

2. **Prebuild native code:**
   ```bash
   npx expo prebuild
   ```
   - This generates Android/iOS native folders
   - Takes ~30-60 seconds

3. **Build and install on Android:**
   ```bash
   npx expo run:android
   ```
   - First build takes 5-10 minutes
   - App installs automatically on your phone
   - Development server starts automatically

4. **Test the Map:**
   - Open the app (should auto-launch)
   - Navigate to Map tab
   - You should see the 3D tactical map! 🗺️

---

## 🍎 Option B: iOS Development Build (If you have Mac)

### Prerequisites
- Mac computer
- Xcode installed
- iOS device or simulator

### Steps:

1. **Prebuild:**
   ```bash
   npx expo prebuild
   ```

2. **Build and run:**
   ```bash
   npx expo run:ios
   ```

---

## 📱 Option C: Use EAS Build (Cloud Build - Slower but no setup)

If you don't want to deal with local builds:

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo:**
   ```bash
   eas login
   ```

3. **Create development build:**
   ```bash
   eas build --profile development --platform android
   ```

4. **Wait for cloud build** (~10-20 minutes)
5. **Download APK** from link and install on phone

---

## ⚠️ Important Notes

### After Building:
- Your app is now a **standalone development build**
- It works like Expo Go but includes Mapbox
- Fast Refresh still works
- You can still make code changes instantly
- No need to rebuild unless you add/remove native modules

### Git Ignore:
The prebuild creates `android/` and `ios/` folders. These are already in `.gitignore` - don't commit them!

### Going Back to Expo Go:
If you want to test other features without Mapbox:
1. Delete `android/` and `ios/` folders
2. Remove Mapbox import from map.tsx
3. Run `npx expo start` again

---

## 🐛 Troubleshooting

### "SDK location not found" (Android)
1. Install Android Studio
2. Open Android Studio > Settings > Android SDK
3. Note the SDK path
4. Create `android/local.properties`:
   ```
   sdk.dir=C:\\Users\\YourName\\AppData\\Local\\Android\\Sdk
   ```

### "No devices found"
- Make sure USB debugging is enabled on phone
- Accept USB debugging prompt on phone
- Try `adb devices` to verify connection

### Build fails with Gradle error
- Delete `android/.gradle` folder
- Run `npx expo run:android` again

---

## 🎯 What's Next After Build

Once the development build is installed:
1. Map tab will show the 3D tactical Mapbox view
2. We can continue with Task #8 Subtask #2 (H3 hexagon grid)
3. No need to rebuild for code changes - Fast Refresh still works!

---

**Let me know which build option you want to try! I recommend Option A (Android) if you have an Android phone.** 🚀
