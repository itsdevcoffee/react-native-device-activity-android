import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

/**
 * Root layout for the entire app
 * Manages navigation and global providers
 */
export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      />
    </>
  )
}
