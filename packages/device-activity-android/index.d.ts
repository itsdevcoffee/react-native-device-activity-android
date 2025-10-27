export type PackageId = string

export type SessionConfig = {
  id: string
  blockedPackages: PackageId[]
  allowPackages?: PackageId[]
  startsAt?: number // ms epoch
  endsAt?: number // ms epoch
  reason?: string
}

export type RGBColor = {
  red: number
  green: number
  blue: number
  alpha?: number
}

export type BackgroundBlurStyle = 'light' | 'dark' | 'none'

export type ShieldStyle = {
  // Text content
  title?: string
  subtitle?: string
  /** @deprecated Use subtitle instead */
  message?: string

  // Button configuration
  primaryButtonLabel?: string
  secondaryButtonLabel?: string
  /** @deprecated Use primaryButtonLabel instead */
  ctaText?: string

  // Text colors
  titleColor?: RGBColor
  subtitleColor?: RGBColor
  primaryButtonLabelColor?: RGBColor
  secondaryButtonLabelColor?: RGBColor

  // Background colors
  backgroundColor?: RGBColor
  primaryButtonBackgroundColor?: RGBColor
  secondaryButtonBackgroundColor?: RGBColor

  // Icon configuration
  iconTint?: RGBColor
  primaryImagePath?: string
  iconSystemName?: string
  iconSize?: number // Size in dp, defaults to 64dp if not specified

  // Blur effect (Android: light, dark, or none)
  backgroundBlurStyle?: BackgroundBlurStyle
}

export type PermissionsStatus = {
  accessibilityEnabled: boolean
  overlayEnabled: boolean
  usageAccessEnabled: boolean
  scheduleExactAlarmEnabled: boolean
}

export type ForegroundApp = {
  packageName: string | null
  timestamp: number
}

export type BlockEvent =
  | { type: 'block_shown'; sessionId: string; ts: number }
  | { type: 'block_dismissed'; sessionId: string; ts: number }
  | { type: 'secondary_action'; sessionId: string; ts: number }
  | { type: 'app_attempt'; packageName: string; sessionId: string; ts: number }
  | { type: 'service_state'; running: boolean; ts: number }
  | { type: 'temporary_unblock_ended'; ts: number }
  | { type: 'session_expired'; sessionId: string; ts: number }

export type BlockStatus = {
  isBlocking: boolean
  activeSessionCount: number
  activeSessions: string[]
  isServiceRunning: boolean
  currentForegroundApp: string | null
  timestamp: number
}

export type ShieldConfigurationMap = {
  [configId: string]: ShieldStyle
}

declare const DeviceActivityAndroid: {
  getPermissionsStatus(): Promise<PermissionsStatus>
  requestAccessibilityPermission(): Promise<void>
  requestOverlayPermission(): Promise<void>
  requestUsageAccessPermission(): Promise<void>
  requestScheduleExactAlarmPermission(): Promise<void>
  startSession(
    config: SessionConfig,
    style?: ShieldStyle,
    shieldId?: string
  ): Promise<void>
  updateSession(
    config: Partial<SessionConfig> & { id: string }
  ): Promise<void>
  stopSession(sessionId: string): Promise<void>
  stopAllSessions(): Promise<void>
  getCurrentForegroundApp(): Promise<ForegroundApp>
  isServiceRunning(): Promise<boolean>
  getInstalledApps(
    includeIcons?: boolean
  ): Promise<
    Array<{
      packageName: string
      name: string
      category: number
      icon?: string
    }>
  >
  blockAllApps(
    sessionId?: string,
    endsAt?: number,
    style?: ShieldStyle
  ): Promise<void>
  unblockAllApps(): Promise<void>
  getBlockStatus(): Promise<BlockStatus>
  temporaryUnblock(durationSeconds: number): Promise<void>
  temporaryBlock(durationSeconds: number, style?: ShieldStyle): Promise<void>
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
  >
  configureShielding(configId: string, style: ShieldStyle): Promise<void>
  updateShielding(configId: string, style: ShieldStyle): Promise<void>
  removeShielding(configId: string): Promise<boolean>
  getShieldingConfigurations(): Promise<ShieldConfigurationMap>
  ensureIconCached(imagePath: string, version: number): Promise<string | null>
  addListener(cb: (e: BlockEvent) => void): { remove(): void }
}

export default DeviceActivityAndroid

// App category utilities (from appCategories.ts)
export enum AppCategory {
  UNDEFINED = -1,
  GAME = 0,
  AUDIO = 1,
  VIDEO = 2,
  IMAGE = 3,
  SOCIAL = 4,
  NEWS = 5,
  MAPS = 6,
  PRODUCTIVITY = 7,
}

export const APP_CATEGORY_LABELS: Record<AppCategory, string>
export function getCategoryLabel(categoryId: number): string
export function groupAppsByCategory<T extends { category?: number }>(
  apps: T[]
): Map<AppCategory, T[]>
export function getCategoryCounts<T extends { category?: number }>(
  apps: T[]
): Record<AppCategory, number>
export function getCategoryLabelWithCount(
  categoryId: AppCategory,
  count: number
): string
export const CATEGORY_DISPLAY_ORDER: AppCategory[]
export const DEFAULT_CATEGORY_ORDER: string[]
export function getCategoryIdFromName(name: string): AppCategory | null
export function deduplicateCategoryNames(names: string[]): string[]
