package com.breakrr.deviceactivity

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * Helper class for saving and restoring session data to/from SharedPreferences.
 * Used for temporary unblock feature to persist sessions across app restarts.
 */
object SessionStorageHelper {
  private const val PREFS_NAME = "DeviceActivityPrefs"
  private const val KEY_SESSIONS = "saved_sessions"
  private const val KEY_STYLES = "saved_styles"

  /**
   * Save current sessions and styles to SharedPreferences.
   */
  fun saveSessions(
    context: Context,
    sessions: Map<String, SessionState>,
    styles: Map<String, BlockerAccessibilityService.ShieldStyle>
  ) {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val editor = prefs.edit()

    // Serialize sessions to JSON
    val sessionsJson = JSONArray()
    for ((id, session) in sessions) {
      val sessionObj = JSONObject().apply {
        put("id", session.id)
        put("blocked", JSONArray(session.blocked.toList()))
        put("allow", JSONArray(session.allow.toList()))
        put("startsAt", session.startsAt ?: JSONObject.NULL)
        put("endsAt", session.endsAt ?: JSONObject.NULL)
      }
      sessionsJson.put(sessionObj)
    }

    // Serialize styles to JSON
    val stylesJson = JSONObject()
    for ((id, style) in styles) {
      val styleObj = JSONObject().apply {
        put("title", style.title)
        put("message", style.message)
        put("ctaText", style.ctaText)
      }
      stylesJson.put(id, styleObj)
    }

    editor.putString(KEY_SESSIONS, sessionsJson.toString())
    editor.putString(KEY_STYLES, stylesJson.toString())
    editor.apply()

    android.util.Log.d("RNDeviceActivity", "Saved ${sessions.size} sessions to SharedPreferences")
  }

  /**
   * Restore sessions and styles from SharedPreferences and add them to the service.
   * Returns true if sessions were restored, false if no saved sessions found.
   */
  fun restoreSessions(context: Context): Boolean {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val sessionsJson = prefs.getString(KEY_SESSIONS, null) ?: return false
    val stylesJson = prefs.getString(KEY_STYLES, null)

    try {
      // Parse sessions
      val sessionsArray = JSONArray(sessionsJson)
      if (sessionsArray.length() == 0) {
        return false
      }

      val styles = mutableMapOf<String, BlockerAccessibilityService.ShieldStyle>()

      // Parse styles if available
      if (stylesJson != null) {
        val stylesObj = JSONObject(stylesJson)
        val keys = stylesObj.keys()
        while (keys.hasNext()) {
          val id = keys.next()
          val styleObj = stylesObj.getJSONObject(id)
          styles[id] = BlockerAccessibilityService.ShieldStyle(
            title = styleObj.getString("title"),
            message = styleObj.getString("message"),
            ctaText = styleObj.getString("ctaText")
          )
        }
      }

      // Restore each session
      for (i in 0 until sessionsArray.length()) {
        val sessionObj = sessionsArray.getJSONObject(i)
        val id = sessionObj.getString("id")

        val blocked = mutableSetOf<String>()
        val blockedArray = sessionObj.getJSONArray("blocked")
        for (j in 0 until blockedArray.length()) {
          blocked.add(blockedArray.getString(j))
        }

        val allow = mutableSetOf<String>()
        val allowArray = sessionObj.getJSONArray("allow")
        for (j in 0 until allowArray.length()) {
          allow.add(allowArray.getString(j))
        }

        val startsAt = if (sessionObj.isNull("startsAt")) null else sessionObj.getLong("startsAt")
        val endsAt = if (sessionObj.isNull("endsAt")) null else sessionObj.getLong("endsAt")

        val session = SessionState(
          id = id,
          blocked = blocked,
          allow = allow,
          startsAt = startsAt,
          endsAt = endsAt
        )

        BlockerAccessibilityService.addSession(session, styles[id])
      }

      // Clear saved data after restoration
      prefs.edit()
        .remove(KEY_SESSIONS)
        .remove(KEY_STYLES)
        .apply()

      android.util.Log.d("RNDeviceActivity", "Restored ${sessionsArray.length()} sessions from SharedPreferences")
      return true

    } catch (e: Exception) {
      android.util.Log.e("RNDeviceActivity", "Failed to restore sessions", e)
      return false
    }
  }

  /**
   * Clear any saved session data.
   */
  fun clearSavedSessions(context: Context) {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    prefs.edit()
      .remove(KEY_SESSIONS)
      .remove(KEY_STYLES)
      .apply()
  }
}
