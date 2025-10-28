import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import DeviceActivityAndroid, { type PermissionsStatus } from '@breakr/react-native-device-activity-android'
import { Button, Card } from '../../components/ui'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { spacing, borderRadius } from '../../theme/spacing'
import { storageHelpers } from '../../storage'

/**
 * Permissions onboarding screen
 * Guides user through granting required permissions step-by-step
 */
export default function PermissionsScreen() {
  const router = useRouter()
  const [permissions, setPermissions] = useState<PermissionsStatus>({
    accessibilityEnabled: false,
    overlayEnabled: false,
    usageAccessEnabled: false,
    scheduleExactAlarmEnabled: false,
  })
  // Future: use for loading state during permission checks
  // const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkPermissions()
  }, [])

  const checkPermissions = async () => {
    try {
      const status = await DeviceActivityAndroid.getPermissionsStatus()
      setPermissions(status)
    } catch (error) {
      console.error('Error checking permissions:', error)
    }
  }

  const requestPermission = async (type: 'accessibility' | 'overlay' | 'usage' | 'alarm') => {
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
      // Re-check permissions after a short delay
      setTimeout(checkPermissions, 1000)
    } catch (error) {
      console.error(`Error requesting ${type} permission:`, error)
    }
  }

  const allPermissionsGranted =
    permissions.accessibilityEnabled &&
    permissions.overlayEnabled &&
    permissions.usageAccessEnabled &&
    permissions.scheduleExactAlarmEnabled

  const handleComplete = () => {
    if (!allPermissionsGranted) {
      Alert.alert(
        'Permissions Required',
        'Please grant all permissions to use the app effectively. You can skip for now, but some features may not work.',
        [
          { text: 'Grant Permissions', style: 'default' },
          {
            text: 'Skip for Now',
            style: 'cancel',
            onPress: () => {
              storageHelpers.setOnboardingComplete(true)
              router.replace('/(tabs)')
            },
          },
        ]
      )
      return
    }

    // Mark onboarding as complete
    storageHelpers.setOnboardingComplete(true)
    router.replace('/(tabs)')
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.stepIndicator}>Step 1 of 1</Text>
        <Text style={styles.title}>Grant Permissions</Text>
        <Text style={styles.subtitle}>
          This app requires special permissions to block apps and monitor usage
        </Text>
      </View>

      {/* Permissions List */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <PermissionCard
          icon="👁"
          title="Accessibility Service"
          description="Required to detect when blocked apps are opened and display the blocking overlay"
          granted={permissions.accessibilityEnabled}
          onGrant={() => requestPermission('accessibility')}
        />

        <PermissionCard
          icon="🔲"
          title="Draw Over Apps"
          description="Allows the app to show a full-screen block overlay on top of restricted apps"
          granted={permissions.overlayEnabled}
          onGrant={() => requestPermission('overlay')}
        />

        <PermissionCard
          icon="📊"
          title="Usage Access"
          description="Monitors which apps are currently in use to enforce blocking rules"
          granted={permissions.usageAccessEnabled}
          onGrant={() => requestPermission('usage')}
        />

        <PermissionCard
          icon="⏰"
          title="Schedule Exact Alarms"
          description="Enables time-based sessions that automatically start and end on schedule"
          granted={permissions.scheduleExactAlarmEnabled}
          onGrant={() => requestPermission('alarm')}
        />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          label={allPermissionsGranted ? 'Continue' : 'Skip for Now'}
          onPress={handleComplete}
          variant={allPermissionsGranted ? 'primary' : 'outline'}
          size="lg"
          fullWidth
        />
      </View>
    </SafeAreaView>
  )
}

interface PermissionCardProps {
  icon: string
  title: string
  description: string
  granted: boolean
  onGrant: () => void
}

function PermissionCard({ icon, title, description, granted, onGrant }: PermissionCardProps) {
  return (
    <Card style={styles.permissionCard} elevated padding="lg">
      <View style={styles.permissionHeader}>
        <Text style={styles.permissionIcon}>{icon}</Text>
        <View style={styles.permissionTitleContainer}>
          <Text style={styles.permissionTitle}>{title}</Text>
          {granted && (
            <View style={styles.grantedBadge}>
              <Text style={styles.grantedText}>✓ Granted</Text>
            </View>
          )}
        </View>
      </View>
      <Text style={styles.permissionDescription}>{description}</Text>
      {!granted && (
        <Button
          label="Grant Permission"
          onPress={onGrant}
          variant="primary"
          size="md"
          style={styles.grantButton}
        />
      )}
    </Card>
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
  stepIndicator: {
    ...typography.labelMedium,
    color: colors.primary[500],
    marginBottom: spacing.xs,
  },
  title: {
    ...typography.displaySmall,
    color: colors.text.light.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.text.light.secondary,
  },
  scrollContent: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  permissionCard: {
    marginBottom: spacing.sm,
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  permissionIcon: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  permissionTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  permissionTitle: {
    ...typography.headingSmall,
    color: colors.text.light.primary,
  },
  grantedBadge: {
    backgroundColor: `${colors.success[500]}15`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.full,
  },
  grantedText: {
    ...typography.labelSmall,
    color: colors.success[600],
  },
  permissionDescription: {
    ...typography.bodyMedium,
    color: colors.text.light.secondary,
    marginBottom: spacing.md,
  },
  grantButton: {
    marginTop: spacing.xs,
  },
  footer: {
    padding: spacing.xl,
    backgroundColor: colors.surface.light,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
})
