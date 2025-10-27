import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import DeviceActivityAndroid, { type PermissionsStatus } from '@breakr/react-native-device-activity-android'
import { Button, Card, Badge } from '../../components/ui'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { spacing } from '../../theme/spacing'
import { storageHelpers } from '../../storage'

export default function SettingsScreen() {
  const router = useRouter()
  const [permissions, setPermissions] = useState<PermissionsStatus>({
    accessibilityEnabled: false,
    overlayEnabled: false,
    usageAccessEnabled: false,
    scheduleExactAlarmEnabled: false,
  })
  const [showDebug, setShowDebug] = useState(false)

  useEffect(() => {
    loadPermissions()
  }, [])

  const loadPermissions = async () => {
    try {
      const status = await DeviceActivityAndroid.getPermissionsStatus()
      setPermissions(status)
    } catch (error) {
      console.error('Error loading permissions:', error)
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
      setTimeout(loadPermissions, 1000)
    } catch (error) {
      console.error(`Error requesting ${type}:`, error)
    }
  }

  const handleResetOnboarding = () => {
    Alert.alert(
      'Reset Onboarding',
      'This will show the welcome screen again on next launch. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            storageHelpers.setOnboardingComplete(false)
            router.replace('/(onboarding)/welcome')
          },
        },
      ]
    )
  }

  const exportAppMetadata = async () => {
    try {
      const metadata = await DeviceActivityAndroid.getAppMetadataDebug()
      console.log('App Metadata:', JSON.stringify(metadata, null, 2))
      Alert.alert('Success', `Exported ${metadata.length} apps to console`)
    } catch (error) {
      Alert.alert('Error', 'Failed to export metadata')
    }
  }

  const showBlockStatus = async () => {
    try {
      const status = await DeviceActivityAndroid.getBlockStatus()
      Alert.alert(
        'Block Status',
        `Blocking: ${status.isBlocking ? 'Yes' : 'No'}\n` +
          `Active Sessions: ${status.activeSessionCount}\n` +
          `Session IDs: ${status.activeSessions.join(', ') || 'None'}\n` +
          `Service Running: ${status.isServiceRunning ? 'Yes' : 'No'}\n` +
          `Current App: ${status.currentForegroundApp || 'Unknown'}`
      )
    } catch (error) {
      Alert.alert('Error', 'Failed to get status')
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Permissions Status */}
        <Card padding="lg" style={styles.card}>
          <Text style={styles.cardTitle}>Permissions</Text>
          <PermissionRow
            label="Accessibility"
            granted={permissions.accessibilityEnabled}
            onGrant={() => requestPermission('accessibility')}
          />
          <PermissionRow
            label="Overlay"
            granted={permissions.overlayEnabled}
            onGrant={() => requestPermission('overlay')}
          />
          <PermissionRow
            label="Usage Access"
            granted={permissions.usageAccessEnabled}
            onGrant={() => requestPermission('usage')}
          />
          <PermissionRow
            label="Exact Alarms"
            granted={permissions.scheduleExactAlarmEnabled}
            onGrant={() => requestPermission('alarm')}
          />
        </Card>

        {/* App Info */}
        <Card padding="lg" style={styles.card}>
          <Text style={styles.cardTitle}>About</Text>
          <InfoRow label="Version" value="1.0.0" />
          <InfoRow label="Package" value="Device Activity Android" />
          <Button
            label="Reset Onboarding"
            onPress={handleResetOnboarding}
            variant="outline"
            size="md"
            fullWidth
            style={styles.resetButton}
          />
        </Card>

        {/* Debug Tools */}
        <Card padding="lg" style={styles.card}>
          <TouchableOpacity onPress={() => setShowDebug(!showDebug)}>
            <Text style={styles.cardTitle}>Debug Tools {showDebug ? '▼' : '▶'}</Text>
          </TouchableOpacity>
          {showDebug && (
            <View style={styles.debugContent}>
              <Button
                label="Show Block Status"
                onPress={showBlockStatus}
                variant="outline"
                size="sm"
                fullWidth
                style={styles.debugButton}
              />
              <Button
                label="Export App Metadata"
                onPress={exportAppMetadata}
                variant="outline"
                size="sm"
                fullWidth
                style={styles.debugButton}
              />
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}

interface PermissionRowProps {
  label: string
  granted: boolean
  onGrant: () => void
}

function PermissionRow({ label, granted, onGrant }: PermissionRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Badge label={granted ? 'Granted' : 'Required'} variant={granted ? 'success' : 'warning'} />
      </View>
      {!granted && (
        <Button label="Grant" onPress={onGrant} variant="primary" size="sm" />
      )}
    </View>
  )
}

interface InfoRowProps {
  label: string
  value: string
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.lightAlt,
  },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.surface.light,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  title: {
    ...typography.displaySmall,
    color: colors.text.light.primary,
  },
  scrollContent: {
    padding: spacing.xl,
  },
  card: {
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.headingSmall,
    color: colors.text.light.primary,
    marginBottom: spacing.md,
  },
  row: {
    marginBottom: spacing.md,
  },
  rowContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  rowLabel: {
    ...typography.bodyMedium,
    color: colors.text.light.primary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoLabel: {
    ...typography.bodyMedium,
    color: colors.text.light.secondary,
  },
  infoValue: {
    ...typography.bodyMedium,
    color: colors.text.light.primary,
    fontWeight: '500',
  },
  resetButton: {
    marginTop: spacing.sm,
  },
  debugContent: {
    marginTop: spacing.sm,
  },
  debugButton: {
    marginBottom: spacing.xs,
  },
})
