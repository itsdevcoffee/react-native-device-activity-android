/* eslint-disable @typescript-eslint/no-var-requires */
const {
  withAndroidManifest,
  createRunOncePlugin,
} = require('@expo/config-plugins')

/**
 * Expo Config Plugin for Device Activity Android.
 *
 * This plugin automatically configures the Android manifest to include:
 * - Required permissions (SYSTEM_ALERT_WINDOW, PACKAGE_USAGE_STATS)
 * - Accessibility service declaration
 *
 * Usage in app.json:
 * {
 *   "expo": {
 *     "plugins": ["@breakr/react-native-device-activity-android"]
 *   }
 * }
 */
const withDeviceActivityAndroid = (config) => {
  // Add permissions and service to AndroidManifest.xml
  config = withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults

    // Ensure manifest exists
    if (!androidManifest.manifest) {
      androidManifest.manifest = {}
    }

    // Add permissions
    if (!androidManifest.manifest['uses-permission']) {
      androidManifest.manifest['uses-permission'] = []
    }

    const permissions = androidManifest.manifest['uses-permission']

    // Add SYSTEM_ALERT_WINDOW permission
    if (
      !permissions.find(
        (p) =>
          p.$?.['android:name'] === 'android.permission.SYSTEM_ALERT_WINDOW'
      )
    ) {
      permissions.push({
        $: { 'android:name': 'android.permission.SYSTEM_ALERT_WINDOW' },
      })
    }

    // Add PACKAGE_USAGE_STATS permission
    if (
      !permissions.find(
        (p) =>
          p.$?.['android:name'] === 'android.permission.PACKAGE_USAGE_STATS'
      )
    ) {
      permissions.push({
        $: {
          'android:name': 'android.permission.PACKAGE_USAGE_STATS',
          'tools:ignore': 'ProtectedPermissions',
        },
      })
    }

    // Add QUERY_ALL_PACKAGES permission for Android 11+ package visibility
    // This is required to see all installed apps, needed for digital wellbeing apps
    if (
      !permissions.find(
        (p) =>
          p.$?.['android:name'] === 'android.permission.QUERY_ALL_PACKAGES'
      )
    ) {
      permissions.push({
        $: {
          'android:name': 'android.permission.QUERY_ALL_PACKAGES',
          'tools:ignore': 'QueryAllPackagesPermission',
        },
      })
    }

    // Add SCHEDULE_EXACT_ALARM permission for Android 12+ (API 31+)
    // Required for temporary unblock feature to work even when app is backgrounded/killed
    if (
      !permissions.find(
        (p) =>
          p.$?.['android:name'] === 'android.permission.SCHEDULE_EXACT_ALARM'
      )
    ) {
      permissions.push({
        $: {
          'android:name': 'android.permission.SCHEDULE_EXACT_ALARM',
        },
      })
    }

    // Ensure tools namespace is declared
    if (!androidManifest.manifest.$) {
      androidManifest.manifest.$ = {}
    }
    if (!androidManifest.manifest.$['xmlns:tools']) {
      androidManifest.manifest.$['xmlns:tools'] =
        'http://schemas.android.com/tools'
    }

    // Add queries for package visibility (Android 11+)
    // This allows the app to query for all launcher apps
    if (!androidManifest.manifest.queries) {
      androidManifest.manifest.queries = []
    }

    const queries = androidManifest.manifest.queries

    // Add query for MAIN/LAUNCHER intents to see all launcher apps
    const launcherQueryExists = queries.find((q) => {
      if (!q.intent) return false
      const intent = Array.isArray(q.intent) ? q.intent[0] : q.intent
      if (!intent || !intent.action || !intent.category) return false
      const actions = Array.isArray(intent.action) ? intent.action : [intent.action]
      const categories = Array.isArray(intent.category) ? intent.category : [intent.category]
      return (
        actions.some((a) => a.$?.['android:name'] === 'android.intent.action.MAIN') &&
        categories.some((c) => c.$?.['android:name'] === 'android.intent.category.LAUNCHER')
      )
    })

    if (!launcherQueryExists) {
      queries.push({
        intent: [
          {
            action: [
              {
                $: { 'android:name': 'android.intent.action.MAIN' },
              },
            ],
            category: [
              {
                $: { 'android:name': 'android.intent.category.LAUNCHER' },
              },
            ],
          },
        ],
      })
    }

    // Add accessibility service
    const application = androidManifest.manifest.application
    if (application && application.length > 0) {
      const app = application[0]

      if (!app.service) {
        app.service = []
      }

      // Check if service already exists
      const serviceExists = app.service.find(
        (s) =>
          s.$?.['android:name'] ===
          'com.breakr.deviceactivity.BlockerAccessibilityService'
      )

      if (!serviceExists) {
        app.service.push({
          $: {
            'android:name':
              'com.breakr.deviceactivity.BlockerAccessibilityService',
            'android:enabled': 'true',
            'android:exported': 'true',
            'android:permission': 'android.permission.BIND_ACCESSIBILITY_SERVICE',
          },
          'intent-filter': [
            {
              action: [
                {
                  $: {
                    'android:name':
                      'android.accessibilityservice.AccessibilityService',
                  },
                },
              ],
            },
          ],
          'meta-data': [
            {
              $: {
                'android:name': 'android.accessibilityservice',
                'android:resource': '@xml/accessibility_service_config',
              },
            },
          ],
        })
      }

      // Add BroadcastReceiver for temporary unblock alarm
      if (!app.receiver) {
        app.receiver = []
      }

      // Check if receiver already exists
      const receiverExists = app.receiver.find(
        (r) =>
          r.$?.['android:name'] ===
          'com.breakr.deviceactivity.TemporaryUnblockReceiver'
      )

      if (!receiverExists) {
        app.receiver.push({
          $: {
            'android:name':
              'com.breakr.deviceactivity.TemporaryUnblockReceiver',
            'android:enabled': 'true',
            'android:exported': 'false',
          },
          'intent-filter': [
            {
              action: [
                {
                  $: {
                    'android:name':
                      'com.breakr.deviceactivity.RESTORE_SESSIONS',
                  },
                },
              ],
            },
          ],
        })
      }
    }

    return config
  })

  return config
}

const pkg = {
  name: '@breakr/react-native-device-activity-android',
  version: '0.1.0',
}

module.exports = createRunOncePlugin(
  withDeviceActivityAndroid,
  pkg.name,
  pkg.version
)
