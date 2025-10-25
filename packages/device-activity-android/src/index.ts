import { NativeModules, NativeEventEmitter } from 'react-native'
import type {
  PackageId,
  SessionConfig,
  ShieldStyle,
  PermissionsStatus,
  ForegroundApp,
  BlockEvent,
} from '../index'

const MODULE_NAME = 'RNDeviceActivityAndroid'
const EVENT_NAME = 'RNDeviceActivityAndroidEvents'

const nativeModule = NativeModules[MODULE_NAME]

if (!nativeModule) {
  throw new Error(
    `The native module '${MODULE_NAME}' is not available. ` +
      'Ensure you have run "expo prebuild" and rebuilt the app.'
  )
}

const eventEmitter = new NativeEventEmitter(nativeModule)

/**
 * Device Activity Android API
 *
 * Provides Android-side screen blocking functionality similar to iOS DeviceActivity APIs.
 * Uses Accessibility Service + Overlay + Usage Access permissions.
 *
 * @example
 * ```ts
 * import DeviceActivityAndroid from '@breakrr/react-native-device-activity-android'
 *
 * // Check permissions
 * const status = await DeviceActivityAndroid.getPermissionsStatus()
 *
 * // Start a blocking session
 * await DeviceActivityAndroid.startSession({
 *   id: 'focus-session',
 *   blockedPackages: ['com.instagram.android', 'com.twitter.android'],
 *   endsAt: Date.now() + 5 * 60 * 1000, // 5 minutes
 * })
 * ```
 */
const DeviceActivityAndroid = {
  /**
   * Get current permission status for all required permissions.
   * @returns Promise resolving to permission status object
   */
  getPermissionsStatus(): Promise<PermissionsStatus> {
    return nativeModule.getPermissionsStatus()
  },

  /**
   * Request Accessibility Service permission.
   * Opens system settings for the user to enable accessibility service.
   */
  requestAccessibilityPermission(): Promise<void> {
    return nativeModule.requestAccessibilityPermission()
  },

  /**
   * Request overlay ("Draw over other apps") permission.
   * Opens system settings for the user to grant overlay permission.
   */
  requestOverlayPermission(): Promise<void> {
    return nativeModule.requestOverlayPermission()
  },

  /**
   * Request Usage Access permission.
   * Opens system settings for the user to grant usage access.
   */
  requestUsageAccessPermission(): Promise<void> {
    return nativeModule.requestUsageAccessPermission()
  },

  /**
   * Start a new blocking session.
   *
   * @param config - Session configuration including blocked packages and time window
   * @param style - Optional styling for the block overlay screen
   */
  startSession(config: SessionConfig, style?: ShieldStyle): Promise<void> {
    return nativeModule.startSession(config, style || {})
  },

  /**
   * Update an existing session configuration.
   *
   * @param config - Partial session config with required id field
   */
  updateSession(
    config: Partial<SessionConfig> & { id: string }
  ): Promise<void> {
    return nativeModule.updateSession(config)
  },

  /**
   * Stop a specific blocking session by ID.
   *
   * @param sessionId - ID of the session to stop
   */
  stopSession(sessionId: string): Promise<void> {
    return nativeModule.stopSession(sessionId)
  },

  /**
   * Stop all active blocking sessions.
   */
  stopAllSessions(): Promise<void> {
    return nativeModule.stopAllSessions()
  },

  /**
   * Get the current foreground app package name.
   * This is a best-effort method and may return null if unable to determine.
   *
   * @returns Promise resolving to foreground app info
   */
  getCurrentForegroundApp(): Promise<ForegroundApp> {
    return nativeModule.getCurrentForegroundApp()
  },

  /**
   * Check if the accessibility service is currently running.
   *
   * @returns Promise resolving to true if service is running
   */
  isServiceRunning(): Promise<boolean> {
    return nativeModule.isServiceRunning()
  },

  /**
   * Get list of installed user-facing applications.
   * Filters out system apps and returns only apps with launcher activities.
   * Includes updated system apps (like pre-installed apps from Play Store).
   *
   * @param includeIcons - Whether to include base64-encoded app icons (default: false)
   * @returns Promise resolving to array of installed apps with category metadata
   *
   * @example
   * ```ts
   * const apps = await DeviceActivityAndroid.getInstalledApps(true)
   * console.log(`Found ${apps.length} apps`)
   * console.log(`First app category: ${apps[0].category}`)
   * ```
   */
  getInstalledApps(includeIcons: boolean = false): Promise<
    Array<{
      packageName: string
      name: string
      category: number
      icon?: string
    }>
  > {
    return nativeModule.getInstalledApps(includeIcons)
  },

  /**
   * DEBUG: Get comprehensive metadata for all installed apps.
   * Returns extensive metadata including version, install dates, categories, paths, etc.
   * Use this to explore available data and determine what to expose in the public API.
   *
   * @returns Promise resolving to array of app metadata objects
   *
   * @example
   * ```ts
   * const metadata = await DeviceActivityAndroid.getAppMetadataDebug()
   * console.log(JSON.stringify(metadata, null, 2))
   * ```
   */
  getAppMetadataDebug(): Promise<
    Array<{
      packageName: string
      name: string
      versionName?: string
      versionCode?: string
      firstInstallTime?: number
      lastUpdateTime?: number
      isSystemApp: boolean
      isUpdatedSystemApp: boolean
      enabled: boolean
      hasLauncherActivity: boolean
      sourceDir: string
      dataDir: string
      uid: number
      category?: number
    }>
  > {
    return nativeModule.getAppMetadataDebug()
  },

  /**
   * Add a listener for block events.
   * Events include: block_shown, block_dismissed, app_attempt, service_state
   *
   * @param callback - Function to call when events occur
   * @returns Subscription object with remove() method
   *
   * @example
   * ```ts
   * const subscription = DeviceActivityAndroid.addListener((event) => {
   *   if (event.type === 'block_shown') {
   *     console.log('Block shown for session:', event.sessionId)
   *   }
   * })
   *
   * // Later: subscription.remove()
   * ```
   */
  addListener(callback: (event: BlockEvent) => void): { remove(): void } {
    const subscription = eventEmitter.addListener(EVENT_NAME, callback)
    return {
      remove: () => subscription.remove(),
    }
  },
}

export default DeviceActivityAndroid

// Re-export types for convenience
export type {
  PackageId,
  SessionConfig,
  ShieldStyle,
  PermissionsStatus,
  ForegroundApp,
  BlockEvent,
}

// Re-export app category utilities
export {
  AppCategory,
  APP_CATEGORY_LABELS,
  getCategoryLabel,
  groupAppsByCategory,
  getCategoryCounts,
  getCategoryLabelWithCount,
  CATEGORY_DISPLAY_ORDER,
} from './appCategories'
