You are an expert RN/Expo + Android native dev. Generate a complete monorepo that contains:

**Goal:** A React Native + Expo library that mirrors the iOS “DeviceActivity” mental model but for Android using Accessibility Service + overlay + usage access. Include a working Expo example app that consumes the library. The library should be Expo-compatible via a config plugin (dev build required).

### High-level requirements

* Repo name: `react-native-device-activity-android`
* Monorepo npm with two packages:

  * `packages/device-activity-android` → the library
  * `apps/example` → Expo example app (use the latest Expo SDK at generation time)
* TypeScript everywhere. Lint + basic CI config.
* Provide a top-level `README.md` with quickstart, and a library `README.md`.
* Keep code minimal but runnable; compile-clean.

### Library: API surface (TypeScript)

Create `packages/device-activity-android/src/index.ts` + `index.d.ts` that export:

```ts
export type PackageId = string;

export type SessionConfig = {
  id: string;
  blockedPackages: PackageId[];
  allowPackages?: PackageId[];
  startsAt?: number; // ms epoch
  endsAt?: number;   // ms epoch
  reason?: string;
};

export type ShieldStyle = { title?: string; message?: string; ctaText?: string; };

export type PermissionsStatus = {
  accessibilityEnabled: boolean;
  overlayEnabled: boolean;
  usageAccessEnabled: boolean;
};

export type ForegroundApp = { packageName: string | null; timestamp: number };

export type BlockEvent =
  | { type: 'block_shown'; sessionId: string; ts: number }
  | { type: 'block_dismissed'; sessionId: string; ts: number }
  | { type: 'app_attempt'; packageName: string; sessionId: string; ts: number }
  | { type: 'service_state'; running: boolean; ts: number };

declare const DeviceActivityAndroid: {
  getPermissionsStatus(): Promise<PermissionsStatus>;
  requestAccessibilityPermission(): Promise<void>;
  requestOverlayPermission(): Promise<void>;
  requestUsageAccessPermission(): Promise<void>;
  startSession(config: SessionConfig, style?: ShieldStyle): Promise<void>;
  updateSession(config: Partial<SessionConfig> & { id: string }): Promise<void>;
  stopSession(sessionId: string): Promise<void>;
  stopAllSessions(): Promise<void>;
  getCurrentForegroundApp(): Promise<ForegroundApp>;
  isServiceRunning(): Promise<boolean>;
  addListener(cb: (e: BlockEvent) => void): { remove(): void };
};
export default DeviceActivityAndroid;
```

In `src/index.ts`, implement the RN bridge wrapper using `NativeModules` + `NativeEventEmitter` with module name `RNDeviceActivityAndroid` and event `"RNDeviceActivityAndroidEvents"`.

### Library: Android native code (Kotlin)

Create under `packages/device-activity-android/android/src/main/java/com/breakr/deviceactivity/`:

1. `SessionState.kt`:

```kotlin
package com.breakr.deviceactivity
data class SessionState(
  val id: String,
  val blocked: Set<String>,
  val allow: Set<String>,
  val startsAt: Long?,
  val endsAt: Long?
) {
  fun isActive(now: Long): Boolean {
    val afterStart = (startsAt == null || now >= startsAt)
    val beforeEnd = (endsAt == null || now <= endsAt)
    return afterStart && beforeEnd
  }
  fun shouldBlock(pkg: String): Boolean {
    if (allow.isNotEmpty()) return !allow.contains(pkg)
    return blocked.contains(pkg)
  }
}
```

2. `BlockerAccessibilityService.kt`:

* Extends `AccessibilityService`
* Listens to `TYPE_WINDOW_STATE_CHANGED`
* If the foreground package is blocked in any active session, show an overlay view; else hide it.
* Overlay type: `TYPE_ACCESSIBILITY_OVERLAY` on API 29+, else `TYPE_APPLICATION_OVERLAY`.

3. `RNDeviceActivityAndroidModule.kt`:

* Name: `RNDeviceActivityAndroid`
* Methods:

  * `getPermissionsStatus`, `requestAccessibilityPermission`, `requestOverlayPermission`, `requestUsageAccessPermission`
  * `startSession`, `updateSession`, `stopSession`, `stopAllSessions`
  * `getCurrentForegroundApp` (stub best-effort), `isServiceRunning`
* Static helper to emit JS events via `DeviceEventManagerModule`.

4. `RNDeviceActivityAndroidPackage.kt` to register the module.

5. Android resources:

* `res/xml/accessibility_service_config.xml` (accessibility config with `typeWindowStateChanged`)
* `res/layout/block_view.xml` (simple full-screen dark scrim with title/message TextViews)

6. AndroidManifest (library manifest snippet):

* `<uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />`
* `<uses-permission android:name="android.permission.PACKAGE_USAGE_STATS" tools:ignore="ProtectedPermissions" />`
* `<service ... android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE" exported="true">` with proper `<intent-filter>` and `<meta-data android:resource="@xml/accessibility_service_config" />`

### Library: Expo config plugin

Create `packages/device-activity-android/plugin/app.plugin.ts`:

* Injects the two uses-permissions.
* Adds the `<service>` block.
* Ensures `@xml/accessibility_service_config` is referenced.
* Export default plugin.
  In `packages/device-activity-android/package.json`, add `"expo": { "plugin": "./plugin/app.plugin" }`.

### Library: packaging

* `package.json` with `"name": "@breakr/react-native-device-activity-android"`, `"main": "src/index.ts"`, `"types": "index.d.ts"`.
* Babel/tsconfig for RN.
* `README.md` with install + usage + Play policy notes, including:

  * Requires **dev build** (`expo prebuild`) or bare.
  * Users must enable Accessibility, “Draw over apps,” and Usage Access.

### Example app (Expo)

Create `apps/example` with the latest Expo SDK.

* Add a simple screen “Android Device Activity Demo” with:

  * Three toggles that show current permission status and buttons to open settings:

    * Enable Accessibility
    * Allow Draw Over Apps
    * Allow Usage Access
  * Session controls:

    * Text inputs for `blockedPackages` (comma-separated)
    * Buttons: “Start 5-min Focus”, “Stop Focus”
  * Event log (FlatList) subscribed to `addListener`, showing `app_attempt`, `block_shown`, etc.
* In `app.json`, include the plugin:

  ```json
  { "expo": { "plugins": ["@breakr/react-native-device-activity-android/plugin"] } }
  ```
* Show example usage:

  ```ts
  import DeviceActivityAndroid from '@breakr/react-native-device-activity-android';
  // ensurePermissions(), startSession({ id: 'focus', blockedPackages: [...] , endsAt: Date.now() + 5*60*1000 })
  ```

### Scripts & dev instructions

Top-level:

* `yarn` (or pnpm) workspaces setup; root `package.json` with `"workspaces": ["packages/*", "apps/*"]`.
* Root `README.md` with:

  1. `yarn`
  2. `cd apps/example`
  3. `expo prebuild -p android`
  4. `expo run:android`
* Provide `eslint`, `prettier`, and a minimal GitHub Actions CI that checks TypeScript builds.

### Acceptance Criteria

* `yarn` installs monorepo.
* `apps/example` builds to Android emulator/device with `expo run:android` (after `expo prebuild`) and shows UI.
* Tapping “Start 5-min Focus” with a blocked package like `com.instagram.android` visibly shows the overlay when that app opens.
* Events appear in the example app log.
* Code compiles clean; no missing imports; sane null checks.
* Clear comments on any OS/version caveats (Android 14/15 overlay tightening, Accessibility disclosure & Play policy notes).
* No iOS code is required in this package; Android-only library is fine.

Now generate all files with content in the proper folders, ready to run. Include any minimal Gradle/kts config needed for the Android library module under `packages/device-activity-android/android`. If something requires a small stub (like icons), include it. Keep everything as concise as possible while being fully runnable.
