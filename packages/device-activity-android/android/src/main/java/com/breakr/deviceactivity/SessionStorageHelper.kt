package com.breakr.deviceactivity

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

    // Serialize styles to JSON (using comprehensive serialization)
    val stylesJson = JSONObject()
    for ((id, style) in styles) {
      stylesJson.put(id, serializeShieldStyle(style))
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

      // Parse styles if available (using comprehensive deserialization)
      if (stylesJson != null) {
        val stylesObj = JSONObject(stylesJson)
        val keys = stylesObj.keys()
        while (keys.hasNext()) {
          val id = keys.next()
          val styleObj = stylesObj.getJSONObject(id)
          styles[id] = deserializeShieldStyle(styleObj)
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

  /**
   * Serialize a ShieldStyle to JSON.
   */
  private fun serializeShieldStyle(style: BlockerAccessibilityService.ShieldStyle): JSONObject {
    return JSONObject().apply {
      put("title", style.title)
      put("subtitle", style.subtitle ?: JSONObject.NULL)
      put("message", style.message ?: JSONObject.NULL)
      put("primaryButtonLabel", style.primaryButtonLabel)
      put("secondaryButtonLabel", style.secondaryButtonLabel ?: JSONObject.NULL)
      @Suppress("DEPRECATION")
      put("ctaText", style.ctaText ?: JSONObject.NULL)

      // Serialize colors
      put("titleColor", style.titleColor?.let { serializeRGBColor(it) } ?: JSONObject.NULL)
      put("subtitleColor", style.subtitleColor?.let { serializeRGBColor(it) } ?: JSONObject.NULL)
      put("primaryButtonLabelColor", style.primaryButtonLabelColor?.let { serializeRGBColor(it) } ?: JSONObject.NULL)
      put("secondaryButtonLabelColor", style.secondaryButtonLabelColor?.let { serializeRGBColor(it) } ?: JSONObject.NULL)
      put("backgroundColor", style.backgroundColor?.let { serializeRGBColor(it) } ?: JSONObject.NULL)
      put("primaryButtonBackgroundColor", style.primaryButtonBackgroundColor?.let { serializeRGBColor(it) } ?: JSONObject.NULL)
      put("secondaryButtonBackgroundColor", style.secondaryButtonBackgroundColor?.let { serializeRGBColor(it) } ?: JSONObject.NULL)
      put("iconTint", style.iconTint?.let { serializeRGBColor(it) } ?: JSONObject.NULL)

      put("primaryImagePath", style.primaryImagePath ?: JSONObject.NULL)
      put("iconSize", style.iconSize ?: JSONObject.NULL)
      put("backgroundBlurStyle", style.backgroundBlurStyle ?: JSONObject.NULL)
    }
  }

  /**
   * Deserialize a ShieldStyle from JSON.
   */
  private fun deserializeShieldStyle(json: JSONObject): BlockerAccessibilityService.ShieldStyle {
    return BlockerAccessibilityService.ShieldStyle(
      title = json.optString("title", "Stay Focused"),
      subtitle = if (json.isNull("subtitle")) null else json.getString("subtitle"),
      message = if (json.isNull("message")) null else json.getString("message"),
      primaryButtonLabel = json.optString("primaryButtonLabel", "Return to Focus"),
      secondaryButtonLabel = if (json.isNull("secondaryButtonLabel")) null else json.getString("secondaryButtonLabel"),
      ctaText = if (json.isNull("ctaText")) null else json.getString("ctaText"),

      // Deserialize colors
      titleColor = if (json.isNull("titleColor")) null else deserializeRGBColor(json.getJSONObject("titleColor")),
      subtitleColor = if (json.isNull("subtitleColor")) null else deserializeRGBColor(json.getJSONObject("subtitleColor")),
      primaryButtonLabelColor = if (json.isNull("primaryButtonLabelColor")) null else deserializeRGBColor(json.getJSONObject("primaryButtonLabelColor")),
      secondaryButtonLabelColor = if (json.isNull("secondaryButtonLabelColor")) null else deserializeRGBColor(json.getJSONObject("secondaryButtonLabelColor")),
      backgroundColor = if (json.isNull("backgroundColor")) null else deserializeRGBColor(json.getJSONObject("backgroundColor")),
      primaryButtonBackgroundColor = if (json.isNull("primaryButtonBackgroundColor")) null else deserializeRGBColor(json.getJSONObject("primaryButtonBackgroundColor")),
      secondaryButtonBackgroundColor = if (json.isNull("secondaryButtonBackgroundColor")) null else deserializeRGBColor(json.getJSONObject("secondaryButtonBackgroundColor")),
      iconTint = if (json.isNull("iconTint")) null else deserializeRGBColor(json.getJSONObject("iconTint")),

      primaryImagePath = if (json.isNull("primaryImagePath")) null else json.getString("primaryImagePath"),
      iconSize = if (json.isNull("iconSize")) null else json.getInt("iconSize"),
      backgroundBlurStyle = if (json.isNull("backgroundBlurStyle")) null else json.getString("backgroundBlurStyle")
    )
  }

  /**
   * Serialize an RGBColor to JSON.
   */
  private fun serializeRGBColor(color: BlockerAccessibilityService.RGBColor): JSONObject {
    return JSONObject().apply {
      put("red", color.red)
      put("green", color.green)
      put("blue", color.blue)
      put("alpha", color.alpha)
    }
  }

  /**
   * Deserialize an RGBColor from JSON.
   */
  private fun deserializeRGBColor(json: JSONObject): BlockerAccessibilityService.RGBColor {
    return BlockerAccessibilityService.RGBColor(
      red = json.getInt("red"),
      green = json.getInt("green"),
      blue = json.getInt("blue"),
      alpha = json.optInt("alpha", 255)
    )
  }
}
