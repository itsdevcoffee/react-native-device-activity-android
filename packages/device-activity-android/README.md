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

### Quick Actions

The library provides convenient methods for common blocking scenarios:

#### Block All Apps

```typescript
// Block all installed apps for 1 hour
await DeviceActivityAndroid.blockAllApps(
  'deep-focus-session',
  Date.now() + 60 * 60 * 1000,
  {
    title: 'Deep Focus Mode',
    message: 'All apps are blocked for 1 hour.',
    ctaText: 'Go Back',
  }
)
```

#### Check Blocking Status

```typescript
const status = await DeviceActivityAndroid.getBlockStatus()
console.log(`Blocking: ${status.isBlocking}`)
console.log(`Active sessions: ${status.activeSessionCount}`)
console.log(`Session IDs: ${status.activeSessions.join(', ')}`)
console.log(`Current app: ${status.currentForegroundApp}`)
```

#### Temporary Unblock

```typescript
// Pause blocking for 60 seconds, then automatically resume
await DeviceActivityAndroid.temporaryUnblock(60)

// Listen for when blocking resumes
const subscription = DeviceActivityAndroid.addListener(event => {
  if (event.type === 'temporary_unblock_ended') {
    console.log('Blocking has resumed!')
    subscription.remove()
  }
})
```

#### Unblock All Apps

```typescript
// Stop all active blocking sessions
await DeviceActivityAndroid.unblockAllApps()
```

## How It Works

The library uses a combination of Android system APIs to detect and block apps:

1. **UsageStatsManager Polling**: Continuously monitors the foreground app using UsageStatsManager API, which provides reliable app detection without extensive accessibility permissions abuse.

2. **Accessibility Service**: Required to display system-level overlays and provide the accessibility context needed for blocking functionality.

3. **Window Overlays**: When a blocked app is detected, the library displays a full-screen overlay with customizable messaging to prevent access.

The blocking mechanism includes:
- A foreground check that runs periodically to detect app switches
- Session-based blocking with configurable start/end times
- Cooldown periods to prevent overlay reappearing after dismissal
- Event emission for tracking user behavior and block attempts

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
    case 'temporary_unblock_ended':
      console.log('Temporary unblock period has ended, blocking resumed')
      break
  }
})

// Clean up when done
subscription.remove()
```

### Getting Installed Apps

```typescript
// Get list of all installed user-facing apps
const apps = await DeviceActivityAndroid.getInstalledApps(true) // true = include icons

// Filter and display apps
apps.forEach(app => {
  console.log(`${app.name} (${app.packageName})`)
  if (app.icon) {
    // icon is base64-encoded PNG, ready for <Image source={{ uri: `data:image/png;base64,${app.icon}` }} />
  }
})
```

**Note**: This method filters out system apps and returns only apps with launcher activities. It includes updated system apps (like pre-installed apps that have been updated via Play Store).

### API Reference

#### Methods

##### Permission Management
- `getPermissionsStatus(): Promise<PermissionsStatus>` - Get current permission status for all required permissions
- `requestAccessibilityPermission(): Promise<void>` - Open system settings to enable Accessibility Service
- `requestOverlayPermission(): Promise<void>` - Open system settings to grant overlay permission
- `requestUsageAccessPermission(): Promise<void>` - Open system settings to grant usage access permission

##### Session Management
- `startSession(config: SessionConfig, style?: ShieldStyle): Promise<void>` - Start a new blocking session
- `updateSession(config: Partial<SessionConfig> & { id: string }): Promise<void>` - Update an existing session configuration
- `stopSession(sessionId: string): Promise<void>` - Stop a specific blocking session by ID
- `stopAllSessions(): Promise<void>` - Stop all active blocking sessions
- `blockAllApps(sessionId?: string, endsAt?: number, style?: ShieldStyle): Promise<void>` - Block all installed user apps in one session
- `unblockAllApps(): Promise<void>` - Unblock all apps by stopping all sessions (alias for stopAllSessions)
- `getBlockStatus(): Promise<BlockStatus>` - Get current blocking status including active sessions
- `temporaryUnblock(durationSeconds: number): Promise<void>` - Temporarily pause all blocking for N seconds, then auto-resume

##### App Information
- `getCurrentForegroundApp(): Promise<ForegroundApp>` - Get the current foreground app package name (best effort)
- `getInstalledApps(includeIcons?: boolean): Promise<Array<{ packageName: string; name: string; icon?: string }>>` - Get list of installed user-facing applications with optional icons
- `isServiceRunning(): Promise<boolean>` - Check if the accessibility service is currently running

##### Event Handling
- `addListener(callback: (event: BlockEvent) => void): { remove(): void }` - Add a listener for block events (block_shown, block_dismissed, app_attempt, service_state)

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

See the [example app](../../apps/example) for a complete working implementation that demonstrates:
- Permission onboarding flow
- App selection UI with icons and search
- Starting/stopping focus sessions
- Visual feedback during active sessions

To run the example app:

```bash
cd apps/example
npx expo prebuild -p android
npx expo run:android
```

## Development

This package is part of a monorepo. To contribute:

1. Clone the repository
2. Install dependencies: `yarn install`
3. Navigate to the example app: `cd apps/example`
4. Prebuild and run: `npx expo prebuild -p android && npx expo run:android`

### Making Changes

- **Native code**: Edit files in `packages/device-activity-android/android/src/main/java/com/breakrr/deviceactivity/`
- **JavaScript bridge**: Edit `packages/device-activity-android/src/index.ts`
- **Type definitions**: Update `packages/device-activity-android/index.d.ts`
- **Config plugin**: Modify `packages/device-activity-android/plugin/app.plugin.js`

After making native changes, rebuild the example app:

```bash
cd apps/example
npx expo prebuild -p android --clean
npx expo run:android
```

## Architecture Notes

### Why UsageStatsManager?

Initially, this library used AccessibilityEvent callbacks to detect app changes. However, this approach had reliability issues and raised concerns about excessive accessibility API usage for Play Store compliance.

The current implementation uses UsageStatsManager polling, which:
- Provides reliable foreground app detection
- Reduces dependency on accessibility-specific APIs
- Better aligns with Play Store policies for digital wellbeing apps
- Offers better compatibility across device manufacturers

### Permissions Required

| Permission | Purpose | Request Method |
|------------|---------|----------------|
| Accessibility Service | Display system overlays, detect blocking context | `requestAccessibilityPermission()` |
| Draw Over Apps | Show blocking overlay on top of blocked apps | `requestOverlayPermission()` |
| Usage Access | Monitor foreground app via UsageStatsManager | `requestUsageAccessPermission()` |

All three permissions must be granted by the user in system settings.

## Comparison with iOS DeviceActivity

This library aims for API parity with [react-native-device-activity](https://github.com/kingstinct/react-native-device-activity) for iOS. Key differences:

| Feature | iOS (DeviceActivity) | Android (This Package) |
|---------|---------------------|------------------------|
| API Style | Shield configuration, Family Controls | Session-based blocking with style config |
| Permission Model | Screen Time API | Accessibility + Overlay + Usage Access |
| Enforcement | System-level, unbreakable | Overlay-based, can be dismissed (configurable) |
| App Detection | Native API | UsageStatsManager polling |

## License

MIT

## Contributing

Contributions are welcome! This package will be open-sourced soon. Please ensure:

- All public APIs are documented in this README
- TypeScript types are updated for any native module changes
- The example app demonstrates new features
- Code follows the project's style guide (see CLAUDE.md)
