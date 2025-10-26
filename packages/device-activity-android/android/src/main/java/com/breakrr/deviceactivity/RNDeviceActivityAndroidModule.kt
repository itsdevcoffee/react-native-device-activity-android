package com.breakrr.deviceactivity

import android.app.AlarmManager
import android.app.AppOpsManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.net.Uri
import android.os.Build
import android.provider.Settings
import android.util.Base64
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.ByteArrayOutputStream

/**
 * React Native bridge module for Device Activity Android.
 *
 * Provides methods to manage blocking sessions and request required permissions.
 */
class RNDeviceActivityAndroidModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  companion object {
    const val NAME = "RNDeviceActivityAndroid"
    private const val EVENT_NAME = "RNDeviceActivityAndroidEvents"

    /**
     * Send an event to React Native JavaScript.
     */
    fun sendEvent(eventType: String, packageName: String, sessionId: String) {
      // This will be called from the accessibility service
      // We need a reference to the react context
      staticReactContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        ?.emit(EVENT_NAME, createEventMap(eventType, packageName, sessionId))
    }

    fun sendServiceStateEvent(running: Boolean) {
      val map = Arguments.createMap().apply {
        putString("type", "service_state")
        putBoolean("running", running)
        putDouble("ts", System.currentTimeMillis().toDouble())
      }
      staticReactContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        ?.emit(EVENT_NAME, map)
    }

    private fun createEventMap(eventType: String, packageName: String, sessionId: String): WritableMap {
      return Arguments.createMap().apply {
        putString("type", eventType)
        putString("packageName", packageName)
        putString("sessionId", sessionId)
        putDouble("ts", System.currentTimeMillis().toDouble())
      }
    }

    // Internal so it can be accessed by TemporaryUnblockReceiver
    internal var staticReactContext: ReactApplicationContext? = null
  }

  init {
    staticReactContext = reactContext
  }

  override fun getName(): String = NAME

  /**
   * Get current permission status.
   */
  @ReactMethod
  fun getPermissionsStatus(promise: Promise) {
    try {
      val status = Arguments.createMap().apply {
        putBoolean("accessibilityEnabled", isAccessibilityServiceEnabled())
        putBoolean("overlayEnabled", canDrawOverlays())
        putBoolean("usageAccessEnabled", hasUsageStatsPermission())
        putBoolean("scheduleExactAlarmEnabled", canScheduleExactAlarms())
      }
      promise.resolve(status)
    } catch (e: Exception) {
      promise.reject("ERROR", "Failed to get permissions status", e)
    }
  }

  /**
   * Request accessibility service permission.
   * Opens system settings for user to enable the service.
   */
  @ReactMethod
  fun requestAccessibilityPermission(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK
      }
      reactContext.startActivity(intent)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("ERROR", "Failed to open accessibility settings", e)
    }
  }

  /**
   * Request overlay permission.
   * Opens system settings for user to grant permission.
   */
  @ReactMethod
  fun requestOverlayPermission(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        val intent = Intent(
          Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
          Uri.parse("package:${reactContext.packageName}")
        ).apply {
          flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        reactContext.startActivity(intent)
      }
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("ERROR", "Failed to open overlay settings", e)
    }
  }

  /**
   * Request usage access permission.
   * Opens system settings for user to grant permission.
   */
  @ReactMethod
  fun requestUsageAccessPermission(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK
      }
      reactContext.startActivity(intent)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("ERROR", "Failed to open usage access settings", e)
    }
  }

  /**
   * Request schedule exact alarm permission (Android 13+).
   * Opens system settings for user to grant permission.
   * On Android 12, this permission is automatically granted.
   */
  @ReactMethod
  fun requestScheduleExactAlarmPermission(promise: Promise) {
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        val intent = Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
          flags = Intent.FLAG_ACTIVITY_NEW_TASK
          data = Uri.parse("package:${reactContext.packageName}")
        }
        reactContext.startActivity(intent)
      }
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("ERROR", "Failed to open schedule exact alarm settings", e)
    }
  }

  /**
   * Start a new blocking session.
   */
  @ReactMethod
  fun startSession(configMap: ReadableMap, styleMap: ReadableMap, promise: Promise) {
    try {
      val config = parseSessionConfig(configMap)
      val style = parseShieldStyle(styleMap)

      BlockerAccessibilityService.addSession(config, style)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("ERROR", "Failed to start session", e)
    }
  }

  /**
   * Update an existing session.
   */
  @ReactMethod
  fun updateSession(configMap: ReadableMap, promise: Promise) {
    try {
      val id = configMap.getString("id")
        ?: throw IllegalArgumentException("Session id is required")

      val config = parseSessionConfig(configMap)
      BlockerAccessibilityService.addSession(config, null)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("ERROR", "Failed to update session", e)
    }
  }

  /**
   * Stop a specific session.
   */
  @ReactMethod
  fun stopSession(sessionId: String, promise: Promise) {
    try {
      BlockerAccessibilityService.removeSession(sessionId)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("ERROR", "Failed to stop session", e)
    }
  }

  /**
   * Stop all sessions.
   */
  @ReactMethod
  fun stopAllSessions(promise: Promise) {
    try {
      BlockerAccessibilityService.removeAllSessions()

      // Clear persisted sessions
      SessionStorageHelper.clearSavedSessions(reactContext)

      // Cancel any pending temporary unblock alarms
      cancelTemporaryUnblockAlarm()

      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("ERROR", "Failed to stop all sessions", e)
    }
  }

  /**
   * Get current foreground app (best effort).
   */
  @ReactMethod
  fun getCurrentForegroundApp(promise: Promise) {
    try {
      val result = Arguments.createMap().apply {
        putString("packageName", BlockerAccessibilityService.currentForegroundPackage)
        putDouble("timestamp", System.currentTimeMillis().toDouble())
      }
      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("ERROR", "Failed to get foreground app", e)
    }
  }

  /**
   * Check if accessibility service is running.
   */
  @ReactMethod
  fun isServiceRunning(promise: Promise) {
    try {
      val running = BlockerAccessibilityService.instance != null
      promise.resolve(running)
    } catch (e: Exception) {
      promise.reject("ERROR", "Failed to check service status", e)
    }
  }

  /**
   * Get list of installed user-facing applications.
   * Returns apps that have a launcher intent and are not system apps.
   * Includes updated system apps (like pre-installed apps from Play Store).
   */
  @ReactMethod
  fun getInstalledApps(includeIcons: Boolean, promise: Promise) {
    try {
      val packageManager = reactContext.packageManager

      // Data class to hold app info before converting to WritableMap
      data class AppData(
        val packageName: String,
        val name: String,
        val icon: String?,
        val category: Int
      )

      val appsList = mutableListOf<AppData>()

      // Get all installed applications
      val installedApps = packageManager.getInstalledApplications(PackageManager.GET_META_DATA)

      android.util.Log.d("RNDeviceActivity", "Total installed apps: ${installedApps.size}")

      for (appInfo in installedApps) {
        val packageName = appInfo.packageName

        // Filter 1: Exclude the current app (don't show the app itself in the selector)
        if (packageName == reactContext.packageName) {
          continue
        }

        // Filter 2: Exclude known system utilities
        val systemUtilities = setOf(
          "com.android.settings",
          "com.android.documentsui",
          "com.android.packageinstaller",
          "com.google.android.packageinstaller"
        )
        if (packageName in systemUtilities) {
          continue
        }

        // Filter 3: Exclude Google core services
        if (packageName.startsWith("com.google.android.gms") ||
            packageName.startsWith("com.google.android.gsf")) {
          continue
        }

        // Filter 4: Must have a launcher activity (filters out background services automatically)
        // This uses getLaunchIntentForPackage() which returns null for apps without launcher
        val launchIntent = try {
          packageManager.getLaunchIntentForPackage(packageName)
        } catch (e: Exception) {
          null
        }

        if (launchIntent == null) {
          continue
        }

        // Filter 5: User app OR updated system app
        val isUserApp = (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) == 0
        val isUpdatedSystemApp = (appInfo.flags and ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) != 0

        if (isUserApp || isUpdatedSystemApp) {
          try {
            val name = appInfo.loadLabel(packageManager).toString()

            // Get category (API 26+)
            val category = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
              appInfo.category
            } else {
              -1 // UNDEFINED for older Android versions
            }

            // Optionally include icon as base64
            val icon = if (includeIcons) {
              try {
                drawableToBase64(appInfo.loadIcon(packageManager))
              } catch (e: Exception) {
                // If icon loading fails, continue without icon
                null
              }
            } else {
              null
            }

            appsList.add(AppData(packageName, name, icon, category))
          } catch (e: Exception) {
            // Skip apps that fail to load
            android.util.Log.w("RNDeviceActivity", "Failed to load app: ${appInfo.packageName}", e)
          }
        }
      }

      // Sort alphabetically by name (case-insensitive)
      appsList.sortBy { it.name.lowercase() }

      android.util.Log.d("RNDeviceActivity", "Final app list size: ${appsList.size}")

      // Convert to WritableArray
      val apps = WritableNativeArray()
      for (appData in appsList) {
        val appMap = WritableNativeMap()
        appMap.putString("packageName", appData.packageName)
        appMap.putString("name", appData.name)
        appMap.putInt("category", appData.category)

        if (includeIcons) {
          if (appData.icon != null) {
            appMap.putString("icon", appData.icon)
          } else {
            appMap.putNull("icon")
          }
        }

        apps.pushMap(appMap)
      }

      promise.resolve(apps)
    } catch (e: Exception) {
      promise.reject("ERROR", "Failed to get installed apps: ${e.message}", e)
    }
  }

  /**
   * Debug method: Export metadata ONLY for apps that pass our filtering.
   * Returns comprehensive metadata for apps that appear in the app selector.
   */
  @ReactMethod
  fun getAppMetadataDebug(promise: Promise) {
    try {
      val packageManager = reactContext.packageManager
      val installedApps = packageManager.getInstalledApplications(PackageManager.GET_META_DATA)

      val appsMetadata = WritableNativeArray()

      for (appInfo in installedApps) {
        val packageName = appInfo.packageName

        // Apply same filtering as getInstalledApps()
        // Filter 1: Exclude the current app
        if (packageName == reactContext.packageName) continue

        // Filter 2: Exclude known system utilities
        val systemUtilities = setOf(
          "com.android.settings",
          "com.android.documentsui",
          "com.android.packageinstaller",
          "com.google.android.packageinstaller"
        )
        if (packageName in systemUtilities) continue

        // Filter 3: Exclude Google core services
        if (packageName.startsWith("com.google.android.gms") ||
            packageName.startsWith("com.google.android.gsf")) continue

        // Filter 4: Must have a launcher activity
        val launchIntent = try {
          packageManager.getLaunchIntentForPackage(packageName)
        } catch (e: Exception) {
          null
        }
        if (launchIntent == null) continue

        // Filter 5: User app OR updated system app
        val isUserApp = (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) == 0
        val isUpdatedSystemApp = (appInfo.flags and ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) != 0
        if (!isUserApp && !isUpdatedSystemApp) continue

        // If we got here, this app passes all filters - include its metadata
        try {
          val metadata = WritableNativeMap()

          // Basic info
          metadata.putString("packageName", appInfo.packageName)
          metadata.putString("name", appInfo.loadLabel(packageManager).toString())

          // Package info (for version, install date, etc.)
          val packageInfo = try {
            packageManager.getPackageInfo(appInfo.packageName, 0)
          } catch (e: Exception) {
            null
          }

          if (packageInfo != null) {
            metadata.putString("versionName", packageInfo.versionName ?: "unknown")
            metadata.putString("versionCode", packageInfo.versionCode.toString())
            metadata.putDouble("firstInstallTime", packageInfo.firstInstallTime.toDouble())
            metadata.putDouble("lastUpdateTime", packageInfo.lastUpdateTime.toDouble())
          }

          // Flags
          metadata.putBoolean("isSystemApp", (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0)
          metadata.putBoolean("isUpdatedSystemApp", (appInfo.flags and ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) != 0)
          metadata.putBoolean("enabled", appInfo.enabled)

          // Launcher check
          val hasLauncher = try {
            packageManager.getLaunchIntentForPackage(appInfo.packageName) != null
          } catch (e: Exception) {
            false
          }
          metadata.putBoolean("hasLauncherActivity", hasLauncher)

          // Paths
          metadata.putString("sourceDir", appInfo.sourceDir)
          metadata.putString("dataDir", appInfo.dataDir)

          // UID
          metadata.putInt("uid", appInfo.uid)

          // Category (Android 8.0+)
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            metadata.putInt("category", appInfo.category)
          }

          appsMetadata.pushMap(metadata)
        } catch (e: Exception) {
          android.util.Log.w("RNDeviceActivity", "Failed to get metadata for: ${appInfo.packageName}", e)
        }
      }

      promise.resolve(appsMetadata)
    } catch (e: Exception) {
      promise.reject("ERROR", "Failed to get app metadata: ${e.message}", e)
    }
  }

  /**
   * Block all installed user apps.
   * Creates a session with all installed apps in the blocked list.
   *
   * @param sessionId Optional session ID (defaults to "block-all")
   * @param endsAt Optional end time in milliseconds
   * @param style Optional shield style configuration
   */
  @ReactMethod
  fun blockAllApps(sessionId: String?, endsAt: Double?, styleMap: ReadableMap?, promise: Promise) {
    try {
      // Get all installed apps
      val packageManager = reactContext.packageManager
      val installedApps = packageManager.getInstalledApplications(PackageManager.GET_META_DATA)

      val blockedPackages = mutableSetOf<String>()

      for (appInfo in installedApps) {
        val packageName = appInfo.packageName

        // Skip current app
        if (packageName == reactContext.packageName) continue

        // Skip system utilities
        val systemUtilities = setOf(
          "com.android.settings",
          "com.android.documentsui",
          "com.android.packageinstaller",
          "com.google.android.packageinstaller"
        )
        if (packageName in systemUtilities) continue

        // Skip Google core services
        if (packageName.startsWith("com.google.android.gms") ||
            packageName.startsWith("com.google.android.gsf")) continue

        // Must have launcher activity
        val launchIntent = try {
          packageManager.getLaunchIntentForPackage(packageName)
        } catch (e: Exception) {
          null
        }
        if (launchIntent == null) continue

        // User app or updated system app
        val isUserApp = (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) == 0
        val isUpdatedSystemApp = (appInfo.flags and ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) != 0

        if (isUserApp || isUpdatedSystemApp) {
          blockedPackages.add(packageName)
        }
      }

      // Create session
      val id = sessionId ?: "block-all"
      val endsAtLong = endsAt?.toLong()
      val session = SessionState(
        id = id,
        blocked = blockedPackages,
        allow = emptySet(),
        startsAt = null,
        endsAt = endsAtLong
      )

      val style = if (styleMap != null) parseShieldStyle(styleMap) else null
      BlockerAccessibilityService.addSession(session, style)

      // Persist session to SharedPreferences for restoration on app restart
      val currentSessions = BlockerAccessibilityService.sessions
      val currentStyles = BlockerAccessibilityService.shieldStyles
      SessionStorageHelper.saveSessions(reactContext, currentSessions, currentStyles)

      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("ERROR", "Failed to block all apps", e)
    }
  }

  /**
   * Unblock all apps by stopping all sessions.
   * Alias for stopAllSessions for API clarity.
   */
  @ReactMethod
  fun unblockAllApps(promise: Promise) {
    try {
      BlockerAccessibilityService.removeAllSessions()

      // Clear persisted sessions since all blocking has been removed
      SessionStorageHelper.clearSavedSessions(reactContext)

      // Cancel any pending temporary unblock alarms
      cancelTemporaryUnblockAlarm()

      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("ERROR", "Failed to unblock all apps", e)
    }
  }

  /**
   * Get current blocking status including active sessions.
   */
  @ReactMethod
  fun getBlockStatus(promise: Promise) {
    try {
      val status = Arguments.createMap().apply {
        putBoolean("isBlocking", BlockerAccessibilityService.hasActiveSessions())
        putInt("activeSessionCount", BlockerAccessibilityService.getActiveSessionCount())
        putArray("activeSessions", BlockerAccessibilityService.getActiveSessionIds())
        putBoolean("isServiceRunning", BlockerAccessibilityService.instance != null)
        putString("currentForegroundApp", BlockerAccessibilityService.currentForegroundPackage)
        putDouble("timestamp", System.currentTimeMillis().toDouble())
      }
      promise.resolve(status)
    } catch (e: Exception) {
      promise.reject("ERROR", "Failed to get block status", e)
    }
  }

  /**
   * Temporarily unblock all apps for a specified duration.
   * After the duration expires, blocking automatically resumes.
   * Uses AlarmManager to work even if app is backgrounded or killed.
   *
   * @param durationSeconds Duration in seconds to pause blocking
   */
  @ReactMethod
  fun temporaryUnblock(durationSeconds: Int, promise: Promise) {
    try {
      if (durationSeconds <= 0) {
        promise.reject("ERROR", "Duration must be greater than 0")
        return
      }

      // Store current sessions and styles
      val savedSessions = BlockerAccessibilityService.getAllSessions()
      val savedStyles = BlockerAccessibilityService.getAllStyles()

      if (savedSessions.isEmpty()) {
        promise.reject("ERROR", "No active sessions to unblock")
        return
      }

      // Save sessions to SharedPreferences (so they persist if app is killed)
      SessionStorageHelper.saveSessions(reactContext, savedSessions, savedStyles)

      // Remove all sessions to unblock apps
      BlockerAccessibilityService.removeAllSessions()

      // Schedule alarm to restore sessions after duration
      val alarmManager = reactContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      val intent = Intent(reactContext, TemporaryUnblockReceiver::class.java).apply {
        action = TemporaryUnblockReceiver.ACTION_RESTORE_SESSIONS
      }

      val pendingIntent = PendingIntent.getBroadcast(
        reactContext,
        0,
        intent,
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
          PendingIntent.FLAG_UPDATE_CURRENT
        }
      )

      val triggerTime = System.currentTimeMillis() + (durationSeconds * 1000L)

      // Use setExactAndAllowWhileIdle for precise timing even in Doze mode
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
        alarmManager.setExactAndAllowWhileIdle(
          AlarmManager.RTC_WAKEUP,
          triggerTime,
          pendingIntent
        )
      } else {
        alarmManager.setExact(
          AlarmManager.RTC_WAKEUP,
          triggerTime,
          pendingIntent
        )
      }

      android.util.Log.d(
        "RNDeviceActivity",
        "Temporary unblock scheduled for $durationSeconds seconds (alarm will fire even if app is killed)"
      )

      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("ERROR", "Failed to temporarily unblock: ${e.message}", e)
    }
  }

  /**
   * Temporarily block all apps for a specified duration.
   * After the duration expires, blocking automatically ends.
   *
   * Uses AlarmManager to work even if app is backgrounded or killed.
   *
   * @param durationSeconds Duration in seconds to block apps
   * @param styleMap Optional shield style configuration
   */
  @ReactMethod
  fun temporaryBlock(durationSeconds: Int, styleMap: ReadableMap?, promise: Promise) {
    try {
      if (durationSeconds <= 0) {
        promise.reject("ERROR", "Duration must be greater than 0")
        return
      }

      // Calculate end time
      val endsAt = System.currentTimeMillis() + (durationSeconds * 1000L)

      // Block all apps with the end time using the same logic as blockAllApps
      // Get all installed apps
      val packageManager = reactContext.packageManager
      val installedApps = packageManager.getInstalledApplications(PackageManager.GET_META_DATA)

      val blockedPackages = mutableSetOf<String>()

      for (appInfo in installedApps) {
        val packageName = appInfo.packageName

        // Skip current app
        if (packageName == reactContext.packageName) continue

        // Skip system utilities
        val systemUtilities = setOf(
          "com.android.settings",
          "com.android.documentsui",
          "com.android.packageinstaller",
          "com.google.android.packageinstaller"
        )
        if (packageName in systemUtilities) continue

        // Skip Google core services
        if (packageName.startsWith("com.google.android.gms") ||
            packageName.startsWith("com.google.android.gsf")) continue

        // Must have launcher activity
        val launchIntent = try {
          packageManager.getLaunchIntentForPackage(packageName)
        } catch (e: Exception) {
          null
        }
        if (launchIntent == null) continue

        // User app or updated system app
        val isUserApp = (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) == 0
        val isUpdatedSystemApp = (appInfo.flags and ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) != 0

        if (isUserApp || isUpdatedSystemApp) {
          blockedPackages.add(packageName)
        }
      }

      // Create session with end time
      val session = SessionState(
        id = "temporary-block",
        blocked = blockedPackages,
        allow = emptySet(),
        startsAt = null,
        endsAt = endsAt
      )

      val style = if (styleMap != null) parseShieldStyle(styleMap) else null
      BlockerAccessibilityService.addSession(session, style)

      // Persist session to SharedPreferences for restoration on app restart
      val currentSessions = BlockerAccessibilityService.sessions
      val currentStyles = BlockerAccessibilityService.shieldStyles
      SessionStorageHelper.saveSessions(reactContext, currentSessions, currentStyles)

      android.util.Log.d(
        "RNDeviceActivity",
        "Temporary block started for $durationSeconds seconds"
      )

      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("ERROR", "Failed to temporarily block: ${e.message}", e)
    }
  }

  /**
   * Required for NativeEventEmitter.
   * Called when JS adds a listener.
   */
  @ReactMethod
  fun addListener(eventName: String) {
    // Keep track of listeners if needed
    // This is required by NativeEventEmitter but we don't need to do anything here
  }

  /**
   * Required for NativeEventEmitter.
   * Called when JS removes listeners.
   */
  @ReactMethod
  fun removeListeners(count: Int) {
    // Keep track of listeners if needed
    // This is required by NativeEventEmitter but we don't need to do anything here
  }

  // Helper methods

  /**
   * Cancel any pending temporary unblock alarm.
   * This ensures that if unblockAllApps is called during a temporary unblock,
   * the sessions won't be automatically restored later.
   */
  private fun cancelTemporaryUnblockAlarm() {
    try {
      val alarmManager = reactContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      val intent = Intent(reactContext, TemporaryUnblockReceiver::class.java).apply {
        action = TemporaryUnblockReceiver.ACTION_RESTORE_SESSIONS
      }

      val pendingIntent = PendingIntent.getBroadcast(
        reactContext,
        0,
        intent,
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
          PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        } else {
          PendingIntent.FLAG_UPDATE_CURRENT
        }
      )

      alarmManager.cancel(pendingIntent)
      pendingIntent.cancel()

      android.util.Log.d("RNDeviceActivity", "Cancelled temporary unblock alarm")
    } catch (e: Exception) {
      android.util.Log.e("RNDeviceActivity", "Failed to cancel temporary unblock alarm", e)
    }
  }

  private fun isAccessibilityServiceEnabled(): Boolean {
    val service = "${reactContext.packageName}/${BlockerAccessibilityService::class.java.canonicalName}"
    val enabledServices = Settings.Secure.getString(
      reactContext.contentResolver,
      Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
    )
    return enabledServices?.contains(service) == true
  }

  private fun canDrawOverlays(): Boolean {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      Settings.canDrawOverlays(reactContext)
    } else {
      true
    }
  }

  private fun hasUsageStatsPermission(): Boolean {
    val appOps = reactContext.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      appOps.unsafeCheckOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        android.os.Process.myUid(),
        reactContext.packageName
      )
    } else {
      @Suppress("DEPRECATION")
      appOps.checkOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        android.os.Process.myUid(),
        reactContext.packageName
      )
    }
    return mode == AppOpsManager.MODE_ALLOWED
  }

  private fun canScheduleExactAlarms(): Boolean {
    // On Android 12 (API 31), permission is automatically granted
    // On Android 13+ (API 33+), user can revoke it
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val alarmManager = reactContext.getSystemService(Context.ALARM_SERVICE) as AlarmManager
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        alarmManager.canScheduleExactAlarms()
      } else {
        true
      }
    } else {
      // Not needed on Android < 12
      true
    }
  }

  private fun parseSessionConfig(map: ReadableMap): SessionState {
    val id = map.getString("id") ?: throw IllegalArgumentException("Session id is required")
    val blockedArray = map.getArray("blockedPackages") ?: Arguments.createArray()
    val allowArray = map.getArray("allowPackages")

    val blocked = mutableSetOf<String>()
    for (i in 0 until blockedArray.size()) {
      blockedArray.getString(i)?.let { blocked.add(it) }
    }

    val allow = mutableSetOf<String>()
    if (allowArray != null) {
      for (i in 0 until allowArray.size()) {
        allowArray.getString(i)?.let { allow.add(it) }
      }
    }

    val startsAt = if (map.hasKey("startsAt")) map.getDouble("startsAt").toLong() else null
    val endsAt = if (map.hasKey("endsAt")) map.getDouble("endsAt").toLong() else null

    return SessionState(id, blocked, allow, startsAt, endsAt)
  }

  private fun parseShieldStyle(map: ReadableMap): BlockerAccessibilityService.ShieldStyle {
    return BlockerAccessibilityService.ShieldStyle(
      title = map.getString("title") ?: "App Blocked",
      message = map.getString("message") ?: "This app is currently blocked.",
      ctaText = map.getString("ctaText") ?: "Dismiss"
    )
  }

  /**
   * Convert drawable to base64 string for React Native.
   * Used for app icons.
   */
  private fun drawableToBase64(drawable: Drawable): String {
    val bitmap = when (drawable) {
      is BitmapDrawable -> drawable.bitmap
      else -> {
        val bitmap = Bitmap.createBitmap(
          drawable.intrinsicWidth,
          drawable.intrinsicHeight,
          Bitmap.Config.ARGB_8888
        )
        val canvas = Canvas(bitmap)
        drawable.setBounds(0, 0, canvas.width, canvas.height)
        drawable.draw(canvas)
        bitmap
      }
    }

    // Scale down if too large (max 96x96 for performance)
    val scaledBitmap = if (bitmap.width > 96 || bitmap.height > 96) {
      Bitmap.createScaledBitmap(bitmap, 96, 96, true)
    } else {
      bitmap
    }

    val outputStream = ByteArrayOutputStream()
    scaledBitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)
    val byteArray = outputStream.toByteArray()
    return Base64.encodeToString(byteArray, Base64.NO_WRAP)
  }
}
