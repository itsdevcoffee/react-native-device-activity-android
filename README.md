# react-native-device-activity-android

[![CI](https://github.com/breakr/react-native-device-activity-android/actions/workflows/ci.yml/badge.svg)](https://github.com/breakr/react-native-device-activity-android/actions/workflows/ci.yml)

React Native + Expo library that brings iOS-style DeviceActivity functionality to Android. Block distracting apps during focus sessions using Android's Accessibility Service.

## 🎯 What is this?

This library mirrors the mental model of Apple's [DeviceActivity framework](https://developer.apple.com/documentation/deviceactivity) but for Android. It allows React Native developers to build digital wellbeing and focus apps that can:

- Block specific apps during focus sessions
- Show customizable block screens
- Track app usage attempts
- Manage time-based blocking schedules

**Designed for parity with**: [`kingstinct/react-native-device-activity`](https://github.com/kingstinct/react-native-device-activity)

## 📦 Repository Structure

This is a Yarn monorepo containing:

- `packages/device-activity-android` - The core library
- `apps/example` - Expo demo app

## 🚀 Quick Start

### 1. Clone and install

```bash
git clone https://github.com/breakr/react-native-device-activity-android.git
cd react-native-device-activity-android
yarn install
```

### 2. Run the example app

```bash
cd apps/example
expo prebuild -p android
expo run:android
```

### 3. Use in your project

```bash
# In your Expo app
yarn add @breakr/react-native-device-activity-android

# Add to app.json
{
  "expo": {
    "plugins": ["@breakr/react-native-device-activity-android"]
  }
}

# Prebuild and run
expo prebuild -p android
expo run:android
```

## 📖 Documentation

- [Getting Started Guide](./GETTING_STARTED.md) - Comprehensive guide with API examples and use cases
- [Library README](./packages/device-activity-android/README.md) - Full API documentation
- [Example App](./apps/example) - Working demo with all features

## 💡 Basic Usage

```typescript
import DeviceActivityAndroid from '@breakr/react-native-device-activity-android'

// Start a 5-minute focus session
await DeviceActivityAndroid.startSession({
  id: 'focus-session',
  blockedPackages: ['com.instagram.android', 'com.twitter.android'],
  endsAt: Date.now() + 5 * 60 * 1000,
})

// Listen for block events
const sub = DeviceActivityAndroid.addListener(event => {
  if (event.type === 'app_attempt') {
    console.log('User tried to open:', event.packageName)
  }
})
```

## 🔒 Permissions Required

This library requires four Android permissions:

1. **Accessibility Service** - Detects app switches
2. **Draw Over Apps** - Shows block screens
3. **Usage Access** - For reliable app detection
4. **Schedule Exact Alarms** - For temporary unblock feature (Android 12+)

All permissions must be granted by the user in Android Settings. The library provides helper methods to open the appropriate settings screens.

## ⚠️ Google Play Policy

**Important**: Apps using Accessibility Services must comply with [Google Play's Accessibility Policy](https://support.google.com/googleplay/android-developer/answer/10964491).

✅ Acceptable uses:
- Digital wellbeing and focus apps
- Parental controls
- Self-imposed app blocking

❌ Not allowed:
- Data collection from other apps
- Automation or macro features
- Background surveillance

You must provide:
- Privacy policy explaining Accessibility usage
- YouTube demo video
- Clear user-facing disclosure

## 🛠️ Development

### Requirements

- Node.js 20.19.x or higher
- Yarn 1.22.x
- Android SDK with API 36
- Java 17

### Project structure

```
.
├── packages/
│   └── device-activity-android/    # Core library
│       ├── android/                # Kotlin native code
│       ├── src/                    # TypeScript bridge
│       └── plugin/                 # Expo config plugin
└── apps/
    └── example/                    # Demo app
```

### Scripts

```bash
# Install dependencies
yarn

# Lint all packages
yarn lint

# Type check
yarn typecheck

# Format code
yarn format

# Run example app
cd apps/example && expo run:android
```

## 🧪 Testing

The best way to test is using the example app:

1. Build and install on a real Android device (emulator works but some features may be limited)
2. Grant all four permissions
3. Add some app package names (e.g., `com.instagram.android`)
4. Start a focus session
5. Try to open a blocked app - you should see the block screen

## 📱 Compatibility

- **Expo SDK**: 54+ (React Native 0.81+)
- **Android**: 7.0 (API 24) or higher
- **Requires dev build**: Yes (cannot run in Expo Go)

## 🐛 Known Issues

1. **Android 14/15**: Tighter overlay restrictions - additional permissions may be needed
2. **Samsung/MIUI**: Some manufacturers have extra Accessibility Service restrictions
3. **Battery optimization**: Aggressive battery savers may kill the service

## 🤝 Contributing

Contributions welcome! Please:

1. Follow the existing code style (Prettier, ESLint)
2. Update TypeScript types for any API changes
3. Test on a real Android device
4. Update documentation

## 📄 License

MIT

## 🙏 Acknowledgments

- Inspired by [kingstinct/react-native-device-activity](https://github.com/kingstinct/react-native-device-activity)
- Built with [Expo](https://expo.dev) and [React Native](https://reactnative.dev)

## 📞 Support

- [GitHub Issues](https://github.com/breakr/react-native-device-activity-android/issues)
- [Discussions](https://github.com/breakr/react-native-device-activity-android/discussions)
