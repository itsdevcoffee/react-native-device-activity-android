package com.breakr.deviceactivity

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * BroadcastReceiver that handles temporary unblock timer expiration.
 * This receiver is triggered by AlarmManager when the temporary unblock period ends.
 * It restores saved sessions and notifies the React Native app.
 */
class TemporaryUnblockReceiver : BroadcastReceiver() {

  companion object {
    const val ACTION_RESTORE_SESSIONS = "com.breakr.deviceactivity.RESTORE_SESSIONS"
    private const val PREFS_NAME = "DeviceActivityPrefs"
    private const val KEY_SAVED_SESSIONS = "saved_sessions_json"
  }

  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != ACTION_RESTORE_SESSIONS) {
      return
    }

    android.util.Log.d("RNDeviceActivity", "TemporaryUnblockReceiver: Alarm fired, restoring sessions")

    // Acquire a wake lock to ensure we have time to complete the operation
    val powerManager = context.getSystemService(Context.POWER_SERVICE) as PowerManager
    val wakeLock = powerManager.newWakeLock(
      PowerManager.PARTIAL_WAKE_LOCK,
      "DeviceActivity::RestoreSessions"
    )
    wakeLock.acquire(10000) // 10 seconds max

    try {
      // Restore sessions from SharedPreferences
      val restored = SessionStorageHelper.restoreSessions(context)

      if (restored) {
        android.util.Log.d("RNDeviceActivity", "Sessions restored from storage")

        // Post to main thread to ensure proper service access
        Handler(Looper.getMainLooper()).post {
          try {
            // Clear cooldown
            BlockerAccessibilityService.instance?.clearCooldown()
            android.util.Log.d("RNDeviceActivity", "Cooldown cleared")

            // Force immediate foreground check with retry
            Handler(Looper.getMainLooper()).postDelayed({
              BlockerAccessibilityService.instance?.checkForegroundNow()
              android.util.Log.d("RNDeviceActivity", "Immediate foreground check triggered")

              // Retry after 500ms to catch any delays
              Handler(Looper.getMainLooper()).postDelayed({
                BlockerAccessibilityService.instance?.checkForegroundNow()
                android.util.Log.d("RNDeviceActivity", "Retry foreground check triggered")
              }, 500)
            }, 100) // Small delay to ensure service is ready
          } catch (e: Exception) {
            android.util.Log.e("RNDeviceActivity", "Error triggering foreground check", e)
          } finally {
            // Release wake lock after operations complete
            if (wakeLock.isHeld) {
              wakeLock.release()
            }
          }
        }

        // Send event to React Native (if app is running)
        try {
          val eventMap = Arguments.createMap().apply {
            putString("type", "temporary_unblock_ended")
            putDouble("ts", System.currentTimeMillis().toDouble())
          }
          RNDeviceActivityAndroidModule.staticReactContext
            ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit("RNDeviceActivityAndroidEvents", eventMap)
        } catch (e: Exception) {
          // App might not be running, which is fine
          android.util.Log.d("RNDeviceActivity", "Could not send event to JS (app may be closed)")
        }

        android.util.Log.d("RNDeviceActivity", "Sessions restored successfully after temporary unblock")
      } else {
        android.util.Log.w("RNDeviceActivity", "No saved sessions found to restore")
        if (wakeLock.isHeld) {
          wakeLock.release()
        }
      }
    } catch (e: Exception) {
      android.util.Log.e("RNDeviceActivity", "Failed to restore sessions after temporary unblock", e)
      if (wakeLock.isHeld) {
        wakeLock.release()
      }
    }
  }
}
