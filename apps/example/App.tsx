import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
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
} from '@breakrr/react-native-device-activity-android'
import { AppSelector, type AppItem } from './components/AppSelector'
import { storageHelpers } from './storage'

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
  const [tempBlockSeconds, setTempBlockSeconds] = useState('300')
  const [tempUnblockSeconds, setTempUnblockSeconds] = useState('60')
  const [tempUnblockTimeRemaining, setTempUnblockTimeRemaining] = useState<number | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    checkPermissions()
    checkBlockStatus()

    // Load persisted data from MMKV
    const savedPackages = storageHelpers.getBlockedPackages()
    const savedMode = storageHelpers.getSelectorMode()
    if (savedPackages.length > 0) {
      setBlockedPackages(savedPackages)
    }
    setSelectorMode(savedMode)
  }, [])

  // Persist blocked packages to MMKV
  useEffect(() => {
    storageHelpers.setBlockedPackages(blockedPackages)
  }, [blockedPackages])

  // Persist selector mode to MMKV
  useEffect(() => {
    storageHelpers.setSelectorMode(selectorMode)
  }, [selectorMode])

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
      Alert.alert('Error', `Failed to request ${type} permission`)
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
      Alert.alert('Error', `Failed to load apps: ${error.message}`)
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

  const startFocusSession = async () => {
    try {
      if (blockedPackages.length === 0) {
        Alert.alert('Error', 'Please select at least one app to block')
        return
      }

      await DeviceActivityAndroid.startSession(
        {
          id: 'focus-session',
          blockedPackages,
          endsAt: Date.now() + 5 * 60 * 1000,
        },
        {
          title: 'Stay Focused',
          message: 'This app is blocked during your focus session.',
          ctaText: 'Return to Focus',
        }
      )

      setSessionActive(true)
      Alert.alert('Success', '5-minute focus session started!')
    } catch (error) {
      Alert.alert('Error', 'Failed to start session')
      console.error(error)
    }
  }

  const stopFocusSession = async () => {
    try {
      await DeviceActivityAndroid.stopAllSessions()
      setSessionActive(false)
      Alert.alert('Success', 'Focus session stopped')
    } catch (error) {
      Alert.alert('Error', 'Failed to stop session')
    }
  }

  const exportAppMetadata = async () => {
    try {
      const metadata = await DeviceActivityAndroid.getAppMetadataDebug()
      const json = JSON.stringify(metadata, null, 2)
      console.log('📦 App Metadata JSON:')
      console.log(json)
      Alert.alert(
        'Exported!',
        `Exported ${metadata.length} apps to console logs. Check the terminal/logs for the JSON output.`
      )
    } catch (error) {
      Alert.alert('Error', 'Failed to export app metadata')
      console.error(error)
    }
  }

  const blockAllApps = async () => {
    try {
      await DeviceActivityAndroid.blockAllApps(
        'block-all-session',
        undefined, // Indefinite blocking
        {
          title: 'All Apps Blocked',
          message: 'All apps are blocked indefinitely until you unblock them.',
          ctaText: 'Dismiss',
        }
      )
      setSessionActive(true)
      Alert.alert('Success', 'All apps blocked indefinitely!')
    } catch (error: any) {
      Alert.alert('Error', `Failed to block all apps: ${error.message}`)
      console.error(error)
    }
  }

  const handleTemporaryBlock = async () => {
    try {
      const duration = parseInt(tempBlockSeconds, 10)
      if (isNaN(duration) || duration <= 0) {
        Alert.alert('Error', 'Please enter a valid number of seconds')
        return
      }

      await DeviceActivityAndroid.temporaryBlock(duration, {
        title: 'Temporary Block',
        message: `Apps blocked for ${Math.floor(duration / 60)} minutes`,
        ctaText: 'Dismiss',
      })
      setSessionActive(true)
      Alert.alert(
        'Success',
        `Apps blocked for ${Math.floor(duration / 60)} minutes. Blocking will end automatically.`
      )
    } catch (error: any) {
      Alert.alert('Error', `Failed to temporarily block: ${error.message}`)
      console.error(error)
    }
  }

  const unblockAllApps = async () => {
    try {
      await DeviceActivityAndroid.unblockAllApps()
      setSessionActive(false)
      Alert.alert('Success', 'All apps unblocked!')
    } catch (error: any) {
      Alert.alert('Error', `Failed to unblock apps: ${error.message}`)
      console.error(error)
    }
  }

  const showBlockStatus = async () => {
    try {
      const status = await DeviceActivityAndroid.getBlockStatus()
      console.log('📊 Block Status:', status)
      Alert.alert(
        'Block Status',
        `Blocking: ${status.isBlocking ? 'Yes' : 'No'}\n` +
          `Active Sessions: ${status.activeSessionCount}\n` +
          `Session IDs: ${status.activeSessions.join(', ') || 'None'}\n` +
          `Service Running: ${status.isServiceRunning ? 'Yes' : 'No'}\n` +
          `Current App: ${status.currentForegroundApp || 'Unknown'}`
      )
    } catch (error: any) {
      Alert.alert('Error', `Failed to get status: ${error.message}`)
      console.error(error)
    }
  }

  const temporaryUnblock = async () => {
    try {
      const duration = parseInt(tempUnblockSeconds, 10)
      if (isNaN(duration) || duration <= 0) {
        Alert.alert('Error', 'Please enter a valid number of seconds')
        return
      }

      await DeviceActivityAndroid.temporaryUnblock(duration)
      setTempUnblockTimeRemaining(duration)
      Alert.alert(
        'Success',
        `Apps unblocked for ${duration} seconds. Blocking will resume automatically.`
      )

      // Listen for when blocking resumes
      const subscription = DeviceActivityAndroid.addListener(event => {
        if (event.type === 'temporary_unblock_ended') {
          Alert.alert('Notice', 'Blocking has resumed!')
          setTempUnblockTimeRemaining(null)
          setSessionActive(true)
          subscription.remove()
        }
      })
    } catch (error: any) {
      Alert.alert('Error', `Failed to temporarily unblock: ${error.message}`)
      console.error(error)
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
              style={[styles.button, styles.buttonOrange]}
              onPress={blockAllApps}
            >
              <Text style={styles.buttonText}>Block All Apps</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonBlue]}
              onPress={unblockAllApps}
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

          {/* Temporary Unblock Section */}
          <View style={styles.tempUnblockContainer}>
            <Text style={styles.tempUnblockLabel}>Temporary Unblock (seconds):</Text>
            <View style={styles.tempUnblockRow}>
              <TextInput
                style={styles.tempUnblockInput}
                value={tempUnblockSeconds}
                onChangeText={setTempUnblockSeconds}
                keyboardType='numeric'
                placeholder='60'
              />
              <TouchableOpacity
                style={[styles.button, styles.buttonTeal, styles.tempUnblockButton]}
                onPress={temporaryUnblock}
              >
                <Text style={styles.buttonText}>Start</Text>
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
                placeholder='300'
              />
              <TouchableOpacity
                style={[styles.button, styles.buttonRed, styles.tempBlockButton]}
                onPress={handleTemporaryBlock}
              >
                <Text style={styles.buttonText}>Block</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Focus Session */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Focus Session</Text>

          <TouchableOpacity
            style={styles.selectAppsButton}
            onPress={openAppPicker}
            disabled={sessionActive}
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

          <View style={styles.row}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonGreen,
                (sessionActive || blockedPackages.length === 0) && styles.buttonDisabled,
              ]}
              onPress={startFocusSession}
              disabled={sessionActive || blockedPackages.length === 0}
            >
              <Text style={styles.buttonText}>Start Focus</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonRed, !sessionActive && styles.buttonDisabled]}
              onPress={stopFocusSession}
              disabled={!sessionActive}
            >
              <Text style={styles.buttonText}>Stop</Text>
            </TouchableOpacity>
          </View>

          {blockedPackages.length === 0 && !sessionActive && (
            <Text style={styles.helpTextWarning}>
              ⚠️ Please select apps before starting a focus session
            </Text>
          )}
          {sessionActive && <Text style={styles.activeText}>✓ Session Active</Text>}
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
