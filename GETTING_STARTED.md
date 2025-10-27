# Getting Started with React Native Device Activity Android

This comprehensive guide will walk you through everything you need to know to use the `@breakr/react-native-device-activity-android` package in your app.

## Table of Contents

- [Installation](#installation)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Permissions](#permissions)
- [Core Concepts](#core-concepts)
- [API Reference with Examples](#api-reference-with-examples)
  - [Permission Management](#permission-management)
  - [Session Management](#session-management)
  - [App Information](#app-information)
  - [Shield Configuration](#shield-configuration)
  - [Event Handling](#event-handling)
- [Common Use Cases](#common-use-cases)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Installation

### 1. Install the package

```bash
# Using yarn
yarn add @breakr/react-native-device-activity-android

# Using npm
npm install @breakr/react-native-device-activity-android
```

### 2. Add Expo config plugin

In your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": ["@breakr/react-native-device-activity-android"]
  }
}
```

### 3. Rebuild your app

```bash
# Clean prebuild if needed
expo prebuild -p android --clean

# Build and run
expo run:android
```

**Important**: This library requires a **dev build** and will not work in Expo Go.

---

## Prerequisites

Before you begin, make sure you have:

- **Expo SDK 54+** (React Native 0.81+)
- **Android 7.0+** (API 24) target device/emulator
- **Node.js 20.19.x** or higher
- **Java JDK 17**
- **Android Studio** with Android SDK API 36

---

## Quick Start

Here's a minimal example to get you started:

```typescript
import React, { useState, useEffect } from 'react'
import { View, Text, Button, Alert } from 'react-native'
import DeviceActivityAndroid from '@breakr/react-native-device-activity-android'

export default function App() {
  const [isBlocking, setIsBlocking] = useState(false)

  // Check if all permissions are granted
  useEffect(() => {
    checkPermissions()
  }, [])

  const checkPermissions = async () => {
    const status = await DeviceActivityAndroid.getPermissionsStatus()
    if (!status.accessibilityEnabled || !status.overlayEnabled) {
      Alert.alert('Permissions Required', 'Please grant all required permissions')
    }
  }

  const startFocusSession = async () => {
    try {
      await DeviceActivityAndroid.startSession(
        {
          id: 'my-focus-session',
          blockedPackages: [
            'com.instagram.android',
            'com.twitter.android',
            'com.facebook.katana'
          ],
          endsAt: Date.now() + 30 * 60 * 1000, // 30 minutes
        },
        {
          title: 'Focus Time',
          subtitle: 'This app is blocked during your focus session',
          primaryButtonLabel: 'Back to Focus',
        }
      )
      setIsBlocking(true)
      Alert.alert('Success', 'Focus session started!')
    } catch (error) {
      Alert.alert('Error', error.message)
    }
  }

  const stopFocusSession = async () => {
    await DeviceActivityAndroid.stopSession('my-focus-session')
    setIsBlocking(false)
    Alert.alert('Done', 'Focus session ended')
  }

  return (
    <View style={{ padding: 20 }}>
      <Text>Status: {isBlocking ? 'Blocking Active' : 'No Active Session'}</Text>
      <Button
        title={isBlocking ? 'End Focus' : 'Start 30-min Focus'}
        onPress={isBlocking ? stopFocusSession : startFocusSession}
      />
    </View>
  )
}
```

---

## Permissions

This library requires four Android permissions that users must grant manually through system settings.

### Required Permissions

1. **Accessibility Service** - Required to detect when users switch between apps
2. **Draw Over Apps** (Overlay) - Required to display the block screen
3. **Usage Access** - Required for reliable app detection via UsageStatsManager
4. **Schedule Exact Alarms** - Required for temporary unblock feature (Android 12+)

### Requesting Permissions Flow

Here's a complete permission onboarding flow:

```typescript
import DeviceActivityAndroid, { type PermissionsStatus } from '@breakr/react-native-device-activity-android'

function PermissionsScreen() {
  const [permissions, setPermissions] = useState<PermissionsStatus>({
    accessibilityEnabled: false,
    overlayEnabled: false,
    usageAccessEnabled: false,
    scheduleExactAlarmEnabled: false,
  })

  useEffect(() => {
    checkPermissions()
  }, [])

  const checkPermissions = async () => {
    const status = await DeviceActivityAndroid.getPermissionsStatus()
    setPermissions(status)
  }

  const requestAccessibility = async () => {
    await DeviceActivityAndroid.requestAccessibilityPermission()
    // Wait for user to grant permission and return
    setTimeout(checkPermissions, 1000)
  }

  const requestOverlay = async () => {
    await DeviceActivityAndroid.requestOverlayPermission()
    setTimeout(checkPermissions, 1000)
  }

  const requestUsageAccess = async () => {
    await DeviceActivityAndroid.requestUsageAccessPermission()
    setTimeout(checkPermissions, 1000)
  }

  const allPermissionsGranted =
    permissions.accessibilityEnabled &&
    permissions.overlayEnabled &&
    permissions.usageAccessEnabled &&
    permissions.scheduleExactAlarmEnabled

  return (
    <View>
      <Text>Grant Required Permissions</Text>

      <PermissionItem
        name="Accessibility Service"
        granted={permissions.accessibilityEnabled}
        onGrant={requestAccessibility}
        description="Detects when you open blocked apps"
      />

      <PermissionItem
        name="Draw Over Apps"
        granted={permissions.overlayEnabled}
        onGrant={requestOverlay}
        description="Shows block screen over blocked apps"
      />

      <PermissionItem
        name="Usage Access"
        granted={permissions.usageAccessEnabled}
        onGrant={requestUsageAccess}
        description="Improves app detection accuracy"
      />

      <PermissionItem
        name="Schedule Exact Alarms"
        granted={permissions.scheduleExactAlarmEnabled}
        description="Enables temporary unblock feature (usually granted automatically)"
        optional={true}
      />

      {allPermissionsGranted && (
        <Button title="Continue" onPress={() => navigation.navigate('Home')} />
      )}
    </View>
  )
}
```

---

## Core Concepts

### Sessions

A **session** is a time-bounded period during which specific apps are blocked. Each session has:

- **Unique ID** - To identify and manage the session
- **Blocked apps** - List of package names to block
- **Time window** - Optional start and end times
- **Shield style** - Customizable block screen appearance

### Shields

A **shield** is the blocking UI shown when a user tries to open a blocked app. You can customize:

- Title and subtitle text
- Button labels
- Colors (background, text, buttons)
- Icons
- Layout style

### Events

The library emits events that you can listen to:

- `block_shown` - Block screen was displayed
- `block_dismissed` - User dismissed the block screen
- `app_attempt` - User tried to open a blocked app
- `service_state` - Accessibility service started/stopped
- `session_expired` - A session reached its end time
- `temporary_unblock_ended` - Temporary unblock period ended

---

## API Reference with Examples

### Permission Management

#### `getPermissionsStatus(): Promise<PermissionsStatus>`

Gets the current status of all required permissions.

```typescript
const status = await DeviceActivityAndroid.getPermissionsStatus()
console.log('Accessibility:', status.accessibilityEnabled)
console.log('Overlay:', status.overlayEnabled)
console.log('Usage Access:', status.usageAccessEnabled)
console.log('Exact Alarm:', status.scheduleExactAlarmEnabled)

// Example: Show warning if any permission is missing
if (!status.accessibilityEnabled || !status.overlayEnabled) {
  showPermissionWarning()
}
```

**Return Type:**
```typescript
type PermissionsStatus = {
  accessibilityEnabled: boolean
  overlayEnabled: boolean
  usageAccessEnabled: boolean
  scheduleExactAlarmEnabled: boolean
}
```

#### `requestAccessibilityPermission(): Promise<void>`

Opens the system Accessibility Settings where the user can enable the service.

```typescript
await DeviceActivityAndroid.requestAccessibilityPermission()
// User is taken to Settings → Accessibility → Device Activity
// They need to enable your app's accessibility service
```

#### `requestOverlayPermission(): Promise<void>`

Opens the system settings for "Draw over other apps" permission.

```typescript
await DeviceActivityAndroid.requestOverlayPermission()
// User is taken to Settings → Apps → Special access → Display over other apps
```

#### `requestUsageAccessPermission(): Promise<void>`

Opens the system settings for Usage Access permission.

```typescript
await DeviceActivityAndroid.requestUsageAccessPermission()
// User is taken to Settings → Apps → Special access → Usage access
```

---

### Session Management

#### `startSession(config: SessionConfig, style?: ShieldStyle, shieldId?: string): Promise<void>`

Starts a new blocking session.

**Basic Example:**

```typescript
await DeviceActivityAndroid.startSession(
  {
    id: 'morning-focus',
    blockedPackages: ['com.instagram.android', 'com.twitter.android'],
    endsAt: Date.now() + 60 * 60 * 1000, // 1 hour from now
  },
  {
    title: 'Morning Focus Time',
    subtitle: 'This app is blocked until 9 AM',
    primaryButtonLabel: 'Got It',
  }
)
```

**Advanced Example with Time Window:**

```typescript
// Schedule a focus session that starts at 9 AM and ends at 5 PM
const today = new Date()
const startTime = new Date(today.setHours(9, 0, 0, 0)).getTime()
const endTime = new Date(today.setHours(17, 0, 0, 0)).getTime()

await DeviceActivityAndroid.startSession(
  {
    id: 'work-hours',
    blockedPackages: [
      'com.instagram.android',
      'com.facebook.katana',
      'com.twitter.android',
      'com.tiktok.lite.go'
    ],
    startsAt: startTime,
    endsAt: endTime,
    reason: 'Deep Work Session',
  },
  {
    title: 'Work Mode Active',
    subtitle: 'Social media blocked during work hours (9 AM - 5 PM)',
    primaryButtonLabel: 'Back to Work',
    backgroundColor: { red: 255, green: 253, blue: 249 },
    titleColor: { red: 15, green: 23, blue: 42 },
  }
)
```

**Using Allowlist Mode:**

```typescript
// Block ALL apps EXCEPT the ones in allowPackages
await DeviceActivityAndroid.startSession({
  id: 'extreme-focus',
  allowPackages: [
    'com.google.android.apps.messaging', // Messages
    'com.android.phone', // Phone
    'com.spotify.music', // Spotify for focus music
  ],
  endsAt: Date.now() + 2 * 60 * 60 * 1000, // 2 hours
})
```

**Config Type:**
```typescript
type SessionConfig = {
  id: string                    // Unique identifier
  blockedPackages?: string[]    // Apps to block (blocklist mode)
  allowPackages?: string[]      // Only these apps allowed (allowlist mode)
  startsAt?: number            // Start time (ms since epoch), default: now
  endsAt?: number              // End time (ms since epoch), default: indefinite
  reason?: string              // Optional reason for the session
}

type ShieldStyle = {
  title?: string
  subtitle?: string
  primaryButtonLabel?: string
  secondaryButtonLabel?: string
  backgroundColor?: RGBColor
  titleColor?: RGBColor
  subtitleColor?: RGBColor
  primaryButtonBackgroundColor?: RGBColor
  primaryButtonTextColor?: RGBColor
  primaryImagePath?: string     // Path to custom icon
  iconSize?: number             // Icon size in dp
}
```

#### `updateSession(config: Partial<SessionConfig> & { id: string }): Promise<void>`

Updates an existing session's configuration.

```typescript
// Start a session
await DeviceActivityAndroid.startSession({
  id: 'study-time',
  blockedPackages: ['com.instagram.android'],
  endsAt: Date.now() + 30 * 60 * 1000, // 30 minutes
})

// Later, extend the session by 15 more minutes
await DeviceActivityAndroid.updateSession({
  id: 'study-time',
  endsAt: Date.now() + 45 * 60 * 1000, // 45 minutes from original start
})

// Or add more apps to block
await DeviceActivityAndroid.updateSession({
  id: 'study-time',
  blockedPackages: [
    'com.instagram.android',
    'com.twitter.android', // newly added
    'com.tiktok.lite.go',  // newly added
  ],
})
```

#### `stopSession(sessionId: string): Promise<void>`

Stops a specific blocking session.

```typescript
await DeviceActivityAndroid.stopSession('morning-focus')
```

#### `stopAllSessions(): Promise<void>`

Stops all active blocking sessions at once.

```typescript
// Useful for "Emergency Stop" button
await DeviceActivityAndroid.stopAllSessions()
```

#### `blockAllApps(sessionId?: string, endsAt?: number, style?: ShieldStyle): Promise<void>`

Convenience method to block all installed apps.

```typescript
// Block all apps for 1 hour
await DeviceActivityAndroid.blockAllApps(
  'deep-work',
  Date.now() + 60 * 60 * 1000,
  {
    title: 'Total Focus Mode',
    subtitle: 'All apps blocked for 1 hour',
  }
)
```

#### `unblockAllApps(): Promise<void>`

Convenience method to stop all blocking. Alias for `stopAllSessions()`.

```typescript
await DeviceActivityAndroid.unblockAllApps()
```

#### `temporaryUnblock(durationSeconds: number): Promise<void>`

Temporarily pauses all blocking for a specified duration, then automatically resumes.

```typescript
// Pause blocking for 5 minutes
await DeviceActivityAndroid.temporaryUnblock(5 * 60)

// Listen for when blocking resumes
const sub = DeviceActivityAndroid.addListener(event => {
  if (event.type === 'temporary_unblock_ended') {
    console.log('Blocking has resumed!')
    showNotification('Focus session resumed')
  }
})
```

**Use Case Example:**

```typescript
function EmergencyBreakButton() {
  const [unblockActive, setUnblockActive] = useState(false)

  const takeBreak = async () => {
    await DeviceActivityAndroid.temporaryUnblock(5 * 60) // 5 minutes
    setUnblockActive(true)
    Alert.alert('Break Time', 'Blocking paused for 5 minutes')
  }

  useEffect(() => {
    const sub = DeviceActivityAndroid.addListener(event => {
      if (event.type === 'temporary_unblock_ended') {
        setUnblockActive(false)
        Alert.alert('Break Over', 'Blocking has resumed')
      }
    })
    return () => sub.remove()
  }, [])

  return (
    <Button
      title={unblockActive ? 'Break in progress...' : 'Take 5-min Break'}
      onPress={takeBreak}
      disabled={unblockActive}
    />
  )
}
```

#### `temporaryBlock(durationSeconds: number, style?: ShieldStyle): Promise<void>`

Creates a temporary blocking session that automatically expires after the duration.

```typescript
// Quick 10-minute focus burst
await DeviceActivityAndroid.temporaryBlock(10 * 60, {
  title: 'Quick Focus',
  subtitle: '10 minutes of distraction-free time',
})

// Session automatically ends after 10 minutes
```

#### `getBlockStatus(): Promise<BlockStatus>`

Gets current blocking status and active sessions.

```typescript
const status = await DeviceActivityAndroid.getBlockStatus()

console.log('Currently blocking:', status.isBlocking)
console.log('Number of active sessions:', status.activeSessionCount)
console.log('Session IDs:', status.activeSessions)
console.log('Current foreground app:', status.currentForegroundApp)

// Example: Display status to user
if (status.isBlocking) {
  setStatusText(`Blocking ${status.activeSessionCount} sessions`)
}
```

**Return Type:**
```typescript
type BlockStatus = {
  isBlocking: boolean
  activeSessionCount: number
  activeSessions: string[]
  currentForegroundApp?: string
}
```

---

### App Information

#### `getInstalledApps(includeIcons?: boolean): Promise<AppInfo[]>`

Gets a list of all user-facing installed apps.

**Basic Example:**

```typescript
const apps = await DeviceActivityAndroid.getInstalledApps(false)

// Display in a list
apps.forEach(app => {
  console.log(`${app.name} - ${app.packageName}`)
})
```

**With Icons:**

```typescript
const apps = await DeviceActivityAndroid.getInstalledApps(true)

// Render in UI
{apps.map(app => (
  <View key={app.packageName}>
    {app.icon && (
      <Image
        source={{ uri: `data:image/png;base64,${app.icon}` }}
        style={{ width: 48, height: 48 }}
      />
    )}
    <Text>{app.name}</Text>
    <Text>{getCategoryLabel(app.category)}</Text>
  </View>
))}
```

**Building an App Selector:**

```typescript
import { getCategoryLabel, AppCategory } from '@breakr/react-native-device-activity-android'

function AppSelectorScreen() {
  const [apps, setApps] = useState<AppInfo[]>([])
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadApps()
  }, [])

  const loadApps = async () => {
    const installedApps = await DeviceActivityAndroid.getInstalledApps(true)

    // Sort by category and name
    installedApps.sort((a, b) => {
      if (a.category !== b.category) return a.category - b.category
      return a.name.localeCompare(b.name)
    })

    setApps(installedApps)
  }

  const toggleApp = (packageName: string) => {
    const newSet = new Set(selectedPackages)
    if (newSet.has(packageName)) {
      newSet.delete(packageName)
    } else {
      newSet.add(packageName)
    }
    setSelectedPackages(newSet)
  }

  const startBlocking = async () => {
    await DeviceActivityAndroid.startSession({
      id: 'custom-session',
      blockedPackages: Array.from(selectedPackages),
      endsAt: Date.now() + 60 * 60 * 1000,
    })
  }

  return (
    <View>
      <FlatList
        data={apps}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => toggleApp(item.packageName)}>
            <View style={{ flexDirection: 'row', padding: 10 }}>
              {item.icon && (
                <Image
                  source={{ uri: `data:image/png;base64,${item.icon}` }}
                  style={{ width: 40, height: 40 }}
                />
              )}
              <View>
                <Text>{item.name}</Text>
                <Text style={{ fontSize: 12, color: 'gray' }}>
                  {getCategoryLabel(item.category)}
                </Text>
              </View>
              {selectedPackages.has(item.packageName) && <Text>✓</Text>}
            </View>
          </TouchableOpacity>
        )}
      />
      <Button
        title={`Block ${selectedPackages.size} apps`}
        onPress={startBlocking}
        disabled={selectedPackages.size === 0}
      />
    </View>
  )
}
```

**Return Type:**
```typescript
type AppInfo = {
  packageName: string
  name: string
  category: number
  icon?: string  // base64-encoded PNG (if includeIcons was true)
}
```

#### `getCurrentForegroundApp(): Promise<ForegroundApp>`

Gets the currently open app (best effort).

```typescript
const app = await DeviceActivityAndroid.getCurrentForegroundApp()
console.log('Current app:', app.packageName)

// Example: Show warning if user is on a distracting app
const distractingApps = ['com.instagram.android', 'com.twitter.android']
if (distractingApps.includes(app.packageName)) {
  Alert.alert('Distraction Alert', 'You\'re on a distracting app!')
}
```

#### `isServiceRunning(): Promise<boolean>`

Checks if the accessibility service is currently running.

```typescript
const isRunning = await DeviceActivityAndroid.isServiceRunning()
if (!isRunning) {
  Alert.alert('Service Not Running', 'Please enable the accessibility service')
}
```

#### `getAppMetadataDebug(): Promise<AppMetadata[]>`

**DEBUG ONLY** - Gets comprehensive metadata for all installed apps. Useful for debugging and development.

```typescript
const metadata = await DeviceActivityAndroid.getAppMetadataDebug()

// Find specific app details
const instagram = metadata.find(app => app.packageName === 'com.instagram.android')
console.log('Instagram metadata:', {
  name: instagram.name,
  category: instagram.category,
  isSystem: instagram.isSystemApp,
  isUpdated: instagram.isUpdatedSystemApp,
  hasLauncher: instagram.hasLauncherActivity,
})
```

---

### Shield Configuration

#### `configureShielding(configId: string, style: ShieldStyle): Promise<void>`

Register a reusable shield configuration that can be used across multiple sessions.

```typescript
// Define a shield style for work sessions
await DeviceActivityAndroid.configureShielding('work-shield', {
  title: 'Work Mode',
  subtitle: 'This app is blocked during work hours',
  primaryButtonLabel: 'Back to Work',
  backgroundColor: { red: 37, green: 99, blue: 235 },
  titleColor: { red: 255, green: 255, blue: 255 },
})

// Define a shield style for sleep time
await DeviceActivityAndroid.configureShielding('sleep-shield', {
  title: 'Sleep Time',
  subtitle: 'Put your phone down and get some rest',
  primaryButtonLabel: 'Good Night',
  backgroundColor: { red: 15, green: 23, blue: 42 },
  titleColor: { red: 255, green: 255, blue: 255 },
})

// Use the configured shield
await DeviceActivityAndroid.startSession(
  {
    id: 'work-session',
    blockedPackages: ['com.instagram.android'],
    endsAt: Date.now() + 8 * 60 * 60 * 1000,
  },
  undefined, // no inline style
  'work-shield' // use pre-configured shield
)
```

#### `updateShielding(configId: string, style: ShieldStyle): Promise<void>`

Updates an existing shield configuration.

```typescript
await DeviceActivityAndroid.updateShielding('work-shield', {
  title: 'Deep Work Mode',
  subtitle: 'Focus time - all distractions blocked',
  primaryButtonLabel: 'Return to Focus',
})
```

#### `removeShielding(configId: string): Promise<boolean>`

Removes a shield configuration.

```typescript
const removed = await DeviceActivityAndroid.removeShielding('old-shield')
if (removed) {
  console.log('Shield configuration removed')
}
```

#### `getShieldingConfigurations(): Promise<{ [configId: string]: ShieldStyle }>`

Gets all registered shield configurations.

```typescript
const configs = await DeviceActivityAndroid.getShieldingConfigurations()
console.log('Available shields:', Object.keys(configs))

// Example: Let user select a shield style
Object.entries(configs).forEach(([id, style]) => {
  console.log(`${id}: ${style.title}`)
})
```

#### `ensureIconCached(imagePath: string, version: number): Promise<string | null>`

Copies a custom icon from React Native assets to internal storage for use in shield configurations.

**Setup:**

```typescript
// 1. Create a constants file
// constants.ts
export const ICON_VERSION_NUMBER = 1
export const ICON_ASSET_PATH = './assets/focus-icon.png'
export const DEFAULT_ICON_SIZE = 64 // in dp

// 2. Create a helper function
// utils/iconHelper.ts
import { ensureIconCached } from '@breakr/react-native-device-activity-android'
import { ICON_ASSET_PATH, ICON_VERSION_NUMBER } from '../constants'

export async function cacheCustomIcon(): Promise<string | null> {
  try {
    const cachedPath = await DeviceActivityAndroid.ensureIconCached(
      ICON_ASSET_PATH,
      ICON_VERSION_NUMBER
    )
    if (cachedPath) {
      console.log('Icon cached at:', cachedPath)
    }
    return cachedPath
  } catch (error) {
    console.error('Failed to cache icon:', error)
    return null
  }
}

// 3. Cache on app startup
// App.tsx
import { cacheCustomIcon } from './utils/iconHelper'
import { ICON_ASSET_PATH, DEFAULT_ICON_SIZE } from './constants'

function App() {
  useEffect(() => {
    cacheCustomIcon()
  }, [])

  const startCustomSession = async () => {
    await DeviceActivityAndroid.startSession(
      {
        id: 'branded-session',
        blockedPackages: ['com.instagram.android'],
        endsAt: Date.now() + 30 * 60 * 1000,
      },
      {
        title: 'Focus Mode',
        subtitle: 'Stay on track',
        primaryImagePath: ICON_ASSET_PATH,
        iconSize: DEFAULT_ICON_SIZE,
        backgroundColor: { red: 255, green: 253, blue: 249 },
      }
    )
  }
}
```

**Icon Versioning:**

When you update your icon asset, increment the version number to invalidate the cache:

```typescript
// constants.ts
export const ICON_VERSION_NUMBER = 2 // Changed from 1 to 2

// The library will automatically:
// 1. Detect the new version
// 2. Delete old cached files (breakr-icon-v1.png)
// 3. Cache the new icon (breakr-icon-v2.png)
```

---

### Event Handling

#### `addListener(callback: (event: BlockEvent) => void): { remove(): void }`

Adds a listener for block events.

**Basic Example:**

```typescript
useEffect(() => {
  const subscription = DeviceActivityAndroid.addListener(event => {
    console.log('Event received:', event.type)
  })

  return () => subscription.remove()
}, [])
```

**Complete Event Handler:**

```typescript
import { BlockEvent } from '@breakr/react-native-device-activity-android'

function useDeviceActivityEvents() {
  const [events, setEvents] = useState<BlockEvent[]>([])

  useEffect(() => {
    const subscription = DeviceActivityAndroid.addListener(event => {
      setEvents(prev => [...prev, event])

      switch (event.type) {
        case 'block_shown':
          console.log(`Block shown for session: ${event.sessionId}`)
          // Track analytics
          analytics.track('BlockShown', { sessionId: event.sessionId })
          break

        case 'block_dismissed':
          console.log('User dismissed block screen')
          // User clicked "Return to Focus" button
          // They're being redirected back to your app
          break

        case 'app_attempt':
          console.log(`User tried to open: ${event.packageName}`)
          // Track which apps users try to access most
          analytics.track('AppAttempt', { app: event.packageName })
          break

        case 'service_state':
          console.log(`Service ${event.running ? 'started' : 'stopped'}`)
          if (!event.running) {
            Alert.alert('Service Stopped', 'Please re-enable the accessibility service')
          }
          break

        case 'temporary_unblock_ended':
          console.log('Temporary unblock period has ended')
          showNotification('Blocking resumed')
          break

        case 'session_expired':
          console.log(`Session expired: ${event.sessionId}`)
          onSessionComplete(event.sessionId)
          break
      }
    })

    return () => subscription.remove()
  }, [])

  return events
}

// Usage in component
function FocusSessionTracker() {
  const events = useDeviceActivityEvents()

  const blockAttempts = events.filter(e => e.type === 'app_attempt').length
  const blocksShown = events.filter(e => e.type === 'block_shown').length

  return (
    <View>
      <Text>Block Attempts: {blockAttempts}</Text>
      <Text>Blocks Shown: {blocksShown}</Text>
    </View>
  )
}
```

**Event Types:**

```typescript
type BlockEvent =
  | { type: 'block_shown'; sessionId: string }
  | { type: 'block_dismissed'; sessionId?: string }
  | { type: 'secondary_action'; sessionId?: string }
  | { type: 'app_attempt'; packageName: string; timestamp: number }
  | { type: 'service_state'; running: boolean }
  | { type: 'temporary_unblock_ended' }
  | { type: 'session_expired'; sessionId: string }
```

---

## Common Use Cases

### 1. Study/Focus App

```typescript
function StudyMode() {
  const [sessionActive, setSessionActive] = useState(false)
  const [selectedApps, setSelectedApps] = useState<string[]>([])

  const startStudySession = async (durationMinutes: number) => {
    await DeviceActivityAndroid.startSession(
      {
        id: 'study-mode',
        blockedPackages: selectedApps,
        endsAt: Date.now() + durationMinutes * 60 * 1000,
      },
      {
        title: 'Study Mode Active',
        subtitle: `Blocking ${selectedApps.length} apps for ${durationMinutes} minutes`,
        primaryButtonLabel: 'Back to Studies',
      }
    )
    setSessionActive(true)
  }

  return (
    <View>
      <AppSelector onAppsSelected={setSelectedApps} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button title="25 min" onPress={() => startStudySession(25)} />
        <Button title="50 min" onPress={() => startStudySession(50)} />
        <Button title="90 min" onPress={() => startStudySession(90)} />
      </View>
    </View>
  )
}
```

### 2. Digital Detox / Bedtime Mode

```typescript
function BedtimeMode() {
  const setupBedtime = async () => {
    const now = new Date()
    const bedtime = new Date()
    bedtime.setHours(22, 0, 0, 0) // 10 PM

    const wakeup = new Date()
    wakeup.setDate(wakeup.getDate() + 1)
    wakeup.setHours(7, 0, 0, 0) // 7 AM next day

    await DeviceActivityAndroid.startSession(
      {
        id: 'bedtime-routine',
        blockedPackages: [
          'com.instagram.android',
          'com.twitter.android',
          'com.facebook.katana',
          'com.tiktok.lite.go',
          'com.google.android.youtube',
        ],
        startsAt: bedtime.getTime(),
        endsAt: wakeup.getTime(),
      },
      {
        title: '😴 Bedtime Mode',
        subtitle: 'Time to wind down. Social media will be available at 7 AM.',
        primaryButtonLabel: 'Good Night',
        backgroundColor: { red: 15, green: 23, blue: 42 },
        titleColor: { red: 255, green: 255, blue: 255 },
      }
    )
  }

  return (
    <Button title="Enable Bedtime Mode (10 PM - 7 AM)" onPress={setupBedtime} />
  )
}
```

### 3. Work Hours Enforcement

```typescript
function WorkHoursBlocker() {
  const setupWorkHours = async () => {
    const today = new Date()

    // 9 AM - 5 PM Monday through Friday
    const startTime = new Date(today.setHours(9, 0, 0, 0))
    const endTime = new Date(today.setHours(17, 0, 0, 0))

    await DeviceActivityAndroid.configureShielding('work-mode', {
      title: 'Work Hours',
      subtitle: 'Social media blocked during work (9 AM - 5 PM)',
      primaryButtonLabel: 'Back to Work',
    })

    await DeviceActivityAndroid.startSession(
      {
        id: 'work-hours-block',
        blockedPackages: [
          'com.instagram.android',
          'com.twitter.android',
          'com.facebook.katana',
          'com.tiktok.lite.go',
        ],
        startsAt: startTime.getTime(),
        endsAt: endTime.getTime(),
        reason: 'Work hours focus',
      },
      undefined,
      'work-mode'
    )
  }

  return <Button title="Block Social Media (9-5)" onPress={setupWorkHours} />
}
```

### 4. Parental Controls

```typescript
function ParentalControlsMode() {
  const setupChildProtection = async () => {
    // Block all apps except essential ones
    await DeviceActivityAndroid.startSession({
      id: 'child-protection',
      allowPackages: [
        'com.google.android.apps.messaging', // Messages
        'com.android.phone',                  // Phone
        'com.google.android.apps.maps',       // Maps
        'com.android.settings',               // Settings
        // Educational apps
        'com.duolingo',
        'com.khanacademy.android',
      ],
      endsAt: Date.now() + 12 * 60 * 60 * 1000, // 12 hours
    }, {
      title: 'Screen Time Limited',
      subtitle: 'Only approved apps are accessible',
      primaryButtonLabel: 'OK',
    })
  }

  return <Button title="Enable Child Protection" onPress={setupChildProtection} />
}
```

### 5. Habit Building - Progressive App Blocking

```typescript
function ProgressiveBlocking() {
  const [appUsageTime, setAppUsageTime] = useState<{[key: string]: number}>({})

  useEffect(() => {
    // Check usage every minute
    const interval = setInterval(async () => {
      const currentApp = await DeviceActivityAndroid.getCurrentForegroundApp()

      // Track time spent
      setAppUsageTime(prev => ({
        ...prev,
        [currentApp.packageName]: (prev[currentApp.packageName] || 0) + 1,
      }))

      // Block app if used for more than 30 minutes
      const distractingApps = ['com.instagram.android', 'com.twitter.android']
      if (distractingApps.includes(currentApp.packageName)) {
        const timeSpent = appUsageTime[currentApp.packageName] || 0

        if (timeSpent >= 30) {
          await DeviceActivityAndroid.startSession({
            id: `limit-${currentApp.packageName}`,
            blockedPackages: [currentApp.packageName],
            endsAt: Date.now() + 60 * 60 * 1000, // Cool down for 1 hour
          }, {
            title: 'Daily Limit Reached',
            subtitle: `You've used this app for 30 minutes today`,
            primaryButtonLabel: 'Take a Break',
          })
        }
      }
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [appUsageTime])

  return (
    <View>
      <Text>App Usage Tracker</Text>
      {Object.entries(appUsageTime).map(([pkg, minutes]) => (
        <Text key={pkg}>{pkg}: {minutes} minutes</Text>
      ))}
    </View>
  )
}
```

---

## Best Practices

### 1. Always Check Permissions First

```typescript
async function safeStartSession(config: SessionConfig, style?: ShieldStyle) {
  const permissions = await DeviceActivityAndroid.getPermissionsStatus()

  if (!permissions.accessibilityEnabled || !permissions.overlayEnabled || !permissions.usageAccessEnabled) {
    Alert.alert(
      'Permissions Required',
      'Please grant all required permissions first',
      [{ text: 'Grant Permissions', onPress: () => navigateToPermissions() }]
    )
    return false
  }

  await DeviceActivityAndroid.startSession(config, style)
  return true
}
```

### 2. Handle Service State Changes

```typescript
useEffect(() => {
  const sub = DeviceActivityAndroid.addListener(event => {
    if (event.type === 'service_state' && !event.running) {
      // Service was disabled by user or killed by system
      showNotification('Accessibility service stopped', 'Please re-enable it')
    }
  })
  return () => sub.remove()
}, [])
```

### 3. Provide Emergency Exit

Always give users a way to stop blocking in case of emergency:

```typescript
function EmergencyStop() {
  const stopAllBlocking = async () => {
    Alert.alert(
      'Stop All Blocking?',
      'This will end all active focus sessions',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop All',
          style: 'destructive',
          onPress: async () => {
            await DeviceActivityAndroid.stopAllSessions()
            Alert.alert('Done', 'All blocking stopped')
          },
        },
      ]
    )
  }

  return (
    <Button
      title="Emergency Stop (Stop All Blocking)"
      onPress={stopAllBlocking}
      color="red"
    />
  )
}
```

### 4. Use Meaningful Session IDs

```typescript
// Bad
await DeviceActivityAndroid.startSession({ id: 'session1', ... })

// Good
await DeviceActivityAndroid.startSession({ id: 'morning-focus-2024-01-15', ... })
await DeviceActivityAndroid.startSession({ id: `study-${new Date().toISOString()}`, ... })
```

### 5. Track Analytics

```typescript
DeviceActivityAndroid.addListener(event => {
  switch (event.type) {
    case 'app_attempt':
      analytics.track('Blocked App Attempt', {
        app: event.packageName,
        timestamp: event.timestamp,
      })
      break
    case 'block_dismissed':
      analytics.track('Block Dismissed', { sessionId: event.sessionId })
      break
    case 'session_expired':
      analytics.track('Session Completed', { sessionId: event.sessionId })
      break
  }
})
```

### 6. Graceful Degradation

```typescript
async function startSessionWithFallback() {
  try {
    await DeviceActivityAndroid.startSession(/* ... */)
  } catch (error) {
    if (error.message.includes('accessibility')) {
      // Guide user to enable accessibility service
      navigateToPermissions()
    } else if (error.message.includes('overlay')) {
      // Guide user to enable overlay permission
      navigateToPermissions()
    } else {
      // Generic error handling
      Alert.alert('Error', 'Failed to start session. Please try again.')
    }
  }
}
```

---

## Troubleshooting

### Block Screen Not Showing

**Symptoms**: Session starts successfully but block screen doesn't appear when opening blocked apps.

**Solutions**:

1. Check overlay permission:
```typescript
const { overlayEnabled } = await DeviceActivityAndroid.getPermissionsStatus()
if (!overlayEnabled) {
  await DeviceActivityAndroid.requestOverlayPermission()
}
```

2. On Android 14+, check for additional overlay restrictions
3. Verify accessibility service is running:
```typescript
const isRunning = await DeviceActivityAndroid.isServiceRunning()
```

### Service Keeps Stopping

**Symptoms**: Accessibility service stops working after a while.

**Solutions**:

1. Disable battery optimization for your app
2. Add your app to the "Never sleeping apps" list (Samsung devices)
3. Whitelist your app in battery saver settings

```typescript
// Detect when service stops
DeviceActivityAndroid.addListener(event => {
  if (event.type === 'service_state' && !event.running) {
    showNotification('Please disable battery optimization for this app')
  }
})
```

### "Native Module Not Found"

**Symptoms**: Error saying the native module can't be found.

**Solution**: This library requires a dev build.

```bash
# Clean and rebuild
expo prebuild -p android --clean
expo run:android
```

### Sessions Not Blocking After Device Restart

**Symptoms**: Sessions are lost after device restarts.

**Solution**: Sessions are stored in memory. You need to restore them:

```typescript
// On app startup, restore sessions from persistent storage
async function restoreSessions() {
  const savedSessions = await AsyncStorage.getItem('active-sessions')
  if (savedSessions) {
    const sessions = JSON.parse(savedSessions)
    for (const session of sessions) {
      await DeviceActivityAndroid.startSession(session.config, session.style)
    }
  }
}
```

### Logcat Debugging

```bash
# View all logs from the library
adb logcat | grep -i "RNDeviceActivity\|BlockerAccessibility"

# View only errors
adb logcat *:E | grep -i "deviceactivity"

# Save logs to file
adb logcat -d > device_activity_logs.txt
```

---

## Testing Package Names

For development and testing, here are common app package names:

**Social Media**:
- Instagram: `com.instagram.android`
- Twitter/X: `com.twitter.android`
- Facebook: `com.facebook.katana`
- TikTok: `com.zhiliaoapp.musically`
- Snapchat: `com.snapchat.android`
- LinkedIn: `com.linkedin.android`
- Reddit: `com.reddit.frontpage`

**Entertainment**:
- YouTube: `com.google.android.youtube`
- Netflix: `com.netflix.mediaclient`
- Spotify: `com.spotify.music`
- Twitch: `tv.twitch.android.app`

**Games**:
- Candy Crush: `com.king.candycrushsaga`
- Pokemon Go: `com.nianticlabs.pokemongo`

**Find Package Names on Your Device**:

```bash
# List all installed packages
adb shell pm list packages

# Find specific app
adb shell pm list packages | grep instagram

# Get package name of current foreground app
adb shell dumpsys window | grep mCurrentFocus
```

---

## Support

- **Documentation**: [Full API Docs](./packages/device-activity-android/README.md)
- **GitHub Issues**: [Report bugs or request features](https://github.com/breakr/react-native-device-activity-android/issues)
- **Example App**: See [apps/example](./apps/example) for a complete working demo

---

## Google Play Compliance

**IMPORTANT**: Before publishing to Google Play, review the [Accessibility Services Policy](https://support.google.com/googleplay/android-developer/answer/10964491).

You MUST:
1. Provide a clear privacy policy explaining accessibility usage
2. Create a video demonstrating the feature
3. Only use accessibility for the declared purpose (digital wellbeing)
4. NOT collect data from other apps
5. NOT automate user actions

✅ **Acceptable**: Digital wellbeing, focus apps, parental controls, self-imposed limits
❌ **Not Acceptable**: Data collection, automation, background surveillance

---

## Next Steps

1. Explore the [example app](./apps/example) for complete working code
2. Read the [full API reference](./packages/device-activity-android/README.md)
3. Join our [GitHub Discussions](https://github.com/breakr/react-native-device-activity-android/discussions)

Happy building! 🚀
