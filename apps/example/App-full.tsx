import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Switch,
  Alert,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import DeviceActivityAndroid, {
  type BlockEvent,
  type PermissionsStatus,
} from '@breakrr/react-native-device-activity-android'

export default function App() {
  const [permissions, setPermissions] = useState<PermissionsStatus>({
    accessibilityEnabled: false,
    overlayEnabled: false,
    usageAccessEnabled: false,
  })
  const [blockedPackages, setBlockedPackages] = useState(
    'com.instagram.android,com.twitter.android'
  )
  const [sessionActive, setSessionActive] = useState(false)
  const [events, setEvents] = useState<BlockEvent[]>([])
  const [serviceRunning, setServiceRunning] = useState(false)

  useEffect(() => {
    console.log('🚀 App mounted - testing DeviceActivityAndroid module...')

    checkPermissions()
    checkServiceStatus()

    // Subscribe to events
    const subscription = DeviceActivityAndroid.addListener(event => {
      console.log('📱 Event received:', event)
      setEvents(prev => [event, ...prev].slice(0, 50)) // Keep last 50 events
    })

    return () => subscription.remove()
  }, [])

  const checkPermissions = async () => {
    try {
      console.log('✅ Calling getPermissionsStatus...')
      const status = await DeviceActivityAndroid.getPermissionsStatus()
      console.log('✅ Permissions status:', status)
      setPermissions(status)
    } catch (error) {
      console.error('❌ Failed to check permissions:', error)
    }
  }

  const checkServiceStatus = async () => {
    try {
      console.log('✅ Calling isServiceRunning...')
      const running = await DeviceActivityAndroid.isServiceRunning()
      console.log('✅ Service running:', running)
      setServiceRunning(running)
    } catch (error) {
      console.error('❌ Failed to check service status:', error)
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
      // Recheck permissions after a delay (user needs time to grant)
      setTimeout(checkPermissions, 1000)
    } catch (error) {
      Alert.alert('Error', `Failed to request ${type} permission`)
    }
  }

  const startFocusSession = async () => {
    try {
      const packages = blockedPackages
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0)

      if (packages.length === 0) {
        Alert.alert('Error', 'Please enter at least one package name')
        return
      }

      await DeviceActivityAndroid.startSession(
        {
          id: 'focus-session',
          blockedPackages: packages,
          endsAt: Date.now() + 5 * 60 * 1000, // 5 minutes
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
      console.error(error)
    }
  }

  const renderPermissionRow = (
    title: string,
    enabled: boolean,
    type: string
  ) => (
    <View style={styles.permissionRow}>
      <View style={styles.permissionInfo}>
        <Text style={styles.permissionTitle}>{title}</Text>
        <Text style={styles.permissionStatus}>
          {enabled ? '✓ Enabled' : '✗ Disabled'}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.button, enabled && styles.buttonDisabled]}
        onPress={() => !enabled && requestPermission(type)}
        disabled={enabled}
      >
        <Text style={styles.buttonText}>
          {enabled ? 'Granted' : 'Grant'}
        </Text>
      </TouchableOpacity>
    </View>
  )

  const renderEvent = ({ item }: { item: BlockEvent }) => {
    const timestamp = new Date(item.ts).toLocaleTimeString()
    let description = ''

    switch (item.type) {
      case 'block_shown':
        description = `Block shown for session: ${item.sessionId}`
        break
      case 'block_dismissed':
        description = `Block dismissed for session: ${item.sessionId}`
        break
      case 'app_attempt':
        description = `App attempt: ${item.packageName}`
        break
      case 'service_state':
        description = `Service ${item.running ? 'started' : 'stopped'}`
        break
    }

    return (
      <View style={styles.eventItem}>
        <Text style={styles.eventTime}>{timestamp}</Text>
        <Text style={styles.eventType}>{item.type}</Text>
        <Text style={styles.eventDesc}>{description}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <ScrollView style={styles.scrollView}>
        <Text style={styles.title}>Android Device Activity Demo</Text>

        {/* Service Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Service Status</Text>
          <View style={styles.statusRow}>
            <Text>Accessibility Service:</Text>
            <Text style={serviceRunning ? styles.statusGood : styles.statusBad}>
              {serviceRunning ? 'Running' : 'Not Running'}
            </Text>
          </View>
        </View>

        {/* Permissions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permissions</Text>
          {renderPermissionRow(
            'Accessibility Service',
            permissions.accessibilityEnabled,
            'accessibility'
          )}
          {renderPermissionRow(
            'Draw Over Apps',
            permissions.overlayEnabled,
            'overlay'
          )}
          {renderPermissionRow(
            'Usage Access',
            permissions.usageAccessEnabled,
            'usage'
          )}
        </View>

        {/* Session Controls */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Focus Session</Text>
          <Text style={styles.label}>Blocked Packages (comma-separated):</Text>
          <TextInput
            style={styles.input}
            value={blockedPackages}
            onChangeText={setBlockedPackages}
            placeholder="com.instagram.android,com.twitter.android"
            editable={!sessionActive}
          />
          <View style={styles.sessionControls}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonPrimary,
                sessionActive && styles.buttonDisabled,
              ]}
              onPress={startFocusSession}
              disabled={sessionActive}
            >
              <Text style={styles.buttonText}>Start 5-min Focus</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonDanger,
                !sessionActive && styles.buttonDisabled,
              ]}
              onPress={stopFocusSession}
              disabled={!sessionActive}
            >
              <Text style={styles.buttonText}>Stop Focus</Text>
            </TouchableOpacity>
          </View>
          {sessionActive && (
            <Text style={styles.activeSessionText}>
              ✓ Focus session active
            </Text>
          )}
        </View>

        {/* Event Log */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Log</Text>
          {events.length === 0 ? (
            <Text style={styles.noEvents}>No events yet</Text>
          ) : (
            <FlatList
              data={events}
              renderItem={renderEvent}
              keyExtractor={(item, index) => `${item.ts}-${index}`}
              style={styles.eventList}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    color: '#333',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusGood: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  statusBad: {
    color: '#F44336',
    fontWeight: '600',
  },
  permissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  permissionStatus: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#2196F3',
  },
  buttonPrimary: {
    backgroundColor: '#4CAF50',
  },
  buttonDanger: {
    backgroundColor: '#F44336',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fafafa',
  },
  sessionControls: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  activeSessionText: {
    marginTop: 12,
    color: '#4CAF50',
    fontWeight: '600',
    textAlign: 'center',
  },
  noEvents: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  eventList: {
    maxHeight: 400,
  },
  eventItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  eventTime: {
    fontSize: 12,
    color: '#999',
  },
  eventType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  eventDesc: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
})
