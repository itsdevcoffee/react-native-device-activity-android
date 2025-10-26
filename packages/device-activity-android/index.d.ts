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

export type BlockStatus = {
  isBlocking: boolean
  activeSessionCount: number
  activeSessions: string[]
  isServiceRunning: boolean
  currentForegroundApp: string | null
  timestamp: number
}

declare const DeviceActivityAndroid: {
  getPermissionsStatus(): Promise<PermissionsStatus>
  requestAccessibilityPermission(): Promise<void>
  requestOverlayPermission(): Promise<void>
  requestUsageAccessPermission(): Promise<void>
  requestScheduleExactAlarmPermission(): Promise<void>
  startSession(config: SessionConfig, style?: ShieldStyle): Promise<void>
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
  addListener(cb: (e: BlockEvent) => void): { remove(): void }
}

export default DeviceActivityAndroid
