import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button } from '../../components/ui'
import { colors } from '../../theme/colors'
import { typography } from '../../theme/typography'
import { spacing } from '../../theme/spacing'

/**
 * Welcome/onboarding screen
 * Shows value proposition and gets user started
 */
export default function WelcomeScreen() {
  const router = useRouter()

  const handleGetStarted = () => {
    router.push('/(onboarding)/permissions')
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <Text style={styles.icon}>🔒</Text>
          <Text style={styles.title}>Device Activity Android</Text>
          <Text style={styles.subtitle}>
            Stay focused. Block distractions. Take control of your screen time.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <Feature
            icon="🚫"
            title="Block Apps"
            description="Prevent access to distracting apps during focus sessions"
          />
          <Feature
            icon="⏰"
            title="Time-Based Sessions"
            description="Schedule blocking with automatic start and end times"
          />
          <Feature
            icon="🎨"
            title="Custom Overlays"
            description="Personalize block screens with themes and messages"
          />
          <Feature
            icon="📊"
            title="Track Attempts"
            description="See when and how often you try to open blocked apps"
          />
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.footer}>
        <Button
          label="Get Started"
          onPress={handleGetStarted}
          variant="primary"
          size="lg"
          fullWidth
        />
      </View>
    </SafeAreaView>
  )
}

interface FeatureProps {
  icon: string
  title: string
  description: string
}

function Feature({ icon, title, description }: FeatureProps) {
  return (
    <View style={styles.feature}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.lightAlt,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
  },
  hero: {
    alignItems: 'center',
    paddingTop: spacing.xxxxl,
    paddingBottom: spacing.xxxl,
  },
  icon: {
    fontSize: 80,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.displaySmall,
    color: colors.text.light.primary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.text.light.secondary,
    textAlign: 'center',
    maxWidth: 320,
  },
  features: {
    gap: spacing.lg,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
    backgroundColor: colors.surface.light,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  featureIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    ...typography.headingSmall,
    color: colors.text.light.primary,
    marginBottom: spacing.xxs,
  },
  featureDescription: {
    ...typography.bodyMedium,
    color: colors.text.light.secondary,
  },
  footer: {
    padding: spacing.xl,
    backgroundColor: colors.surface.light,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
})
