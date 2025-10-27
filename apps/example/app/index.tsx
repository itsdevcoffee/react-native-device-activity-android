import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { View, StyleSheet } from 'react-native'
import { Loading } from '../components/ui'
import { storageHelpers } from '../storage'

/**
 * Entry point that determines initial route
 * Checks if onboarding is complete and navigates accordingly
 */
export default function Index() {
  const router = useRouter()

  useEffect(() => {
    // Check if onboarding has been completed
    const hasCompletedOnboarding = storageHelpers.getOnboardingComplete()

    // Small delay for smooth transition
    setTimeout(() => {
      if (hasCompletedOnboarding) {
        router.replace('/(tabs)')
      } else {
        router.replace('/(onboarding)/welcome')
      }
    }, 500)
  }, [])

  return (
    <View style={styles.container}>
      <Loading message="Loading..." />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
})
