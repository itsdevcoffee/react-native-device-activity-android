import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import DeviceActivityAndroid from '@breakrr/react-native-device-activity-android'
import { Button, Card, Toast } from '../../components/ui'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { spacing } from '../../theme/spacing'
import { storageHelpers } from '../../storage'

export default function ExamplesScreen() {
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' as const })

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setToast({ visible: true, message, type })
  }

  const runExample = async (
    id: string,
    title: string,
    shieldConfig: any,
    duration: number
  ) => {
    const packages = storageHelpers.getBlockedPackages()
    if (packages.length === 0) {
      showToast('Please select apps in the Block tab first', 'warning')
      return
    }

    try {
      await DeviceActivityAndroid.configureShielding(id, shieldConfig)
      await DeviceActivityAndroid.startSession(
        {
          id: `example-${id}`,
          blockedPackages: packages,
          endsAt: Date.now() + duration * 1000,
        },
        undefined,
        id
      )
      showToast(`${title} started! Try opening a blocked app.`, 'success')
    } catch (error) {
      showToast('Failed to start example', 'error')
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Examples</Text>
        <Text style={styles.subtitle}>Try different shield overlay styles</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ExampleCard
          icon="⏱️"
          title="Countdown Timer"
          description="Shows time remaining before the app unblocks"
          onTry={() =>
            runExample(
              'countdown',
              'Countdown Timer',
              {
                title: '⏱️ Time Remaining',
                subtitle: 'Stay focused on your goals',
                primaryButtonLabel: 'Close',
                backgroundColor: { red: 245, green: 250, blue: 255 },
                titleColor: { red: 30, green: 30, blue: 30 },
                subtitleColor: { red: 0, green: 122, blue: 255 },
                backgroundBlurStyle: 'light',
              },
              20
            )
          }
        />

        <ExampleCard
          icon="💪"
          title="Power Points"
          description="Displays a custom power points counter"
          onTry={() =>
            runExample(
              'powerpoints',
              'Power Points',
              {
                title: '💪 Power Points',
                subtitle: 'You have {{powerPoints}} points left',
                message: 'Keep focusing to earn more!',
                primaryButtonLabel: 'Back to Work',
                backgroundColor: { red: 255, green: 245, blue: 250 },
                titleColor: { red: 147, green: 51, blue: 234 },
                subtitleColor: { red: 100, green: 100, blue: 100 },
                backgroundBlurStyle: 'light',
              },
              25
            )
          }
        />

        <ExampleCard
          icon="🚫"
          title="App Name Display"
          description="Shows the name of the blocked app dynamically"
          onTry={() =>
            runExample(
              'appname',
              'App Name Display',
              {
                title: '🚫 {{appName}} Blocked',
                subtitle: 'This app is currently restricted',
                message: 'Focus on what matters most',
                primaryButtonLabel: 'Got it',
                backgroundColor: { red: 240, green: 253, blue: 244 },
                titleColor: { red: 5, green: 150, blue: 105 },
                subtitleColor: { red: 107, green: 114, blue: 128 },
                backgroundBlurStyle: 'light',
              },
              30
            )
          }
        />

        <ExampleCard
          icon="🌙"
          title="Dark Mode"
          description="Modern dark theme with custom styling"
          onTry={() =>
            runExample(
              'darkmode',
              'Dark Mode',
              {
                title: '🌙 Focus Mode',
                subtitle: 'Time to stay productive',
                primaryButtonLabel: 'Close',
                backgroundColor: { red: 28, green: 28, blue: 30 },
                titleColor: { red: 255, green: 255, blue: 255 },
                subtitleColor: { red: 174, green: 174, blue: 178 },
                backgroundBlurStyle: 'dark',
              },
              30
            )
          }
        />
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
    </SafeAreaView>
  )
}

interface ExampleCardProps {
  icon: string
  title: string
  description: string
  onTry: () => void
}

function ExampleCard({ icon, title, description, onTry }: ExampleCardProps) {
  return (
    <Card style={styles.card} padding="lg">
      <View style={styles.cardContent}>
        <Text style={styles.cardIcon}>{icon}</Text>
        <View style={styles.cardText}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardDescription}>{description}</Text>
        </View>
      </View>
      <Button label="Try It" onPress={onTry} variant="primary" size="md" fullWidth />
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
  card: {
    marginBottom: spacing.md,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  cardIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    ...typography.headingSmall,
    color: colors.text.light.primary,
    marginBottom: spacing.xxs,
  },
  cardDescription: {
    ...typography.bodyMedium,
    color: colors.text.light.secondary,
  },
})
