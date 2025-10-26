import React, { useState, useEffect, useMemo } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import DeviceActivityAndroid, {
  type PermissionsStatus,
  getCategoryLabel,
} from '@breakrr/react-native-device-activity-android'
import { AppSelector, type AppItem } from './components/AppSelector'

export default function App() {
  const [permissions, setPermissions] = useState<PermissionsStatus>({
    accessibilityEnabled: false,
    overlayEnabled: false,
    usageAccessEnabled: false,
  })
  const [blockedPackages, setBlockedPackages] = useState<string[]>([])
  const [sessionActive, setSessionActive] = useState(false)
  const [showAppPicker, setShowAppPicker] = useState(false)
  const [installedApps, setInstalledApps] = useState<AppItem[]>([])
  const [loadingApps, setLoadingApps] = useState(false)
  const [selectorMode, setSelectorMode] = useState<'list' | 'grid'>('list')

  useEffect(() => {
    checkPermissions()
  }, [])

  const checkPermissions = async () => {
    try {
      const status = await DeviceActivityAndroid.getPermissionsStatus()
      console.log('✅ Permissions:', status)
      setPermissions(status)
    } catch (error) {
      console.error('❌ Error:', error)
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
    if (installedApps.length === 0) {
      loadInstalledApps()
    }
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
              style={[styles.button, styles.buttonGreen, sessionActive && styles.buttonDisabled]}
              onPress={startFocusSession}
              disabled={sessionActive}
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
          {loadingApps ? (
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
