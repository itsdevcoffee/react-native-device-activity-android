package com.breakrr.deviceactivity

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * Helper class for managing shield configurations in persistent storage.
 * Supports pre-registration of shield configs that can be referenced by ID.
 */
object ShieldConfigurationStorageHelper {
  private const val PREFS_NAME = "DeviceActivityPrefs"
  private const val KEY_SHIELD_CONFIGS = "shield_configurations"

  // In-memory cache of configurations
  private val configCache = mutableMapOf<String, BlockerAccessibilityService.ShieldStyle>()

  /**
   * Save a shield configuration with a given ID.
   */
  fun saveConfiguration(
    context: Context,
    configId: String,
    style: BlockerAccessibilityService.ShieldStyle
  ) {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val existingConfigs = loadAllConfigurations(context).toMutableMap()

    // Add or update the configuration
    existingConfigs[configId] = style
    configCache[configId] = style

    // Serialize all configurations
    val configsJson = JSONObject()
    for ((id, config) in existingConfigs) {
      configsJson.put(id, serializeShieldStyle(config))
    }

    prefs.edit()
      .putString(KEY_SHIELD_CONFIGS, configsJson.toString())
      .apply()

    android.util.Log.d("RNDeviceActivity", "Saved shield configuration: $configId")
  }

  /**
   * Get a shield configuration by ID.
   * Returns null if not found.
   */
  fun getConfiguration(context: Context, configId: String): BlockerAccessibilityService.ShieldStyle? {
    // Check cache first
    if (configCache.containsKey(configId)) {
      return configCache[configId]
    }

    // Load from storage
    val allConfigs = loadAllConfigurations(context)
    val config = allConfigs[configId]

    // Update cache if found
    if (config != null) {
      configCache[configId] = config
    }

    return config
  }

  /**
   * Load all shield configurations from storage.
   */
  fun loadAllConfigurations(context: Context): Map<String, BlockerAccessibilityService.ShieldStyle> {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val configsJson = prefs.getString(KEY_SHIELD_CONFIGS, null) ?: return emptyMap()

    return try {
      val configsObj = JSONObject(configsJson)
      val result = mutableMapOf<String, BlockerAccessibilityService.ShieldStyle>()

      val keys = configsObj.keys()
      while (keys.hasNext()) {
        val id = keys.next()
        val styleJson = configsObj.getJSONObject(id)
        result[id] = deserializeShieldStyle(styleJson)
      }

      // Update cache
      configCache.clear()
      configCache.putAll(result)

      result
    } catch (e: Exception) {
      android.util.Log.e("RNDeviceActivity", "Failed to load shield configurations", e)
      emptyMap()
    }
  }

  /**
   * Remove a shield configuration by ID.
   * Returns true if the configuration was found and removed.
   */
  fun removeConfiguration(context: Context, configId: String): Boolean {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val existingConfigs = loadAllConfigurations(context).toMutableMap()

    val removed = existingConfigs.remove(configId) != null
    if (removed) {
      configCache.remove(configId)

      // Serialize remaining configurations
      val configsJson = JSONObject()
      for ((id, config) in existingConfigs) {
        configsJson.put(id, serializeShieldStyle(config))
      }

      prefs.edit()
        .putString(KEY_SHIELD_CONFIGS, configsJson.toString())
        .apply()

      android.util.Log.d("RNDeviceActivity", "Removed shield configuration: $configId")
    }

    return removed
  }

  /**
   * Clear all shield configurations.
   */
  fun clearAllConfigurations(context: Context) {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    prefs.edit()
      .remove(KEY_SHIELD_CONFIGS)
      .apply()

    configCache.clear()
    android.util.Log.d("RNDeviceActivity", "Cleared all shield configurations")
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
