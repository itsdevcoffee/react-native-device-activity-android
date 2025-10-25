import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native'
import { StatusBar } from 'expo-status-bar'
import DeviceActivityAndroid, {
  type PermissionsStatus,
} from '@breakrr/react-native-device-activity-android'

export default function App() {
  const [permissions, setPermissions] = useState<PermissionsStatus>({
    accessibilityEnabled: false,
    overlayEnabled: false,
    usageAccessEnabled: false,
  })
  const [blockedPackages, setBlockedPackages] = useState(
    'com.google.android.youtube'
  )
  const [sessionActive, setSessionActive] = useState(false)

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

  const startFocusSession = async () => {
    try {
      const packages = blockedPackages.split(',').map(p => p.trim()).filter(p => p.length > 0)

      await DeviceActivityAndroid.startSession(
        {
          id: 'focus-session',
          blockedPackages: packages,
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

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

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

        <TextInput
          style={styles.input}
          value={blockedPackages}
          onChangeText={setBlockedPackages}
          placeholder="Package names"
          editable={!sessionActive}
        />

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

        {sessionActive && (
          <Text style={styles.activeText}>✓ Session Active</Text>
        )}
      </View>
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
    backgroundColor: '#fafafa',
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
})
