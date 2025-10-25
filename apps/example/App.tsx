import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  FlatList,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import DeviceActivityAndroid, {
  type PermissionsStatus,
} from '@breakrr/react-native-device-activity-android'

type InstalledApp = {
  packageName: string
  name: string
  icon?: string
}

export default function App() {
  const [permissions, setPermissions] = useState<PermissionsStatus>({
    accessibilityEnabled: false,
    overlayEnabled: false,
    usageAccessEnabled: false,
  })
  const [blockedPackages, setBlockedPackages] = useState<string[]>([])
  const [sessionActive, setSessionActive] = useState(false)
  const [showAppPicker, setShowAppPicker] = useState(false)
  const [installedApps, setInstalledApps] = useState<InstalledApp[]>([])
  const [filteredApps, setFilteredApps] = useState<InstalledApp[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingApps, setLoadingApps] = useState(false)

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
      setInstalledApps(apps)
      setFilteredApps(apps)
    } catch (error: any) {
      Alert.alert('Error', `Failed to load apps: ${error.message}`)
    } finally {
      setLoadingApps(false)
    }
  }

  const handleSearchChange = (text: string) => {
    setSearchQuery(text)
    const filtered = installedApps.filter(
      (app) =>
        app.name.toLowerCase().includes(text.toLowerCase()) ||
        app.packageName.toLowerCase().includes(text.toLowerCase())
    )
    setFilteredApps(filtered)
  }

  const toggleAppSelection = (packageName: string) => {
    setBlockedPackages((prev) =>
      prev.includes(packageName)
        ? prev.filter((p) => p !== packageName)
        : [...prev, packageName]
    )
  }

  const openAppPicker = () => {
    setShowAppPicker(true)
    if (installedApps.length === 0) {
      loadInstalledApps()
    }
  }

  const getAppName = (packageName: string) => {
    const app = installedApps.find((a) => a.packageName === packageName)
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

  const renderAppItem = ({ item }: { item: InstalledApp }) => {
    const isSelected = blockedPackages.includes(item.packageName)
    return (
      <TouchableOpacity
        style={[styles.appItem, isSelected && styles.appItemSelected]}
        onPress={() => toggleAppSelection(item.packageName)}
      >
        {item.icon ? (
          <Image
            source={{ uri: `data:image/png;base64,${item.icon}` }}
            style={styles.appIcon}
          />
        ) : (
          <View style={[styles.appIcon, styles.appIconPlaceholder]}>
            <Text style={styles.appIconText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.appInfo}>
          <Text style={styles.appName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.appPackage} numberOfLines={1}>
            {item.packageName}
          </Text>
        </View>
        {isSelected && (
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>✓</Text>
          </View>
        )}
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

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
            <TouchableOpacity
              style={styles.button}
              onPress={() => requestPermission('overlay')}
            >
              <Text style={styles.buttonText}>Grant</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.permissionRow}>
            <Text style={styles.permissionText}>
              Usage: {permissions.usageAccessEnabled ? '✓' : '✗'}
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => requestPermission('usage')}
            >
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
                : `${blockedPackages.length} app${
                    blockedPackages.length > 1 ? 's' : ''
                  } selected`}
            </Text>
          </TouchableOpacity>

          {blockedPackages.length > 0 && (
            <ScrollView
              horizontal
              style={styles.selectedAppsScroll}
              showsHorizontalScrollIndicator={false}
            >
              {blockedPackages.map((pkg) => (
                <View key={pkg} style={styles.selectedAppChip}>
                  <Text style={styles.chipText} numberOfLines={1}>
                    {getAppName(pkg)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => toggleAppSelection(pkg)}
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
                sessionActive && styles.buttonDisabled,
              ]}
              onPress={startFocusSession}
              disabled={sessionActive}
            >
              <Text style={styles.buttonText}>Start Focus</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonRed,
                !sessionActive && styles.buttonDisabled,
              ]}
              onPress={stopFocusSession}
              disabled={!sessionActive}
            >
              <Text style={styles.buttonText}>Stop</Text>
            </TouchableOpacity>
          </View>

          {sessionActive && (
            <Text style={styles.activeText}>✓ Session Active</Text>
          )}
        </View>
      </ScrollView>

      {/* App Picker Modal */}
      <Modal
        visible={showAppPicker}
        animationType="slide"
        onRequestClose={() => setShowAppPicker(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Apps</Text>
            <TouchableOpacity onPress={() => setShowAppPicker(false)}>
              <Text style={styles.modalClose}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search apps..."
              value={searchQuery}
              onChangeText={handleSearchChange}
              autoCapitalize="none"
            />
          </View>

          {loadingApps ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.loadingText}>Loading apps...</Text>
            </View>
          ) : filteredApps.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery ? 'No apps found' : 'No apps available'}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredApps}
              renderItem={renderAppItem}
              keyExtractor={(item) => item.packageName}
              style={styles.appList}
            />
          )}
        </View>
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
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
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
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalClose: {
    fontSize: 16,
    color: '#2196F3',
    fontWeight: '600',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  searchInput: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  appList: {
    flex: 1,
  },
  appItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  appItemSelected: {
    backgroundColor: '#E8F5E9',
  },
  appIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginRight: 12,
  },
  appIconPlaceholder: {
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#757575',
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  appPackage: {
    fontSize: 12,
    color: '#757575',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#757575',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
  },
})
