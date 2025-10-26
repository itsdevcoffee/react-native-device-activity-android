package com.breakrr.deviceactivity

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.Arguments
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * BroadcastReceiver that handles temporary unblock timer expiration.
 * This receiver is triggered by AlarmManager when the temporary unblock period ends.
 * It restores saved sessions and notifies the React Native app.
 */
class TemporaryUnblockReceiver : BroadcastReceiver() {

  companion object {
    const val ACTION_RESTORE_SESSIONS = "com.breakrr.deviceactivity.RESTORE_SESSIONS"
    private const val PREFS_NAME = "DeviceActivityPrefs"
    private const val KEY_SAVED_SESSIONS = "saved_sessions_json"
  }

  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != ACTION_RESTORE_SESSIONS) {
      return
    }

    android.util.Log.d("RNDeviceActivity", "TemporaryUnblockReceiver: Alarm fired, restoring sessions")

    try {
      // Restore sessions from SharedPreferences
      val restored = SessionStorageHelper.restoreSessions(context)

      if (restored) {
        // Clear cooldown and trigger immediate check
        BlockerAccessibilityService.clearCooldownAndCheckNow()

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
      }
    } catch (e: Exception) {
      android.util.Log.e("RNDeviceActivity", "Failed to restore sessions after temporary unblock", e)
    }
  }
}
