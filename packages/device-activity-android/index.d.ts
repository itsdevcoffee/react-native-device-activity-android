export type PackageId = string

export type SessionConfig = {
  id: string
  blockedPackages: PackageId[]
  allowPackages?: PackageId[]
  startsAt?: number // ms epoch
  endsAt?: number // ms epoch
  reason?: string
}

export type ShieldStyle = {
  title?: string
  message?: string
  ctaText?: string
}

export type PermissionsStatus = {
  accessibilityEnabled: boolean
  overlayEnabled: boolean
  usageAccessEnabled: boolean
}

export type ForegroundApp = {
  packageName: string | null
  timestamp: number
}

export type BlockEvent =
  | { type: 'block_shown'; sessionId: string; ts: number }
  | { type: 'block_dismissed'; sessionId: string; ts: number }
  | { type: 'app_attempt'; packageName: string; sessionId: string; ts: number }
  | { type: 'service_state'; running: boolean; ts: number }

declare const DeviceActivityAndroid: {
  getPermissionsStatus(): Promise<PermissionsStatus>
  requestAccessibilityPermission(): Promise<void>
  requestOverlayPermission(): Promise<void>
  requestUsageAccessPermission(): Promise<void>
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
  addListener(cb: (e: BlockEvent) => void): { remove(): void }
}

export default DeviceActivityAndroid
