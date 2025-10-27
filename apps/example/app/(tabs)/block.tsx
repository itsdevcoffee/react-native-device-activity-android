import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Modal, ActivityIndicator, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import DeviceActivityAndroid, { getCategoryLabel } from '@breakr/react-native-device-activity-android'
import { Button, Card, Input, Badge, Toast, EmptyState } from '../../components/ui'
import { AppSelector, type AppItem } from '../../components/AppSelector'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { spacing } from '../../theme/spacing'
import { storageHelpers } from '../../storage'

export default function BlockScreen() {
  const [blockedPackages, setBlockedPackages] = useState<string[]>([])
  const [sessionActive, setSessionActive] = useState(false)
  const [showAppPicker, setShowAppPicker] = useState(false)
  const [installedApps, setInstalledApps] = useState<AppItem[]>([])
  const [loadingApps, setLoadingApps] = useState(false)
  const [duration, setDuration] = useState('15')
  const [unblockDuration, setUnblockDuration] = useState('60')
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' as const })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const packages = storageHelpers.getBlockedPackages()
    setBlockedPackages(packages)

    const status = await DeviceActivityAndroid.getBlockStatus()
    setSessionActive(status.isBlocking)
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
    } catch (error) {
      showToast('Failed to load apps', 'error')
    } finally {
      setLoadingApps(false)
    }
  }

  const handleBlockAll = async () => {
    if (blockedPackages.length === 0) {
      showToast('Please select apps first', 'warning')
      return
    }

    try {
      await DeviceActivityAndroid.startSession(
        { id: 'block-session', blockedPackages, endsAt: undefined },
        undefined,
        'dark'
      )
      setSessionActive(true)
      showToast('Apps blocked successfully', 'success')
    } catch (error) {
      showToast('Failed to block apps', 'error')
    }
  }

  const handleTemporaryBlock = async () => {
    const seconds = parseInt(duration, 10)
    if (isNaN(seconds) || seconds <= 0) {
      showToast('Enter a valid duration', 'warning')
      return
    }

    if (blockedPackages.length === 0) {
      showToast('Please select apps first', 'warning')
      return
    }

    try {
      await DeviceActivityAndroid.startSession(
        {
          id: 'temp-block',
          blockedPackages,
          endsAt: Date.now() + seconds * 1000,
        },
        undefined,
        'dark'
      )
      setSessionActive(true)
      showToast(`Apps blocked for ${seconds} seconds`, 'success')
    } catch (error) {
      showToast('Failed to start session', 'error')
    }
  }

  const handleUnblockAll = async () => {
    try {
      await DeviceActivityAndroid.unblockAllApps()
      setSessionActive(false)
      showToast('All apps unblocked', 'success')
    } catch (error) {
      showToast('Failed to unblock apps', 'error')
    }
  }

  const handleTemporaryUnblock = async () => {
    const seconds = parseInt(unblockDuration, 10)
    if (isNaN(seconds) || seconds <= 0) {
      showToast('Enter a valid duration', 'warning')
      return
    }

    if (!sessionActive) {
      showToast('No active blocking session', 'warning')
      return
    }

    try {
      await DeviceActivityAndroid.temporaryUnblock(seconds)
      showToast(`Apps unblocked for ${seconds} seconds`, 'success')

      // Listen for when blocking resumes
      const subscription = DeviceActivityAndroid.addListener(event => {
        if (event.type === 'temporary_unblock_ended') {
          showToast('Blocking has resumed!', 'info')
          subscription.remove()
        }
      })
    } catch (error) {
      showToast('Failed to temporarily unblock', 'error')
    }
  }

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setToast({ visible: true, message, type })
  }

  const openAppPicker = () => {
    setShowAppPicker(true)
    loadInstalledApps()
  }

  const handleAppsSelected = (ids: string[]) => {
    setBlockedPackages(ids)
    storageHelpers.setBlockedPackages(ids)
    setShowAppPicker(false)
    showToast(`${ids.length} apps selected`, 'info')
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Block Apps</Text>
        <Badge label={sessionActive ? 'Active' : 'Inactive'} variant={sessionActive ? 'success' : 'neutral'} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* App Selection */}
        <Card padding="lg" style={styles.card}>
          <Text style={styles.cardTitle}>Selected Apps</Text>
          <TouchableOpacity style={styles.selectButton} onPress={openAppPicker}>
            <Text style={styles.selectText}>
              {blockedPackages.length === 0
                ? '📱 Tap to select apps'
                : `${blockedPackages.length} app${blockedPackages.length > 1 ? 's' : ''} selected`}
            </Text>
          </TouchableOpacity>
        </Card>

        {/* Block Actions */}
        <Card padding="lg" style={styles.card}>
          <Text style={styles.cardTitle}>Block Controls</Text>
          <Button
            label={sessionActive ? 'Unblock All Apps' : 'Block All Apps'}
            onPress={sessionActive ? handleUnblockAll : handleBlockAll}
            variant={sessionActive ? 'danger' : 'primary'}
            size="lg"
            fullWidth
            disabled={!sessionActive && blockedPackages.length === 0}
          />
        </Card>

        {/* Temporary Block */}
        <Card padding="lg" style={styles.card}>
          <Text style={styles.cardTitle}>Temporary Block</Text>
          <Text style={styles.helpText}>Block apps for a specific duration</Text>
          <Input
            label="Duration (seconds)"
            value={duration}
            onChangeText={setDuration}
            keyboardType="numeric"
            placeholder="15"
            editable={!sessionActive}
          />
          <Button
            label="Start Temporary Block"
            onPress={handleTemporaryBlock}
            variant="secondary"
            size="md"
            fullWidth
            disabled={sessionActive}
          />
        </Card>

        {/* Temporary Unblock */}
        {sessionActive && (
          <Card padding="lg" style={styles.card}>
            <Text style={styles.cardTitle}>Temporary Unblock</Text>
            <Text style={styles.helpText}>
              Pause blocking for a specific duration, then automatically resume
            </Text>
            <Input
              label="Duration (seconds)"
              value={unblockDuration}
              onChangeText={setUnblockDuration}
              keyboardType="numeric"
              placeholder="60"
            />
            <Button
              label="Start Temporary Unblock"
              onPress={handleTemporaryUnblock}
              variant="outline"
              size="md"
              fullWidth
            />
          </Card>
        )}
      </ScrollView>

      {/* App Picker Modal */}
      <Modal visible={showAppPicker} animationType="slide" onRequestClose={() => setShowAppPicker(false)}>
        <SafeAreaView style={{ flex: 1 }}>
          {loadingApps && installedApps.length === 0 ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={colors.primary[500]} />
              <Text style={styles.loadingText}>Loading apps...</Text>
            </View>
          ) : (
            <AppSelector
              mode="list"
              apps={installedApps}
              selectedIds={blockedPackages}
              onChange={setBlockedPackages}
              searchable
              groupBy="category"
              onSubmit={handleAppsSelected}
              onCancel={() => setShowAppPicker(false)}
            />
          )}
        </SafeAreaView>
      </Modal>

      {/* Toast */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.lightAlt,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  selectButton: {
    backgroundColor: colors.primary[50],
    padding: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  selectText: {
    ...typography.bodyMedium,
    color: colors.primary[600],
    textAlign: 'center',
  },
  helpText: {
    ...typography.bodyMedium,
    color: colors.text.light.secondary,
    marginBottom: spacing.md,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.bodyMedium,
    color: colors.text.light.secondary,
    marginTop: spacing.md,
  },
})
