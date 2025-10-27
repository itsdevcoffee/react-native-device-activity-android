import { NativeModules, Platform, Image } from 'react-native'
import { ROBOT_HEAD_IMAGE, ICON_VERSION_NUMBER } from '../constants'

const { RNDeviceActivityAndroid } = NativeModules

/**
 * Ensures the custom shield icon is copied from assets to internal storage.
 * Uses versioning to support cache invalidation when the icon changes.
 *
 * @returns The absolute path to the cached icon file, or null if the operation failed
 */
export async function ensureCustomIconCached(): Promise<string | null> {
  if (Platform.OS !== 'android') {
    console.log('[IconHelper]: Skipping icon cache on non-Android platform')
    return null
  }

  try {
    // Resolve the asset source to get the actual bundled location
    const resolvedSource = Image.resolveAssetSource(ROBOT_HEAD_IMAGE)

    if (!resolvedSource || !resolvedSource.uri) {
      console.error('[IconHelper]: Failed to resolve image asset')
      return null
    }

    console.log('[IconHelper]: Resolved asset URI:', resolvedSource.uri)
    console.log('[IconHelper]: Attempting to cache icon with version:', ICON_VERSION_NUMBER)

    // Call native module method to copy asset to internal storage
    const cachedPath = await RNDeviceActivityAndroid.ensureIconCached(
      resolvedSource.uri,
      ICON_VERSION_NUMBER
    )

    if (cachedPath) {
      console.log('[IconHelper]: Custom icon cached successfully:', cachedPath)
      return cachedPath
    } else {
      console.warn('[IconHelper]: Failed to cache custom icon - returned null. Check native logs for details.')
      return null
    }
  } catch (error) {
    console.error('[IconHelper]: Error caching custom icon:', error)
    return null
  }
}
