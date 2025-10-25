# @breakrr/react-native-device-activity-android

React Native library for Android that provides screen blocking functionality similar to Apple's DeviceActivity APIs. This library uses Android's Accessibility Service, Overlay permissions, and Usage Access to monitor and block apps during focus sessions.

## Features

- 🚫 **Block apps** during focus sessions
- ⏰ **Time-based sessions** with start/end times
- 🎨 **Customizable block screens** with title, message, and CTA
- 📊 **Event streaming** for app attempts and blocks
- ✅ **Permission management** with helper methods
- 🔄 **Multiple sessions** support
- 📱 **Expo compatible** via config plugin

## Installation

```bash
# Using yarn
yarn add @breakrr/react-native-device-activity-android

# Using npm
npm install @breakrr/react-native-device-activity-android
```

## Requirements

- Expo SDK 54+ (React Native 0.81+)
- Android 7.0 (API 24) or higher
- **Requires dev build** - This library uses native Android code and cannot run in Expo Go

## Setup

### 1. Add to app.json

Add the plugin to your `app.json`:

```json
{
  "expo": {
    "plugins": ["@breakrr/react-native-device-activity-android"]
  }
}
```

### 2. Prebuild

Run prebuild to generate native Android code:

```bash
expo prebuild -p android
```

### 3. Build and run

```bash
expo run:android
```

## Permissions

This library requires three special permissions:

1. **Accessibility Service** - Monitors foreground app changes
2. **Draw Over Apps** (Overlay) - Shows block screen over blocked apps
3. **Usage Access** - Provides app usage statistics (optional, for analytics)

### Requesting Permissions

```typescript
import DeviceActivityAndroid from '@breakrr/react-native-device-activity-android'

// Check current status
const status = await DeviceActivityAndroid.getPermissionsStatus()
console.log(status)
// { accessibilityEnabled: false, overlayEnabled: false, usageAccessEnabled: false }

// Open settings to grant permissions
await DeviceActivityAndroid.requestAccessibilityPermission()
await DeviceActivityAndroid.requestOverlayPermission()
await DeviceActivityAndroid.requestUsageAccessPermission()
```

**Important**: These permissions require the user to manually enable them in Android Settings. Your app should guide users through this process.

## Usage

### Basic Example

```typescript
import DeviceActivityAndroid from '@breakrr/react-native-device-activity-android'

// Start a focus session blocking Instagram and Twitter for 5 minutes
await DeviceActivityAndroid.startSession(
  {
    id: 'focus-session',
    blockedPackages: ['com.instagram.android', 'com.twitter.android'],
    endsAt: Date.now() + 5 * 60 * 1000, // 5 minutes from now
  },
  {
    title: 'Stay Focused',
    message: 'This app is blocked during your focus session.',
    ctaText: 'Return to Focus',
  }
)

// Stop the session
await DeviceActivityAndroid.stopSession('focus-session')
```

### Session Configuration

```typescript
type SessionConfig = {
  id: string // Unique session identifier
  blockedPackages: string[] // Package IDs to block
  allowPackages?: string[] // Whitelist mode (if provided, only these apps allowed)
  startsAt?: number // Start time in ms since epoch (default: now)
  endsAt?: number // End time in ms since epoch (default: indefinite)
  reason?: string // Optional reason for the session
}
```

### Listening to Events

```typescript
const subscription = DeviceActivityAndroid.addListener(event => {
  switch (event.type) {
    case 'block_shown':
      console.log('Block shown for session:', event.sessionId)
      break
    case 'block_dismissed':
      console.log('User dismissed block')
      break
    case 'app_attempt':
      console.log('User tried to open:', event.packageName)
      break
    case 'service_state':
      console.log('Service running:', event.running)
      break
  }
})

// Clean up when done
subscription.remove()
```

### API Reference

#### Methods

- `getPermissionsStatus(): Promise<PermissionsStatus>`
- `requestAccessibilityPermission(): Promise<void>`
- `requestOverlayPermission(): Promise<void>`
- `requestUsageAccessPermission(): Promise<void>`
- `startSession(config: SessionConfig, style?: ShieldStyle): Promise<void>`
- `updateSession(config: Partial<SessionConfig> & { id: string }): Promise<void>`
- `stopSession(sessionId: string): Promise<void>`
- `stopAllSessions(): Promise<void>`
- `getCurrentForegroundApp(): Promise<ForegroundApp>`
- `isServiceRunning(): Promise<boolean>`
- `addListener(callback: (event: BlockEvent) => void): { remove(): void }`

See [index.d.ts](./index.d.ts) for complete type definitions.

## Google Play Policy Compliance

**IMPORTANT**: This library uses Android Accessibility Services, which are subject to strict Google Play policies.

### Required Disclosures

When submitting to Google Play, you MUST:

1. Provide a clear privacy policy explaining Accessibility Service usage
2. Create a YouTube video demonstrating the feature
3. Explain that the service is used for:
   - Digital Wellbeing / Focus management
   - Blocking distracting apps
   - NOT for automation or data collection

### Acceptable Use

✅ **Allowed**:
- Focus and digital wellbeing apps
- Parental control features
- Self-imposed app blocking

❌ **NOT Allowed**:
- Automating user actions
- Reading sensitive data from other apps
- Background surveillance
- Anything not directly visible to the user

See [Google Play Accessibility Policy](https://support.google.com/googleplay/android-developer/answer/10964491) for details.

## Known Limitations

1. **Android 14+**: Overlay restrictions are tighter. Users may need to grant additional permissions.
2. **Samsung/MIUI**: Some device manufacturers have additional restrictions on Accessibility Services.
3. **Battery optimization**: The service may be killed by aggressive battery savers. Guide users to whitelist your app.
4. **System apps**: Cannot block system apps or the Settings app itself.

## Troubleshooting

### Service not starting

```typescript
const running = await DeviceActivityAndroid.isServiceRunning()
if (!running) {
  // Guide user to enable Accessibility Service
  await DeviceActivityAndroid.requestAccessibilityPermission()
}
```

### Block overlay not showing

Check overlay permission:

```typescript
const { overlayEnabled } = await DeviceActivityAndroid.getPermissionsStatus()
if (!overlayEnabled) {
  await DeviceActivityAndroid.requestOverlayPermission()
}
```

## Example App

See the [example app](../../apps/example) for a complete working implementation.

## License

MIT

## Contributing

Contributions are welcome! Please see the main repository README for development setup.
