package com.breakrr.deviceactivity

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

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

    private var staticReactContext: ReactApplicationContext? = null
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
}
