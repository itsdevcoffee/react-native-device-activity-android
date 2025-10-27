package com.breakr.deviceactivity

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
import java.io.File

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
    private const val ICON_SIZE_PX = 96
    private const val PNG_COMPRESSION_QUALITY = 100

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

    fun sendSessionExpiredEvent(sessionId: String) {
      val map = Arguments.createMap().apply {
        putString("type", "session_expired")
        putString("sessionId", sessionId)
        putDouble("ts", System.currentTimeMillis().toDouble())
      }
      staticReactContext?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        ?.emit(EVENT_NAME, map)
      android.util.Log.d("RNDeviceActivity", "Session expired event sent for: $sessionId")
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
   * Supports both inline styles and shield configuration IDs.
   *
   * @param configMap Session configuration
   * @param styleMap Optional inline shield style (can be null if using shieldId)
   * @param shieldId Optional shield configuration ID to use
   */
  @ReactMethod
  fun startSession(configMap: ReadableMap, styleMap: ReadableMap?, shieldId: String?, promise: Promise) {
    try {
      val config = parseSessionConfig(configMap)

      // Determine which style to use (priority: inline style > shield ID > default)
      val style = when {
        // If inline style is provided, use it
        styleMap != null -> parseShieldStyle(styleMap)
        // If shield ID is provided, look it up
        shieldId != null -> {
          ShieldConfigurationStorageHelper.getConfiguration(reactContext, shieldId)
            ?: run {
              android.util.Log.w("RNDeviceActivity", "Shield configuration '$shieldId' not found, using default")
              BlockerAccessibilityService.ShieldStyle()
            }
        }
        // Otherwise use default
        else -> BlockerAccessibilityService.ShieldStyle()
      }

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
            val versionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
              packageInfo.longVersionCode.toString()
            } else {
              @Suppress("DEPRECATION")
              packageInfo.versionCode.toString()
            }
            metadata.putString("versionCode", versionCode)
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
   * Get all user-facing apps that should be blockable.
   * Applies the same filtering logic as getInstalledApps().
   *
   * @return Set of package names for blockable apps
   */
  private fun getFilteredUserApps(): Set<String> {
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

    return blockedPackages
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
      val blockedPackages = getFilteredUserApps()

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

      // Get all blockable apps using shared helper
      val blockedPackages = getFilteredUserApps()

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
   * Save a shield configuration with a given ID.
   * The configuration can be referenced later when starting sessions.
   *
   * @param configId Unique identifier for this shield configuration
   * @param styleMap Shield style configuration
   */
  @ReactMethod
  fun configureShielding(configId: String, styleMap: ReadableMap, promise: Promise) {
    try {
      val style = parseShieldStyle(styleMap)
      ShieldConfigurationStorageHelper.saveConfiguration(reactContext, configId, style)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("ERROR", "Failed to configure shielding: ${e.message}", e)
    }
  }

  /**
   * Update an existing shield configuration.
   * If the configuration doesn't exist, it will be created.
   *
   * @param configId Unique identifier for the shield configuration
   * @param styleMap Shield style configuration
   */
  @ReactMethod
  fun updateShielding(configId: String, styleMap: ReadableMap, promise: Promise) {
    try {
      val style = parseShieldStyle(styleMap)
      ShieldConfigurationStorageHelper.saveConfiguration(reactContext, configId, style)
      promise.resolve(null)
    } catch (e: Exception) {
      promise.reject("ERROR", "Failed to update shielding: ${e.message}", e)
    }
  }

  /**
   * Remove a shield configuration by ID.
   * Returns whether the configuration was found and removed.
   *
   * @param configId Unique identifier for the shield configuration
   */
  @ReactMethod
  fun removeShielding(configId: String, promise: Promise) {
    try {
      val removed = ShieldConfigurationStorageHelper.removeConfiguration(reactContext, configId)
      promise.resolve(removed)
    } catch (e: Exception) {
      promise.reject("ERROR", "Failed to remove shielding: ${e.message}", e)
    }
  }

  /**
   * Get all registered shield configurations.
   * Returns a map of configuration IDs to their styles.
   */
  @ReactMethod
  fun getShieldingConfigurations(promise: Promise) {
    try {
      val configurations = ShieldConfigurationStorageHelper.loadAllConfigurations(reactContext)
      val result = Arguments.createMap()

      for ((id, style) in configurations) {
        result.putMap(id, serializeShieldStyle(style))
      }

      promise.resolve(result)
    } catch (e: Exception) {
      promise.reject("ERROR", "Failed to get shielding configurations: ${e.message}", e)
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
    val mode = when {
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
        // API 31+ (Android 12+): Use checkOpNoThrow
        appOps.checkOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS,
          android.os.Process.myUid(),
          reactContext.packageName
        )
      }
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q -> {
        // API 29-30 (Android 10-11): Use unsafeCheckOpNoThrow
        @Suppress("DEPRECATION")
        appOps.unsafeCheckOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS,
          android.os.Process.myUid(),
          reactContext.packageName
        )
      }
      else -> {
        // Below API 29: Use old checkOpNoThrow
        @Suppress("DEPRECATION")
        appOps.checkOpNoThrow(
          AppOpsManager.OPSTR_GET_USAGE_STATS,
          android.os.Process.myUid(),
          reactContext.packageName
        )
      }
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

  /**
   * Parse RGB color from ReadableMap.
   */
  private fun parseRGBColor(map: ReadableMap?): BlockerAccessibilityService.RGBColor? {
    if (map == null) return null

    return try {
      BlockerAccessibilityService.RGBColor(
        red = map.getInt("red"),
        green = map.getInt("green"),
        blue = map.getInt("blue"),
        alpha = if (map.hasKey("alpha")) map.getInt("alpha") else 255
      )
    } catch (e: Exception) {
      android.util.Log.w("RNDeviceActivity", "Failed to parse RGB color", e)
      null
    }
  }

  private fun parseShieldStyle(map: ReadableMap): BlockerAccessibilityService.ShieldStyle {
    return BlockerAccessibilityService.ShieldStyle(
      // Text content
      title = map.getString("title") ?: "Stay Focused",
      subtitle = map.getString("subtitle"),
      message = map.getString("message"),

      // Button configuration
      primaryButtonLabel = map.getString("primaryButtonLabel") ?: "Return to Focus",
      secondaryButtonLabel = map.getString("secondaryButtonLabel"),
      ctaText = map.getString("ctaText"),

      // Text colors
      titleColor = if (map.hasKey("titleColor")) parseRGBColor(map.getMap("titleColor")) else null,
      subtitleColor = if (map.hasKey("subtitleColor")) parseRGBColor(map.getMap("subtitleColor")) else null,
      primaryButtonLabelColor = if (map.hasKey("primaryButtonLabelColor")) parseRGBColor(map.getMap("primaryButtonLabelColor")) else null,
      secondaryButtonLabelColor = if (map.hasKey("secondaryButtonLabelColor")) parseRGBColor(map.getMap("secondaryButtonLabelColor")) else null,

      // Background colors
      backgroundColor = if (map.hasKey("backgroundColor")) parseRGBColor(map.getMap("backgroundColor")) else null,
      primaryButtonBackgroundColor = if (map.hasKey("primaryButtonBackgroundColor")) parseRGBColor(map.getMap("primaryButtonBackgroundColor")) else null,
      secondaryButtonBackgroundColor = if (map.hasKey("secondaryButtonBackgroundColor")) parseRGBColor(map.getMap("secondaryButtonBackgroundColor")) else null,

      // Icon configuration
      iconTint = if (map.hasKey("iconTint")) parseRGBColor(map.getMap("iconTint")) else null,
      primaryImagePath = map.getString("primaryImagePath"),
      iconSystemName = map.getString("iconSystemName"),

      // Blur effect
      backgroundBlurStyle = map.getString("backgroundBlurStyle") ?: "light"
    )
  }

  /**
   * Serialize a ShieldStyle to WritableMap for React Native.
   */
  private fun serializeShieldStyle(style: BlockerAccessibilityService.ShieldStyle): WritableMap {
    val map = Arguments.createMap()

    // Text content
    map.putString("title", style.title)
    style.subtitle?.let { map.putString("subtitle", it) }
    style.message?.let { map.putString("message", it) }

    // Button configuration
    map.putString("primaryButtonLabel", style.primaryButtonLabel)
    style.secondaryButtonLabel?.let { map.putString("secondaryButtonLabel", it) }
    @Suppress("DEPRECATION")
    style.ctaText?.let { map.putString("ctaText", it) }

    // Text colors
    style.titleColor?.let { map.putMap("titleColor", serializeRGBColor(it)) }
    style.subtitleColor?.let { map.putMap("subtitleColor", serializeRGBColor(it)) }
    style.primaryButtonLabelColor?.let { map.putMap("primaryButtonLabelColor", serializeRGBColor(it)) }
    style.secondaryButtonLabelColor?.let { map.putMap("secondaryButtonLabelColor", serializeRGBColor(it)) }

    // Background colors
    style.backgroundColor?.let { map.putMap("backgroundColor", serializeRGBColor(it)) }
    style.primaryButtonBackgroundColor?.let { map.putMap("primaryButtonBackgroundColor", serializeRGBColor(it)) }
    style.secondaryButtonBackgroundColor?.let { map.putMap("secondaryButtonBackgroundColor", serializeRGBColor(it)) }

    // Icon configuration
    style.iconTint?.let { map.putMap("iconTint", serializeRGBColor(it)) }
    style.primaryImagePath?.let { map.putString("primaryImagePath", it) }
    style.iconSystemName?.let { map.putString("iconSystemName", it) }

    // Blur effect
    style.backgroundBlurStyle?.let { map.putString("backgroundBlurStyle", it) }

    return map
  }

  /**
   * Serialize an RGBColor to WritableMap for React Native.
   */
  private fun serializeRGBColor(color: BlockerAccessibilityService.RGBColor): WritableMap {
    val map = Arguments.createMap()
    map.putInt("red", color.red)
    map.putInt("green", color.green)
    map.putInt("blue", color.blue)
    map.putInt("alpha", color.alpha)
    return map
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

    // Scale down if too large for performance
    val scaledBitmap = if (bitmap.width > ICON_SIZE_PX || bitmap.height > ICON_SIZE_PX) {
      Bitmap.createScaledBitmap(bitmap, ICON_SIZE_PX, ICON_SIZE_PX, true)
    } else {
      bitmap
    }

    val outputStream = ByteArrayOutputStream()
    scaledBitmap.compress(Bitmap.CompressFormat.PNG, PNG_COMPRESSION_QUALITY, outputStream)
    val byteArray = outputStream.toByteArray()
    return Base64.encodeToString(byteArray, Base64.NO_WRAP)
  }

  /**
   * Copy asset from React Native bundle to internal storage with versioning.
   * Used for custom shield icons. Handles HTTP URIs (dev mode) and file:// URIs (production).
   *
   * @param imageUri URI to image (e.g., "http://localhost:8081/..." or "file://...")
   * @param version Version number for cache invalidation
   * @return Absolute path to cached file, or null if copy failed
   */
  fun copyAssetToInternalStorage(imageUri: String, version: Int): String? {
    try {
      android.util.Log.d("RNDeviceActivity", "copyAssetToInternalStorage: imageUri = $imageUri, version = $version")

      // Create shield-icons directory in internal storage
      val iconsDir = File(reactContext.filesDir, "shield-icons")
      if (!iconsDir.exists()) {
        val created = iconsDir.mkdirs()
        android.util.Log.d("RNDeviceActivity", "Created icons directory: $created at ${iconsDir.absolutePath}")
      }

      // Generate versioned filename
      val filename = "breakr-icon-v$version.png"
      val targetFile = File(iconsDir, filename)
      android.util.Log.d("RNDeviceActivity", "Target file: ${targetFile.absolutePath}")

      // Check if already cached with correct version
      if (targetFile.exists()) {
        android.util.Log.d("RNDeviceActivity", "Icon already cached: ${targetFile.absolutePath}")
        return targetFile.absolutePath
      }

      // Delete old versions
      iconsDir.listFiles()?.forEach { file ->
        if (file.name.startsWith("breakr-icon-v") && file.name != filename) {
          file.delete()
          android.util.Log.d("RNDeviceActivity", "Deleted old icon version: ${file.name}")
        }
      }

      // Download or copy based on URI type
      val inputStream = when {
        imageUri.startsWith("http://") || imageUri.startsWith("https://") -> {
          android.util.Log.d("RNDeviceActivity", "Downloading from HTTP: $imageUri")
          val url = java.net.URL(imageUri)
          url.openStream()
        }
        imageUri.startsWith("file://") -> {
          android.util.Log.d("RNDeviceActivity", "Reading from file: $imageUri")
          val filePath = imageUri.removePrefix("file://")
          File(filePath).inputStream()
        }
        else -> {
          // Try as asset path (fallback for old behavior)
          android.util.Log.d("RNDeviceActivity", "Trying as asset path: $imageUri")
          val cleanPath = imageUri.removePrefix("./")
          reactContext.assets.open(cleanPath)
        }
      }

      inputStream.use { input ->
        targetFile.outputStream().use { output ->
          val bytesCopied = input.copyTo(output)
          android.util.Log.d("RNDeviceActivity", "Copied $bytesCopied bytes from $imageUri")
        }
      }

      android.util.Log.d("RNDeviceActivity", "Icon cached successfully: ${targetFile.absolutePath}")
      return targetFile.absolutePath

    } catch (e: Exception) {
      android.util.Log.e("RNDeviceActivity", "Failed to copy asset: ${e.javaClass.simpleName}: ${e.message}", e)
      e.printStackTrace()
      return null
    }
  }

  /**
   * Ensure icon is cached in internal storage.
   * Called from React Native to cache custom shield icons.
   *
   * @param imageUri URI to image (resolved from Image.resolveAssetSource())
   * @param version Version number for cache invalidation
   * @param promise Resolves with cached file path or null
   */
  @ReactMethod
  fun ensureIconCached(imageUri: String, version: Int, promise: Promise) {
    android.util.Log.d("RNDeviceActivity", "ensureIconCached called with URI: $imageUri, version: $version")
    try {
      val cachedPath = copyAssetToInternalStorage(imageUri, version)
      if (cachedPath != null) {
        android.util.Log.d("RNDeviceActivity", "Icon cached successfully: $cachedPath")
      } else {
        android.util.Log.w("RNDeviceActivity", "Icon caching returned null for URI: $imageUri")
      }
      promise.resolve(cachedPath)
    } catch (e: Exception) {
      android.util.Log.e("RNDeviceActivity", "Failed to ensure icon cached: ${e.message}", e)
      promise.resolve(null) // Return null instead of rejecting to allow fallback
    }
  }
}
