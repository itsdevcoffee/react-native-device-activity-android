import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import DeviceActivityAndroid from '@breakr/react-native-device-activity-android'
import { Button, Card, Badge } from '../../components/ui'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { spacing } from '../../theme/spacing'
import { storageHelpers } from '../../storage'

/**
 * Home/Dashboard screen
 * Shows current blocking status and quick actions
 */
export default function HomeScreen() {
  const router = useRouter()
  const [isBlocking, setIsBlocking] = useState(false)
  const [blockedCount, setBlockedCount] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadStatus()
  }, [])

  const loadStatus = async () => {
    try {
      const status = await DeviceActivityAndroid.getBlockStatus()
      setIsBlocking(status.isBlocking)

      const packages = storageHelpers.getBlockedPackages()
      setBlockedCount(packages.length)
    } catch (error) {
      console.error('Error loading status:', error)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadStatus()
    setRefreshing(false)
  }

  const handleStartFocus = () => {
    router.push('/(tabs)/block')
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Home</Text>
        <Text style={styles.subtitle}>Welcome back</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary[500]}
          />
        }
      >
        {/* Status Card */}
        <Card style={styles.statusCard} padding="xl">
          <View style={styles.statusHeader}>
            <Text style={styles.statusIcon}>{isBlocking ? '🔒' : '✨'}</Text>
            <View style={styles.statusContent}>
              <Text style={styles.statusTitle}>
                {isBlocking ? 'Blocking Active' : 'Ready to Focus'}
              </Text>
              <Text style={styles.statusDescription}>
                {isBlocking
                  ? `${blockedCount} app${blockedCount !== 1 ? 's' : ''} currently blocked`
                  : 'Start a focus session to block distractions'}
              </Text>
            </View>
            <Badge
              label={isBlocking ? 'Active' : 'Idle'}
              variant={isBlocking ? 'success' : 'neutral'}
            />
          </View>

          {isBlocking && (
            <Button
              label="View Active Session"
              onPress={() => router.push('/(tabs)/block')}
              variant="outline"
              size="md"
              fullWidth
              style={styles.statusButton}
            />
          )}
        </Card>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>

        <QuickActionCard
          icon="🚀"
          title="Start Focus Session"
          description="Block selected apps and stay focused"
          actionLabel="Get Started"
          onAction={handleStartFocus}
          variant="primary"
        />

        <QuickActionCard
          icon="⚡"
          title="Quick Block"
          description="Block apps for a specific duration"
          actionLabel="Set Timer"
          onAction={() => router.push('/(tabs)/block')}
          variant="secondary"
        />

        <QuickActionCard
          icon="🎨"
          title="Try Examples"
          description="See different shield overlay styles"
          actionLabel="Explore"
          onAction={() => router.push('/(tabs)/examples')}
          variant="secondary"
        />
      </ScrollView>
    </SafeAreaView>
  )
}

interface QuickActionCardProps {
  icon: string
  title: string
  description: string
  actionLabel: string
  onAction: () => void
  variant?: 'primary' | 'secondary'
}

function QuickActionCard({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  variant = 'secondary',
}: QuickActionCardProps) {
  return (
    <Card style={styles.actionCard} padding="lg">
      <View style={styles.actionContent}>
        <Text style={styles.actionIcon}>{icon}</Text>
        <View style={styles.actionText}>
          <Text style={styles.actionTitle}>{title}</Text>
          <Text style={styles.actionDescription}>{description}</Text>
        </View>
      </View>
      <Button
        label={actionLabel}
        onPress={onAction}
        variant={variant}
        size="md"
        fullWidth
      />
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
  title: {
    ...typography.displaySmall,
    color: colors.text.light.primary,
    marginBottom: spacing.xxs,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.text.light.secondary,
  },
  scrollContent: {
    padding: spacing.xl,
  },
  statusCard: {
    marginBottom: spacing.xl,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 40,
    marginRight: spacing.md,
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    ...typography.headingMedium,
    color: colors.text.light.primary,
    marginBottom: spacing.xxs,
  },
  statusDescription: {
    ...typography.bodyMedium,
    color: colors.text.light.secondary,
  },
  statusButton: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    ...typography.headingSmall,
    color: colors.text.light.primary,
    marginBottom: spacing.md,
  },
  actionCard: {
    marginBottom: spacing.md,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  actionIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    ...typography.headingSmall,
    color: colors.text.light.primary,
    marginBottom: spacing.xxs,
  },
  actionDescription: {
    ...typography.bodyMedium,
    color: colors.text.light.secondary,
  },
})
