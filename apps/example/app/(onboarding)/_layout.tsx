import { Stack } from 'expo-router'

/**
 * Onboarding flow layout
 */
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    />
  )
}
