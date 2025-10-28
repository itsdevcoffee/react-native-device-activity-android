import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import DeviceActivityAndroid, {
  type PermissionsStatus,
  getCategoryLabel,
} from '@breakr/react-native-device-activity-android'
import { AppSelector, type AppItem } from './components/AppSelector'
import { storageHelpers } from './storage'
import { ensureCustomIconCached } from './utils/iconHelper'
import { DEFAULT_ICON_SIZE } from './constants'

// Create shield themes factory function
const createShieldThemes = (cachedIconPath: string | null) => ({
  // Light mode (for reference/testing)
  light: {
    title: '🔒 Focus Mode',
    subtitle: 'Stay on track',
    primaryButtonLabel: 'Close',
    titleColor: { red: 42, green: 42, blue: 42 },
    subtitleColor: { red: 109, green: 109, blue: 109 },
    backgroundColor: { red: 255, green: 253, blue: 249 },
    backgroundBlurStyle: 'light' as const,
    iconTint: { red: 96, green: 167, blue: 164 },
    primaryButtonBackgroundColor: { red: 255, green: 227, blue: 236 },
    primaryButtonLabelColor: { red: 122, green: 40, blue: 75 },
    secondaryButtonLabel: 'Unlock',
    secondaryButtonLabelColor: { red: 124, green: 124, blue: 124 },
  },
  // Dark mode (new default with custom icon)
  dark: {
    title: '🔒 Blocked',
    subtitle: 'Open app to unlock',
    primaryButtonLabel: 'Unlock',
    titleColor: { red: 255, green: 255, blue: 255 },
    subtitleColor: { red: 200, green: 200, blue: 200 },
    backgroundColor: { red: 18, green: 35, blue: 42 },
    backgroundBlurStyle: 'dark' as const,
    iconTint: { red: 28, green: 58, blue: 68 },
    primaryButtonBackgroundColor: { red: 10, green: 10, blue: 10 },
    primaryButtonLabelColor: { red: 255, green: 255, blue: 255 },
    secondaryButtonLabel: 'Close',
    secondaryButtonLabelColor: { red: 230, green: 230, blue: 230 },
    ...(cachedIconPath && {
      primaryImagePath: cachedIconPath,
      iconSize: DEFAULT_ICON_SIZE,
    }),
  },
  // Legacy themes (kept for compatibility)
  gentle: {
    title: '🔒 focus mode',
    subtitle: 'gentle shield active',
    primaryButtonLabel: 'Close',
    titleColor: { red: 42, green: 42, blue: 42 },
    subtitleColor: { red: 109, green: 109, blue: 109 },
    backgroundColor: { red: 255, green: 253, blue: 249 },
    backgroundBlurStyle: 'light' as const,
    iconTint: { red: 96, green: 167, blue: 164 },
    primaryButtonBackgroundColor: { red: 255, green: 227, blue: 236 },
    primaryButtonLabelColor: { red: 122, green: 40, blue: 75 },
    secondaryButtonLabel: 'Unlock',
    secondaryButtonLabelColor: { red: 124, green: 124, blue: 124 },
  },
  focus: {
    title: '⚡ Deep Focus',
    subtitle: 'Stay in the zone',
    primaryButtonLabel: 'Back to Work',
    titleColor: { red: 51, green: 51, blue: 51 },
    subtitleColor: { red: 102, green: 102, blue: 102 },
    backgroundColor: { red: 240, green: 248, blue: 255 },
    backgroundBlurStyle: 'light' as const,
    iconTint: { red: 0, green: 122, blue: 255 },
    primaryButtonBackgroundColor: { red: 0, green: 122, blue: 255 },
    primaryButtonLabelColor: { red: 255, green: 255, blue: 255 },
    secondaryButtonLabel: 'Take a Break',
    secondaryButtonLabelColor: { red: 142, green: 142, blue: 147 },
  },
  night: {
    title: '🌙 Night Mode',
    subtitle: 'Time to rest',
    primaryButtonLabel: 'Close',
    titleColor: { red: 255, green: 255, blue: 255 },
    subtitleColor: { red: 174, green: 174, blue: 178 },
    backgroundColor: { red: 28, green: 28, blue: 30 },
    backgroundBlurStyle: 'dark' as const,
    iconTint: { red: 142, green: 142, blue: 147 },
    primaryButtonBackgroundColor: { red: 58, green: 58, blue: 60 },
    primaryButtonLabelColor: { red: 255, green: 255, blue: 255 },
    secondaryButtonLabel: 'Emergency Only',
    secondaryButtonLabelColor: { red: 174, green: 174, blue: 178 },
  },
})

export default function App() {
  const [permissions, setPermissions] = useState<PermissionsStatus>({
    accessibilityEnabled: false,
    overlayEnabled: false,
    usageAccessEnabled: false,
    scheduleExactAlarmEnabled: false,
  })
  const [blockedPackages, setBlockedPackages] = useState<string[]>([])
  const [sessionActive, setSessionActive] = useState(false)
  const [showAppPicker, setShowAppPicker] = useState(false)
  const [installedApps, setInstalledApps] = useState<AppItem[]>([])
  const [loadingApps, setLoadingApps] = useState(false)
  const [selectorMode, setSelectorMode] = useState<'list' | 'grid'>('list')
  const [overlayTheme, setOverlayTheme] = useState<'light' | 'dark'>('dark') // Default to dark mode
  const [tempBlockSeconds, setTempBlockSeconds] = useState('15')
  const [tempUnblockSeconds, setTempUnblockSeconds] = useState('15')
  const [tempBlockTimeRemaining, setTempBlockTimeRemaining] = useState<number | null>(null)
  const [tempUnblockTimeRemaining, setTempUnblockTimeRemaining] = useState<number | null>(null)
  const [activeTimer, setActiveTimer] = useState<{
    type: 'block' | 'unblock'
    startTime: number
    durationSeconds: number
  } | null>(null)
  const [cachedIconPath, setCachedIconPath] = useState<string | null>(null)
  const tempBlockCountdownRef = useRef<NodeJS.Timeout | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isInitialMount = useRef(true)

  // Create shield themes with cached icon path
  const SHIELD_THEMES = useMemo(() => createShieldThemes(cachedIconPath), [cachedIconPath])

  useEffect(() => {
    checkPermissions()
    checkBlockStatus()

    // Ensure custom icon is cached and register shield configs
    const setupIcon = async () => {
      try {
        const cachedPath = await ensureCustomIconCached()
        if (cachedPath) {
          console.log('✅ Custom icon cached:', cachedPath)
          setCachedIconPath(cachedPath)
        }
      } catch (error) {
        console.error('Failed to cache custom icon:', error)
      }
    }
    setupIcon()

    // Load persisted data from MMKV
    const savedPackages = storageHelpers.getBlockedPackages()
    const savedMode = storageHelpers.getSelectorMode()
    if (savedPackages.length > 0) {
      setBlockedPackages(savedPackages)
    }
    setSelectorMode(savedMode)

    // Listen for session expiration events
    const subscription = DeviceActivityAndroid.addListener(event => {
      if (event.type === 'session_expired') {
        console.log(`[SessionExpired] Session ${event.sessionId} has expired`)
        setSessionActive(false)
        setActiveTimer(null)
        setTempBlockTimeRemaining(null)
        setTempUnblockTimeRemaining(null)
      }
    })

    return () => {
      subscription.remove()
    }
  }, [])

  // Persist blocked packages to MMKV
  useEffect(() => {
    storageHelpers.setBlockedPackages(blockedPackages)
  }, [blockedPackages])

  // Persist selector mode to MMKV
  useEffect(() => {
    storageHelpers.setSelectorMode(selectorMode)
  }, [selectorMode])

  // Register shield configuration themes when they're ready
  useEffect(() => {
    const registerShieldConfigs = async () => {
      try {
        await DeviceActivityAndroid.configureShielding('light', SHIELD_THEMES.light)
        await DeviceActivityAndroid.configureShielding('dark', SHIELD_THEMES.dark)
        await DeviceActivityAndroid.configureShielding('gentle', SHIELD_THEMES.gentle)
        await DeviceActivityAndroid.configureShielding('focus', SHIELD_THEMES.focus)
        await DeviceActivityAndroid.configureShielding('night', SHIELD_THEMES.night)
        console.log('✅ Shield configurations registered')
      } catch (error) {
        console.error('Failed to register shield configurations:', error)
      }
    }
    registerShieldConfigs()
  }, [SHIELD_THEMES])

  // Countdown timer for temporary block
  useEffect(() => {
    if (tempBlockTimeRemaining !== null && tempBlockTimeRemaining > 0) {
      tempBlockCountdownRef.current = setInterval(() => {
        setTempBlockTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            if (tempBlockCountdownRef.current) {
              clearInterval(tempBlockCountdownRef.current)
              tempBlockCountdownRef.current = null
            }
            return null
          }
          return prev - 1
        })
      }, 1000)

      return () => {
        if (tempBlockCountdownRef.current) {
          clearInterval(tempBlockCountdownRef.current)
          tempBlockCountdownRef.current = null
        }
      }
    }
  }, [tempBlockTimeRemaining])

  // Countdown timer for temporary unblock
  useEffect(() => {
    if (tempUnblockTimeRemaining !== null && tempUnblockTimeRemaining > 0) {
      countdownIntervalRef.current = setInterval(() => {
        setTempUnblockTimeRemaining(prev => {
          if (prev === null || prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current)
              countdownIntervalRef.current = null
            }
            return null
          }
          return prev - 1
        })
      }, 1000)

      return () => {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current)
          countdownIntervalRef.current = null
        }
      }
    }
  }, [tempUnblockTimeRemaining])

  // Auto-update session when blocked packages change during active blocking
  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    // Only update if blocking is active and we have apps selected
    if (!sessionActive || blockedPackages.length === 0) {
      return
    }

    const updateSession = async () => {
      try {
        if (activeTimer) {
          // Calculate remaining time on the timer
          const elapsed = (Date.now() - activeTimer.startTime) / 1000
          const remaining = Math.max(1, Math.ceil(activeTimer.durationSeconds - elapsed))

          console.log(`Updating session with new packages. Timer has ${remaining}s remaining.`)

          if (activeTimer.type === 'block') {
            // Cancel current session and restart temp block with remaining time
            await DeviceActivityAndroid.unblockAllApps()
            await handleTemporaryBlock(remaining)
          } else {
            // For temp unblock, we need to update what will be blocked when timer ends
            // Cancel and restart the temp unblock
            await DeviceActivityAndroid.unblockAllApps()
            await temporaryUnblock(remaining)
          }
        } else {
          // Indefinite blocking - just update the session
          console.log('Updating indefinite blocking session with new packages.')
          await DeviceActivityAndroid.startSession(
            {
              id: 'block-all-session',
              blockedPackages: blockedPackages,
              endsAt: undefined,
            },
            undefined,
            overlayTheme
          )
        }
      } catch (error: any) {
        console.error('Failed to update session:', error)
      }
    }

    updateSession()
  }, [blockedPackages])

  const checkPermissions = async () => {
    try {
      const status = await DeviceActivityAndroid.getPermissionsStatus()
      console.log('✅ Permissions:', status)
      setPermissions(status)
    } catch (error) {
      console.error('❌ Error:', error)
    }
  }

  const checkBlockStatus = async () => {
    try {
      const status = await DeviceActivityAndroid.getBlockStatus()
      setSessionActive(status.isBlocking)
    } catch (error) {
      console.error('Error checking block status:', error)
    }
  }

  const requestPermission = async (type: string) => {
    try {
      switch (type) {
        case 'accessibility':
          await DeviceActivityAndroid.requestAccessibilityPermission()
          break
        case 'overlay':
          await DeviceActivityAndroid.requestOverlayPermission()
          break
        case 'usage':
          await DeviceActivityAndroid.requestUsageAccessPermission()
          break
        case 'alarm':
          await DeviceActivityAndroid.requestScheduleExactAlarmPermission()
          break
      }
      setTimeout(checkPermissions, 1000)
    } catch (error) {
      console.error(`Failed to request ${type} permission`, error)
    }
  }

  const loadInstalledApps = async () => {
    setLoadingApps(true)
    try {
      const apps = await DeviceActivityAndroid.getInstalledApps(true)
      const normalized: AppItem[] = apps.map(app => ({
        id: app.packageName,
        name: app.name,
        packageName: app.packageName,
        iconUri: app.icon ? `data:image/png;base64,${app.icon}` : undefined,
        category: getCategoryLabel(app.category),
      }))
      setInstalledApps(normalized)
    } catch (error: any) {
      console.error('Failed to load apps:', error)
    } finally {
      setLoadingApps(false)
    }
  }

  const openAppPicker = () => {
    setShowAppPicker(true)
    loadInstalledApps()
  }

  const getAppName = (packageName: string) => {
    const app = installedApps.find(a => a.id === packageName)
    return app?.name || packageName
  }

  // Utility functions for programmatic session control (not currently used in UI)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const startFocusSession = async () => {
    try {
      if (blockedPackages.length === 0) {
        console.log('Cannot start focus session: No apps selected')
        return
      }

      await DeviceActivityAndroid.startSession(
        {
          id: 'focus-session',
          blockedPackages,
          endsAt: Date.now() + 5 * 60 * 1000,
        },
        undefined,
        'focus'
      )

      setSessionActive(true)
      console.log('5-minute focus session started!')
    } catch (error) {
      console.error('Failed to start session:', error)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const stopFocusSession = async () => {
    try {
      await DeviceActivityAndroid.stopAllSessions()
      setSessionActive(false)
      console.log('Focus session stopped')
    } catch (error) {
      console.error('Failed to stop session:', error)
    }
  }

  const exportAppMetadata = async () => {
    try {
      const metadata = await DeviceActivityAndroid.getAppMetadataDebug()
      const json = JSON.stringify(metadata, null, 2)
      console.log('📦 App Metadata JSON:')
      console.log(json)
      console.log(`Exported ${metadata.length} apps to console logs`)
    } catch (error) {
      console.error('Failed to export app metadata:', error)
    }
  }

  const blockAllApps = async () => {
    try {
      if (blockedPackages.length === 0) {
        console.log('Cannot block: No apps selected')
        return
      }

      await DeviceActivityAndroid.startSession(
        {
          id: 'block-all-session',
          blockedPackages: blockedPackages,
          endsAt: undefined, // Indefinite blocking
        },
        undefined,
        overlayTheme
      )
      setSessionActive(true)
      setActiveTimer(null) // Clear any timer since this is indefinite
      setTempBlockTimeRemaining(null) // Clear countdown since this is indefinite
      console.log(`${blockedPackages.length} app(s) blocked indefinitely!`)
    } catch (error: any) {
      console.error(`Failed to block apps: ${error.message}`)
    }
  }

  const handleTemporaryBlock = async (durationOverride?: number) => {
    try {
      if (blockedPackages.length === 0) {
        console.log('Cannot block: No apps selected')
        return
      }

      const duration = durationOverride !== undefined
        ? durationOverride
        : parseInt(tempBlockSeconds, 10)

      console.log(`[TemporaryBlock] Input: ${tempBlockSeconds}, Parsed duration: ${duration}, Override: ${durationOverride}`)

      if (isNaN(duration) || duration <= 0) {
        console.log('Please enter a valid number of seconds')
        return
      }

      const endsAt = Date.now() + duration * 1000

      // Format duration for display
      const durationText = duration >= 60
        ? `${Math.floor(duration / 60)} minutes`
        : `${duration} seconds`

      console.log(`[TemporaryBlock] Starting session with duration: ${duration}s, endsAt: ${new Date(endsAt).toISOString()}`)

      await DeviceActivityAndroid.startSession(
        {
          id: 'temp-block-session',
          blockedPackages: blockedPackages,
          endsAt: endsAt,
        },
        undefined,
        overlayTheme
      )

      setSessionActive(true)
      setActiveTimer({
        type: 'block',
        startTime: Date.now(),
        durationSeconds: duration,
      })
      setTempBlockTimeRemaining(duration)

      console.log(`[TemporaryBlock] Session started successfully. Should end at ${new Date(endsAt).toLocaleTimeString()}`)

      if (durationOverride === undefined) {
        console.log(`Apps blocked for ${durationText}. Blocking will end automatically.`)
      }
    } catch (error: any) {
      console.error(`Failed to temporarily block: ${error.message}`)
    }
  }

  const unblockAllApps = async () => {
    try {
      await DeviceActivityAndroid.unblockAllApps()
      setSessionActive(false)
      setActiveTimer(null) // Clear any active timer
      setTempBlockTimeRemaining(null) // Clear countdown display
      setTempUnblockTimeRemaining(null) // Clear countdown display
      console.log('All apps unblocked!')
    } catch (error: any) {
      console.error(`Failed to unblock apps: ${error.message}`)
    }
  }

  const showBlockStatus = async () => {
    try {
      const status = await DeviceActivityAndroid.getBlockStatus()
      console.log('📊 Block Status:', status)
      console.log(
        `Blocking: ${status.isBlocking ? 'Yes' : 'No'}\n` +
          `Active Sessions: ${status.activeSessionCount}\n` +
          `Session IDs: ${status.activeSessions.join(', ') || 'None'}\n` +
          `Service Running: ${status.isServiceRunning ? 'Yes' : 'No'}\n` +
          `Current App: ${status.currentForegroundApp || 'Unknown'}`
      )
    } catch (error: any) {
      console.error(`Failed to get status: ${error.message}`)
    }
  }

  const temporaryUnblock = async (durationOverride?: number) => {
    try {
      // Check if blocking is active
      if (!sessionActive) {
        console.log('You must block apps first before using temporary unblock')
        return
      }

      const duration = durationOverride !== undefined
        ? durationOverride
        : parseInt(tempUnblockSeconds, 10)

      if (isNaN(duration) || duration <= 0) {
        console.log('Please enter a valid number of seconds')
        return
      }

      await DeviceActivityAndroid.temporaryUnblock(duration)
      setTempUnblockTimeRemaining(duration)
      setActiveTimer({
        type: 'unblock',
        startTime: Date.now(),
        durationSeconds: duration,
      })

      if (durationOverride === undefined) {
        console.log(`Apps unblocked for ${duration} seconds. Blocking will resume automatically.`)
      }

      // Listen for when blocking resumes
      const subscription = DeviceActivityAndroid.addListener(event => {
        if (event.type === 'temporary_unblock_ended') {
          console.log('Blocking has resumed!')
          setTempUnblockTimeRemaining(null)
          setSessionActive(true)
          setActiveTimer(null) // Clear timer when it expires
          subscription.remove()
        }
      })
    } catch (error: any) {
      console.error(`Failed to temporarily unblock: ${error.message}`)
    }
  }

  const cancelTemporaryBlock = async () => {
    try {
      console.log('Canceling temporary block...')
      await DeviceActivityAndroid.unblockAllApps()
      setSessionActive(false)
      setActiveTimer(null)
      setTempBlockTimeRemaining(null)
      console.log('Temporary block canceled')
    } catch (error: any) {
      console.error(`Failed to cancel temporary block: ${error.message}`)
    }
  }

  const cancelTemporaryUnblock = async () => {
    try {
      console.log('Canceling temporary unblock, restoring blocking...')

      // Cancel the temporary unblock alarm
      await DeviceActivityAndroid.unblockAllApps()

      // Immediately restart the blocking session
      await DeviceActivityAndroid.startSession(
        {
          id: 'block-all-session',
          blockedPackages: blockedPackages,
          endsAt: undefined, // Indefinite blocking
        },
        undefined,
        overlayTheme
      )

      setSessionActive(true)
      setActiveTimer(null)
      setTempUnblockTimeRemaining(null)
      console.log('Temporary unblock canceled, blocking restored')
    } catch (error: any) {
      console.error(`Failed to cancel temporary unblock: ${error.message}`)
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar style='auto' />

      <ScrollView>
        <Text style={styles.title}>Device Activity Android</Text>

        {/* Permissions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions</Text>

          <View style={styles.permissionRow}>
            <Text style={styles.permissionText}>
              Accessibility: {permissions.accessibilityEnabled ? '✓' : '✗'}
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => requestPermission('accessibility')}
            >
              <Text style={styles.buttonText}>Grant</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.permissionRow}>
            <Text style={styles.permissionText}>
              Overlay: {permissions.overlayEnabled ? '✓' : '✗'}
            </Text>
            <TouchableOpacity style={styles.button} onPress={() => requestPermission('overlay')}>
              <Text style={styles.buttonText}>Grant</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.permissionRow}>
            <Text style={styles.permissionText}>
              Usage: {permissions.usageAccessEnabled ? '✓' : '✗'}
            </Text>
            <TouchableOpacity style={styles.button} onPress={() => requestPermission('usage')}>
              <Text style={styles.buttonText}>Grant</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.permissionRow}>
            <Text style={styles.permissionText}>
              Exact Alarms: {permissions.scheduleExactAlarmEnabled ? '✓' : '✗'}
            </Text>
            <TouchableOpacity style={styles.button} onPress={() => requestPermission('alarm')}>
              <Text style={styles.buttonText}>Grant</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <View style={[styles.row, styles.rowWithSpacing]}>
            <TouchableOpacity
              style={[styles.button, styles.buttonOrange, sessionActive && styles.buttonDisabled]}
              onPress={blockAllApps}
              disabled={sessionActive}
            >
              <Text style={styles.buttonText}>Block All Apps</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonBlue, !sessionActive && styles.buttonDisabled]}
              onPress={unblockAllApps}
              disabled={!sessionActive}
            >
              <Text style={styles.buttonText}>Unblock All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rowWithSpacing}>
            <TouchableOpacity
              style={[styles.button, styles.buttonPurple, styles.buttonFullWidth]}
              onPress={showBlockStatus}
            >
              <Text style={styles.buttonText}>Block Status</Text>
            </TouchableOpacity>
          </View>

          {/* Overlay Theme Toggle */}
          <View style={styles.themeToggleContainer}>
            <Text style={styles.themeToggleLabel}>Overlay Theme:</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.button, overlayTheme === 'light' && styles.buttonSelected]}
                onPress={() => setOverlayTheme('light')}
              >
                <Text style={styles.buttonText}>☀️ Light</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, overlayTheme === 'dark' && styles.buttonSelected]}
                onPress={() => setOverlayTheme('dark')}
              >
                <Text style={styles.buttonText}>🌙 Dark</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Temporary Unblock Section */}
          <View style={styles.tempUnblockContainer}>
            <Text style={styles.tempUnblockLabel}>Temporary Unblock (seconds):</Text>
            <View style={styles.tempUnblockRow}>
              <TextInput
                style={styles.tempUnblockInput}
                value={tempUnblockSeconds}
                onChangeText={setTempUnblockSeconds}
                keyboardType='numeric'
                placeholder='15'
                editable={tempUnblockTimeRemaining === null}
              />
              <TouchableOpacity
                style={[styles.button, styles.buttonTeal, styles.tempUnblockButton]}
                onPress={() => tempUnblockTimeRemaining !== null ? cancelTemporaryUnblock() : temporaryUnblock()}
              >
                <Text style={styles.buttonText}>
                  {tempUnblockTimeRemaining !== null ? 'Cancel' : 'Start'}
                </Text>
              </TouchableOpacity>
            </View>
            {tempUnblockTimeRemaining !== null && (
              <View style={styles.countdownContainer}>
                <Text style={styles.countdownText}>
                  ⏱️ Time remaining: {Math.floor(tempUnblockTimeRemaining / 60)}:
                  {(tempUnblockTimeRemaining % 60).toString().padStart(2, '0')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Temporary Block */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Temporary Block</Text>
          <Text style={styles.helpText}>Block all apps for a specific duration</Text>

          <View style={styles.tempBlockContainer}>
            <Text style={styles.inputLabel}>Duration (seconds):</Text>
            <View style={styles.tempBlockRow}>
              <TextInput
                style={styles.tempBlockInput}
                value={tempBlockSeconds}
                onChangeText={setTempBlockSeconds}
                keyboardType='numeric'
                placeholder='15'
                editable={tempBlockTimeRemaining === null}
              />
              <TouchableOpacity
                style={[styles.button, styles.buttonRed, styles.tempBlockButton]}
                onPress={() => tempBlockTimeRemaining !== null ? cancelTemporaryBlock() : handleTemporaryBlock()}
              >
                <Text style={styles.buttonText}>
                  {tempBlockTimeRemaining !== null ? 'Cancel' : 'Block'}
                </Text>
              </TouchableOpacity>
            </View>
            {tempBlockTimeRemaining !== null && (
              <View style={styles.tempBlockCountdownContainer}>
                <Text style={styles.tempBlockCountdownText}>
                  ⏱️ Blocking ends in: {Math.floor(tempBlockTimeRemaining / 60)}:
                  {(tempBlockTimeRemaining % 60).toString().padStart(2, '0')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Select Apps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Apps</Text>

          <TouchableOpacity
            style={styles.selectAppsButton}
            onPress={openAppPicker}
          >
            <Text style={styles.selectAppsText}>
              {blockedPackages.length === 0
                ? '📱 Select Apps to Block'
                : `${blockedPackages.length} app${blockedPackages.length > 1 ? 's' : ''} selected`}
            </Text>
          </TouchableOpacity>

          {blockedPackages.length > 0 && (
            <ScrollView
              horizontal
              style={styles.selectedAppsScroll}
              showsHorizontalScrollIndicator={false}
            >
              {blockedPackages.map(pkg => (
                <View key={pkg} style={styles.selectedAppChip}>
                  <Text style={styles.chipText} numberOfLines={1}>
                    {getAppName(pkg)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setBlockedPackages(prev => prev.filter(p => p !== pkg))}
                    style={styles.chipRemove}
                  >
                    <Text style={styles.chipRemoveText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Dynamic Shield Examples */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dynamic Shield Examples</Text>
          <Text style={styles.sectionSubtitle}>Test template variables in shield overlays</Text>

          <TouchableOpacity
            style={[styles.button, styles.buttonTeal, styles.buttonFullWidth, sessionActive && styles.buttonDisabled]}
            onPress={async () => {
              if (blockedPackages.length === 0) {
                console.log('Please select at least one app to block')
                return
              }
              await DeviceActivityAndroid.configureShielding('countdown-example', {
                title: '⏱️ Time Remaining',
                subtitle: 'Stay focused on your goals',
                primaryButtonLabel: 'Close',
                backgroundColor: { red: 245, green: 250, blue: 255 },
                titleColor: { red: 30, green: 30, blue: 30 },
                subtitleColor: { red: 0, green: 122, blue: 255 },
                backgroundBlurStyle: 'light',
              })
              const duration = 20
              await DeviceActivityAndroid.startSession(
                {
                  id: 'countdown-example-session',
                  blockedPackages: blockedPackages,
                  endsAt: Date.now() + duration * 1000,
                },
                undefined,
                'countdown-example'
              )
              setSessionActive(true)
              console.log('Countdown example started! Try opening a blocked app.')
            }}
            disabled={sessionActive}
          >
            <Text style={styles.buttonText}>1. Countdown Example</Text>
            <Text style={styles.buttonSubtext}>Shows: &ldquo;Unblocks in 20s, 19s...&rdquo;</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonPink, styles.buttonFullWidth, sessionActive && styles.buttonDisabled]}
            onPress={async () => {
              if (blockedPackages.length === 0) {
                console.log('Please select at least one app to block')
                return
              }
              await DeviceActivityAndroid.configureShielding('powerpoints-example', {
                title: '💪 Power Points',
                subtitle: 'You have {{powerPoints}} points left',
                message: 'Keep focusing to earn more!',
                primaryButtonLabel: 'Back to Work',
                backgroundColor: { red: 255, green: 245, blue: 250 },
                titleColor: { red: 147, green: 51, blue: 234 },
                subtitleColor: { red: 100, green: 100, blue: 100 },
                backgroundBlurStyle: 'light',
              })
              await DeviceActivityAndroid.startSession(
                {
                  id: 'powerpoints-example-session',
                  blockedPackages: blockedPackages,
                  endsAt: Date.now() + 30 * 1000,
                },
                undefined,
                'powerpoints-example'
              )
              setSessionActive(true)
              console.log('Power Points example started!')
            }}
            disabled={sessionActive}
          >
            <Text style={styles.buttonText}>2. Power Points Example</Text>
            <Text style={styles.buttonSubtext}>Shows: &ldquo;You have 150 points left&rdquo;</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonIndigo, styles.buttonFullWidth, sessionActive && styles.buttonDisabled]}
            onPress={async () => {
              if (blockedPackages.length === 0) {
                console.log('Please select at least one app to block')
                return
              }
              await DeviceActivityAndroid.configureShielding('timestamp-example', {
                title: '🕐 Current Time',
                subtitle: '{{timestamp}}',
                message: 'Blocked until you finish your tasks',
                primaryButtonLabel: 'Dismiss',
                backgroundColor: { red: 248, green: 250, blue: 252 },
                titleColor: { red: 50, green: 50, blue: 50 },
                subtitleColor: { red: 100, green: 116, blue: 139 },
                backgroundBlurStyle: 'light',
              })
              await DeviceActivityAndroid.startSession(
                {
                  id: 'timestamp-example-session',
                  blockedPackages: blockedPackages,
                  endsAt: Date.now() + 25 * 1000,
                },
                undefined,
                'timestamp-example'
              )
              setSessionActive(true)
              console.log('Timestamp example started!')
            }}
            disabled={sessionActive}
          >
            <Text style={styles.buttonText}>3. Timestamp Example</Text>
            <Text style={styles.buttonSubtext}>Shows ISO timestamp</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonEmerald, styles.buttonFullWidth, sessionActive && styles.buttonDisabled]}
            onPress={async () => {
              if (blockedPackages.length === 0) {
                console.log('Please select at least one app to block')
                return
              }
              await DeviceActivityAndroid.configureShielding('appname-example', {
                title: '🚫 {{appName}} Blocked',
                subtitle: 'This app is currently restricted',
                message: 'Focus on what matters most',
                primaryButtonLabel: 'Got it',
                backgroundColor: { red: 240, green: 253, blue: 244 },
                titleColor: { red: 5, green: 150, blue: 105 },
                subtitleColor: { red: 107, green: 114, blue: 128 },
                backgroundBlurStyle: 'light',
              })
              await DeviceActivityAndroid.startSession(
                {
                  id: 'appname-example-session',
                  blockedPackages: blockedPackages,
                  endsAt: Date.now() + 30 * 1000,
                },
                undefined,
                'appname-example'
              )
              setSessionActive(true)
              console.log('App Name example started!')
            }}
            disabled={sessionActive}
          >
            <Text style={styles.buttonText}>4. App Name Example</Text>
            <Text style={styles.buttonSubtext}>Shows blocked app name dynamically</Text>
          </TouchableOpacity>
        </View>

        {/* Mode Toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Selector Mode</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.button, selectorMode === 'list' && styles.buttonSelected]}
              onPress={() => setSelectorMode('list')}
            >
              <Text style={styles.buttonText}>List Mode</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, selectorMode === 'grid' && styles.buttonSelected]}
              onPress={() => setSelectorMode('grid')}
            >
              <Text style={styles.buttonText}>Grid Mode</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Debug Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Debug</Text>
          <TouchableOpacity style={[styles.button, styles.buttonGray]} onPress={exportAppMetadata}>
            <Text style={styles.buttonText}>Export App Metadata JSON</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* App Picker Modal - New AppSelector Component */}
      <Modal
        visible={showAppPicker}
        animationType='slide'
        onRequestClose={() => setShowAppPicker(false)}
        statusBarTranslucent={false}
      >
        <SafeAreaProvider>
          {loadingApps && installedApps.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size='large' color='#007AFF' />
              <Text style={styles.loadingText}>Loading apps...</Text>
            </View>
          ) : (
            <AppSelector
              mode={selectorMode}
              apps={installedApps}
              selectedIds={blockedPackages}
              onChange={setBlockedPackages}
              searchable
              groupBy='category'
              showPackageName={false}
              collapsibleSections
              initiallyCollapsed={{ Entertainment: false }}
              showCategoryFilterRail={selectorMode === 'grid'}
              density='compact'
              onSubmit={ids => {
                setBlockedPackages(ids)
                setShowAppPicker(false)
              }}
              onCancel={() => setShowAppPicker(false)}
              onToggleSection={(section, collapsed) => {
                console.log(`Section "${section}" ${collapsed ? 'collapsed' : 'expanded'}`)
              }}
              onRefresh={loadInstalledApps}
              refreshing={loadingApps}
            />
          )}
        </SafeAreaProvider>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  permissionText: {
    fontSize: 16,
    color: '#333',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#2196F3',
  },
  buttonGreen: {
    backgroundColor: '#4CAF50',
    flex: 1,
    marginRight: 5,
  },
  buttonRed: {
    backgroundColor: '#F44336',
    flex: 1,
    marginLeft: 5,
  },
  buttonGray: {
    backgroundColor: '#757575',
  },
  buttonOrange: {
    backgroundColor: '#FF9800',
    flex: 1,
    marginRight: 5,
  },
  buttonBlue: {
    backgroundColor: '#2196F3',
    flex: 1,
    marginLeft: 5,
  },
  buttonPurple: {
    backgroundColor: '#9C27B0',
    flex: 1,
    marginRight: 5,
  },
  buttonFullWidth: {
    flex: 0,
    width: '100%',
    marginRight: 0,
    marginLeft: 0,
  },
  buttonTeal: {
    backgroundColor: '#009688',
    flex: 1,
    marginLeft: 5,
  },
  buttonPink: {
    backgroundColor: '#E91E63',
    marginBottom: 8,
  },
  buttonIndigo: {
    backgroundColor: '#3F51B5',
    marginBottom: 8,
  },
  buttonEmerald: {
    backgroundColor: '#059669',
    marginBottom: 8,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonSelected: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  buttonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  rowWithSpacing: {
    marginBottom: 10,
  },
  helpText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  helpTextWarning: {
    fontSize: 14,
    color: '#FF9800',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  tempBlockContainer: {
    marginTop: 4,
  },
  tempBlockRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  tempBlockInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tempBlockButton: {
    flex: 0,
    paddingHorizontal: 24,
  },
  tempUnblockContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  tempUnblockLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  tempUnblockRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  tempUnblockInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tempUnblockButton: {
    flex: 0,
    paddingHorizontal: 24,
    marginLeft: 0,
  },
  countdownContainer: {
    marginTop: 10,
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  countdownText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
    textAlign: 'center',
  },
  tempBlockCountdownContainer: {
    marginTop: 10,
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  tempBlockCountdownText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#C62828',
    textAlign: 'center',
  },
  themeToggleContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  themeToggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  activeText: {
    marginTop: 12,
    color: '#4CAF50',
    fontWeight: '600',
    textAlign: 'center',
  },
  selectAppsButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  selectAppsText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  selectedAppsScroll: {
    maxHeight: 50,
    marginBottom: 12,
  },
  selectedAppChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 6,
    marginRight: 8,
    maxWidth: 150,
  },
  chipText: {
    color: '#1976D2',
    fontSize: 14,
    marginRight: 4,
  },
  chipRemove: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#1976D2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRemoveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#757575',
  },
})
