# Getting Started Guide

This guide will help you set up and run the React Native Device Activity Android project.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: 20.19.x or higher
- **Yarn**: 1.22.x or higher
- **Java**: JDK 17 (required for React Native 0.81)
- **Android Studio**: Latest version with:
  - Android SDK API 36
  - Android SDK Build-Tools
  - Android NDK
  - Android Emulator or physical device

## Initial Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/breakrr/react-native-device-activity-android.git
cd react-native-device-activity-android

# Install all dependencies
yarn install
```

This will install dependencies for:
- Root monorepo
- Library package (`packages/device-activity-android`)
- Example app (`apps/example`)

### 2. Verify Installation

```bash
# Run type checking
yarn typecheck

# Run linting
yarn lint
```

## Running the Example App

The example app demonstrates all features of the library.

### Option A: Android Emulator

1. Start Android Studio
2. Open AVD Manager (Tools → Device Manager)
3. Create/start an emulator running Android 7.0+ (API 24+)

```bash
# Navigate to example app
cd apps/example

# Generate native Android code
expo prebuild -p android

# Build and run on emulator
expo run:android
```

### Option B: Physical Android Device

1. Enable Developer Options on your Android device:
   - Go to Settings → About phone
   - Tap "Build number" 7 times
   - Go back to Settings → Developer options
   - Enable "USB debugging"

2. Connect device via USB

3. Verify connection:
```bash
adb devices
# Should show your device
```

4. Build and run:
```bash
cd apps/example
expo prebuild -p android
expo run:android
```

## Using the Example App

### Step 1: Grant Permissions

The app requires three permissions. Grant them in order:

1. **Accessibility Service**:
   - Tap "Grant" next to "Accessibility Service"
   - Find "Device Activity Android Demo" in the list
   - Enable it
   - Accept the warning prompt
   - Return to app

2. **Draw Over Apps**:
   - Tap "Grant" next to "Draw Over Apps"
   - Enable "Allow display over other apps"
   - Return to app

3. **Usage Access**:
   - Tap "Grant" next to "Usage Access"
   - Find your app and enable it
   - Return to app

### Step 2: Start a Focus Session

1. In "Blocked Packages" field, enter comma-separated package names:
   ```
   com.instagram.android,com.twitter.android,com.facebook.katana
   ```

   Common package names:
   - Instagram: `com.instagram.android`
   - Twitter/X: `com.twitter.android`
   - Facebook: `com.facebook.katana`
   - TikTok: `com.zhiliaoapp.musically`
   - YouTube: `com.google.android.youtube`

2. Tap "Start 5-min Focus"

3. You should see "✓ Focus session active"

### Step 3: Test Blocking

1. Press the home button
2. Try to open one of the blocked apps
3. You should see a block screen with:
   - Title: "Stay Focused"
   - Message explaining the block
   - "Return to Focus" button

4. Check the Event Log in the demo app - you should see:
   - `app_attempt` events when you try to open blocked apps
   - `block_shown` events when the block screen appears
   - `block_dismissed` events when you dismiss the screen

## Developing the Library

If you want to modify the library code:

### TypeScript Changes

Edit files in `packages/device-activity-android/src/`:

```bash
# After changes, run type check
yarn typecheck
```

### Kotlin Changes

Edit files in `packages/device-activity-android/android/src/main/java/`:

```bash
# Rebuild the app to see changes
cd apps/example
expo run:android
```

### Config Plugin Changes

Edit `packages/device-activity-android/plugin/app.plugin.ts`:

```bash
# After changes, regenerate native code
cd apps/example
rm -rf android ios
expo prebuild -p android
expo run:android
```

## Troubleshooting

### "Native module not found"

**Solution**: Make sure you've run `expo prebuild` and rebuilt the app. This library requires a dev build and won't work in Expo Go.

### Accessibility Service not working

**Possible causes**:
1. Service not enabled in Settings
2. Device manufacturer restrictions (Samsung/MIUI)
3. Battery optimization killing the service

**Solution**:
```bash
# Check if service is running
adb shell dumpsys accessibility | grep "BlockerAccessibilityService"

# Disable battery optimization
# Settings → Apps → Your app → Battery → Unrestricted
```

### Block overlay not showing

**Check**:
1. Overlay permission granted?
2. On Android 14+, additional restrictions may apply
3. Check logcat for errors:
```bash
adb logcat | grep -i "deviceactivity\|accessibility"
```

### Build errors

**Common issues**:

1. **Java version**: Ensure JDK 17 is installed
   ```bash
   java -version  # Should show version 17
   ```

2. **Gradle sync**: Clean and rebuild
   ```bash
   cd apps/example/android
   ./gradlew clean
   cd ..
   expo run:android
   ```

3. **SDK version**: Ensure Android SDK 36 is installed
   - Open Android Studio → SDK Manager
   - Install "Android 14.0 (API 36)"

## Next Steps

- Read the [Library README](./packages/device-activity-android/README.md) for API documentation
- Check out the [example App.tsx](./apps/example/App.tsx) for usage patterns
- Review [Google Play Policy](https://support.google.com/googleplay/android-developer/answer/10964491) if publishing

## Common Package Names

For testing, here are some common Android app package names:

**Social Media**:
- Instagram: `com.instagram.android`
- Twitter/X: `com.twitter.android`
- Facebook: `com.facebook.katana`
- TikTok: `com.zhiliaoapp.musically`
- Snapchat: `com.snapchat.android`
- LinkedIn: `com.linkedin.android`

**Entertainment**:
- YouTube: `com.google.android.youtube`
- Netflix: `com.netflix.mediaclient`
- Spotify: `com.spotify.music`
- Reddit: `com.reddit.frontpage`

**Games**:
- Candy Crush: `com.king.candycrushsaga`
- Pokemon Go: `com.nianticlabs.pokemongo`

To find package names on your device:
```bash
# List all installed packages
adb shell pm list packages

# Find specific package
adb shell pm list packages | grep instagram
```

## Support

If you encounter issues:

1. Check the [Troubleshooting](#troubleshooting) section above
2. Search [GitHub Issues](https://github.com/breakrr/react-native-device-activity-android/issues)
3. Open a new issue with:
   - Your environment (OS, Node version, Android version)
   - Steps to reproduce
   - Error logs from `adb logcat`
