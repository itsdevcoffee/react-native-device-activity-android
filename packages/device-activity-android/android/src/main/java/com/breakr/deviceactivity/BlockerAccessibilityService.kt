package com.breakr.deviceactivity

import android.accessibilityservice.AccessibilityService
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.widget.Button
import android.widget.TextView
import android.widget.ImageView
import android.widget.FrameLayout

/**
 * Accessibility Service that monitors app switches and shows blocking overlay.
 *
 * Uses a hybrid approach:
 * - UsageStatsManager polling for reliable foreground app detection
 * - AccessibilityService for overlay permissions
 *
 * IMPORTANT: This service requires explicit user consent in Android Settings.
 * See Google Play policy on Accessibility Service usage.
 */
class BlockerAccessibilityService : AccessibilityService() {

  private var overlayView: FrameLayout? = null
  private var windowManager: WindowManager? = null
  private var isOverlayShowing = false
  private var lastDismissedPackage: String? = null
  private var lastDismissedTime: Long = 0
  private val DISMISS_COOLDOWN_MS = 2000L // 2 seconds cooldown
  private var usageStatsManager: UsageStatsManager? = null
  private val handler = Handler(Looper.getMainLooper())
  private val checkInterval = 500L // Check every 500ms for responsiveness
  private var lastForegroundPackage: String? = null

  // Countdown timer for temporary blocks with template variables
  private var countdownTextView: TextView? = null
  private var titleTextView: TextView? = null
  private var subtitleTextView: TextView? = null
  private var countdownRunnable: Runnable? = null
  private var sessionEndTime: Long? = null
  private var currentBlockedPackage: String? = null
  private var currentStyle: ShieldStyle? = null

  // Dynamic power points counter
  private var powerPoints: Int = 24000
  private val random = kotlin.random.Random

  companion object {
    var instance: BlockerAccessibilityService? = null
    var currentForegroundPackage: String? = null
    internal val sessions = mutableMapOf<String, SessionState>()
    internal val shieldStyles = mutableMapOf<String, ShieldStyle>()

    /**
     * Add or update a blocking session.
     */
    fun addSession(session: SessionState, style: ShieldStyle?) {
      sessions[session.id] = session
      if (style != null) {
        shieldStyles[session.id] = style
      }
      android.util.Log.d("BlockerService", "Session added: ${session.id}, blocked: ${session.blocked}")
    }

    /**
     * Remove a session by ID.
     */
    fun removeSession(sessionId: String) {
      sessions.remove(sessionId)
      shieldStyles.remove(sessionId)
    }

    /**
     * Remove all sessions.
     */
    fun removeAllSessions() {
      sessions.clear()
      shieldStyles.clear()
    }

    /**
     * Check if a package should be blocked by any active session.
     */
    fun shouldBlockPackage(packageName: String): Pair<Boolean, String?> {
      val now = System.currentTimeMillis()

      for ((id, session) in sessions) {
        val isActive = session.isActive(now)
        val shouldBlock = session.shouldBlock(packageName)

        android.util.Log.d(
          "BlockerService",
          "Session $id: isActive=$isActive, shouldBlock=$shouldBlock, now=$now, endsAt=${session.endsAt}"
        )

        if (isActive && shouldBlock) {
          return Pair(true, id)
        }
      }
      return Pair(false, null)
    }

    /**
     * Remove sessions that have expired.
     */
    fun cleanupExpiredSessions(now: Long) {
      val expiredSessions = sessions.filter { (_, session) ->
        session.endsAt != null && now > session.endsAt
      }

      if (expiredSessions.isNotEmpty()) {
        android.util.Log.d(
          "BlockerService",
          "Cleaning up ${expiredSessions.size} expired sessions: ${expiredSessions.keys}"
        )

        expiredSessions.keys.forEach { sessionId ->
          sessions.remove(sessionId)
          shieldStyles.remove(sessionId)

          // Notify React Native that the session has ended
          try {
            RNDeviceActivityAndroidModule.sendSessionExpiredEvent(sessionId)
          } catch (e: Exception) {
            android.util.Log.e("BlockerService", "Failed to send session expired event", e)
          }
        }

        // If we removed sessions and no more sessions are blocking, hide the overlay
        val serviceInstance = instance
        if (serviceInstance != null) {
          // Check if there are any remaining active sessions
          if (!hasActiveSessions()) {
            android.util.Log.d("BlockerService", "All sessions expired - hiding overlay")
            serviceInstance.hideOverlay()
          } else {
            android.util.Log.d("BlockerService", "Sessions expired but other sessions still active")
          }
        }
      }
    }

    /**
     * Get the shield style for a session.
     */
    fun getShieldStyle(sessionId: String): ShieldStyle {
      return shieldStyles[sessionId] ?: ShieldStyle()
    }

    /**
     * Check if there are any active sessions.
     */
    fun hasActiveSessions(): Boolean {
      val now = System.currentTimeMillis()
      return sessions.values.any { it.isActive(now) }
    }

    /**
     * Get count of active sessions.
     */
    fun getActiveSessionCount(): Int {
      val now = System.currentTimeMillis()
      return sessions.values.count { it.isActive(now) }
    }

    /**
     * Get IDs of active sessions.
     */
    fun getActiveSessionIds(): com.facebook.react.bridge.WritableArray {
      val now = System.currentTimeMillis()
      val array = com.facebook.react.bridge.WritableNativeArray()
      sessions.values.filter { it.isActive(now) }.forEach { session ->
        array.pushString(session.id)
      }
      return array
    }

    /**
     * Get all sessions (for temporary unblock).
     */
    fun getAllSessions(): Map<String, SessionState> {
      return sessions.toMap()
    }

    /**
     * Get all shield styles (for temporary unblock).
     */
    fun getAllStyles(): Map<String, ShieldStyle> {
      return shieldStyles.toMap()
    }

    /**
     * Clear cooldown state and trigger immediate foreground check.
     * Used after restoring sessions from temporary unblock.
     */
    fun clearCooldownAndCheckNow() {
      instance?.clearCooldown()
      instance?.checkForegroundNow()
    }
  }

  data class RGBColor(
    val red: Int,
    val green: Int,
    val blue: Int,
    val alpha: Int = 255
  ) {
    fun toAndroidColor(): Int {
      return android.graphics.Color.argb(alpha, red, green, blue)
    }
  }

  data class ShieldStyle(
    // Text content
    val title: String = "Stay Focused",
    val subtitle: String? = null,
    val message: String? = null, // Deprecated in favor of subtitle

    // Button configuration
    val primaryButtonLabel: String = "Return to Focus",
    val secondaryButtonLabel: String? = null,

    // Text colors
    val titleColor: RGBColor? = null,
    val subtitleColor: RGBColor? = null,
    val primaryButtonLabelColor: RGBColor? = null,
    val secondaryButtonLabelColor: RGBColor? = null,

    // Background colors
    val backgroundColor: RGBColor? = null,
    val primaryButtonBackgroundColor: RGBColor? = null,
    val secondaryButtonBackgroundColor: RGBColor? = null,

    // Icon configuration
    val iconTint: RGBColor? = null,
    val primaryImagePath: String? = null,
    val iconSystemName: String? = null,
    val iconSize: Int? = null, // Size in dp, defaults to 64dp if not specified

    // Blur effect (Android: light, dark, or none)
    val backgroundBlurStyle: String? = "light", // "light", "dark", "none"

    // Legacy support
    @Deprecated("Use subtitle instead")
    val ctaText: String? = null
  ) {
    // Helper to resolve subtitle with fallback to message or default
    fun resolveSubtitle(): String {
      return subtitle ?: message ?: "This app is blocked during your focus session."
    }

    // Helper to resolve primary button text with fallback
    fun resolvePrimaryButtonLabel(): String {
      return ctaText ?: primaryButtonLabel
    }
  }

  override fun onCreate() {
    super.onCreate()
    instance = this
    windowManager = getSystemService(Context.WINDOW_SERVICE) as WindowManager
    usageStatsManager = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    android.util.Log.d("BlockerService", "Accessibility service created")
  }

  override fun onServiceConnected() {
    super.onServiceConnected()
    android.util.Log.d("BlockerService", "Accessibility service connected")
    RNDeviceActivityAndroidModule.sendServiceStateEvent(true)

    // Restore any persisted blocking sessions
    val restored = SessionStorageHelper.restoreSessions(this)
    if (restored) {
      android.util.Log.d("BlockerService", "Restored blocking sessions from storage")
    }

    // Start polling for foreground app
    startForegroundAppCheck()
  }

  override fun onDestroy() {
    super.onDestroy()
    stopForegroundAppCheck()
    instance = null
    hideOverlay()
    android.util.Log.d("BlockerService", "Accessibility service destroyed")
    RNDeviceActivityAndroidModule.sendServiceStateEvent(false)
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    // Not using events - relying on UsageStatsManager polling for reliability
  }

  override fun onInterrupt() {
    // Called when service is interrupted
    hideOverlay()
  }

  /**
   * Clear the cooldown state.
   * Allows blocked apps to show overlay immediately.
   */
  fun clearCooldown() {
    lastDismissedPackage = null
    lastDismissedTime = 0
    android.util.Log.d("BlockerService", "Cooldown cleared")
  }

  /**
   * Trigger an immediate foreground check.
   * Used after restoring sessions to immediately show overlay if needed.
   */
  fun checkForegroundNow() {
    android.util.Log.d("BlockerService", "Immediate foreground check triggered")

    // First try to get current foreground app from cache
    var foregroundPackage = currentForegroundPackage

    // If not cached, query UsageStatsManager with longer time window
    if (foregroundPackage == null) {
      foregroundPackage = getForegroundAppExtended()
    }

    if (foregroundPackage != null) {
      android.util.Log.d("BlockerService", "Immediate check - Foreground app: $foregroundPackage")

      // Ignore system packages and launchers
      val isLauncher = foregroundPackage.contains("launcher", ignoreCase = true)
      val isSystemUI = foregroundPackage == "com.android.systemui"
      val isOurApp = foregroundPackage == applicationContext.packageName

      if (!isLauncher && !isSystemUI && !isOurApp) {
        // Check if this app should be blocked
        val (shouldBlock, sessionId) = shouldBlockPackage(foregroundPackage)

        if (shouldBlock && sessionId != null) {
          android.util.Log.d("BlockerService", "Immediate check - Should block $foregroundPackage, showing overlay")
          showOverlay(sessionId, foregroundPackage)
          RNDeviceActivityAndroidModule.sendEvent("app_attempt", foregroundPackage, sessionId)
        } else {
          android.util.Log.d("BlockerService", "Immediate check - $foregroundPackage is not blocked (shouldBlock=$shouldBlock, sessionId=$sessionId)")
        }
      } else {
        android.util.Log.d("BlockerService", "Immediate check - Ignoring system/launcher app: $foregroundPackage")
      }
    } else {
      android.util.Log.w("BlockerService", "Immediate check - Could not determine foreground app")
    }
  }

  /**
   * Get foreground app with extended time window (last 30 seconds).
   * Used when we need to find the current app even if there was no recent switch.
   */
  private fun getForegroundAppExtended(): String? {
    try {
      val now = System.currentTimeMillis()
      // Query last 30 seconds to catch the current foreground app
      val usageEvents = usageStatsManager?.queryEvents(now - 30000, now)
      var foregroundApp: String? = null

      usageEvents?.let {
        val event = UsageEvents.Event()
        while (it.hasNextEvent()) {
          it.getNextEvent(event)
          if (event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND) {
            foregroundApp = event.packageName
          }
        }
      }

      return foregroundApp
    } catch (e: Exception) {
      android.util.Log.e("BlockerService", "Error getting foreground app (extended)", e)
      return null
    }
  }

  /**
   * Get the actual foreground app using UsageStatsManager (ground truth).
   */
  private fun getForegroundApp(): String? {
    try {
      val now = System.currentTimeMillis()
      val usageEvents = usageStatsManager?.queryEvents(now - 2000, now)
      var foregroundApp: String? = null

      usageEvents?.let {
        val event = UsageEvents.Event()
        while (it.hasNextEvent()) {
          it.getNextEvent(event)
          if (event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND) {
            foregroundApp = event.packageName
          }
        }
      }

      return foregroundApp
    } catch (e: Exception) {
      android.util.Log.e("BlockerService", "Error getting foreground app", e)
      return null
    }
  }

  /**
   * Periodically check foreground app and show/hide overlay accordingly.
   */
  private val foregroundCheckRunnable = object : Runnable {
    override fun run() {
      // Clean up expired sessions every cycle
      cleanupExpiredSessions(System.currentTimeMillis())

      val foregroundPackage = getForegroundApp()

      if (foregroundPackage != null && foregroundPackage != lastForegroundPackage) {
        lastForegroundPackage = foregroundPackage
        android.util.Log.d("BlockerService", "Foreground app: $foregroundPackage")
      }

      if (foregroundPackage != null) {
        // Ignore system packages and launchers
        val isLauncher = foregroundPackage.contains("launcher", ignoreCase = true)
        val isSystemUI = foregroundPackage == "com.android.systemui"
        val isOurApp = foregroundPackage == applicationContext.packageName

        if (isLauncher || isSystemUI || isOurApp) {
          // User is on home screen or system UI - clear cooldown and hide overlay
          if (isLauncher && lastDismissedPackage != null) {
            android.util.Log.d("BlockerService", "On home screen, clearing cooldown")
            lastDismissedPackage = null
            lastDismissedTime = 0
          }
          hideOverlay()
        } else {
          // Check if this app should be blocked
          val (shouldBlock, sessionId) = shouldBlockPackage(foregroundPackage)

          if (shouldBlock && sessionId != null) {
            // Check cooldown
            val now = System.currentTimeMillis()
            val isInCooldown = foregroundPackage == lastDismissedPackage &&
                              (now - lastDismissedTime) < DISMISS_COOLDOWN_MS

            if (!isInCooldown) {
              if (!isOverlayShowing) {
                android.util.Log.d("BlockerService", "Blocking $foregroundPackage")
                showOverlay(sessionId, foregroundPackage)
                RNDeviceActivityAndroidModule.sendEvent("app_attempt", foregroundPackage, sessionId)
              }
            } else {
              // Still in cooldown, don't show overlay yet
              hideOverlay()
            }
          } else {
            hideOverlay()
          }
        }
      }

      // Schedule next check
      handler.postDelayed(this, checkInterval)
    }
  }

  private fun startForegroundAppCheck() {
    android.util.Log.d("BlockerService", "Starting foreground app monitoring")
    handler.post(foregroundCheckRunnable)
  }

  private fun stopForegroundAppCheck() {
    android.util.Log.d("BlockerService", "Stopping foreground app monitoring")
    handler.removeCallbacks(foregroundCheckRunnable)
  }

  /**
   * Format remaining time in a human-readable format.
   * Examples: "5m 30s", "45s", "1h 23m"
   */
  private fun formatRemainingTime(remainingMs: Long): String {
    val totalSeconds = (remainingMs / 1000).toInt()
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    val seconds = totalSeconds % 60

    return when {
      hours > 0 -> String.format("%dh %dm", hours, minutes)
      minutes > 0 -> String.format("%dm %ds", minutes, seconds)
      else -> String.format("%ds", seconds)
    }
  }

  /**
   * Resolve template variables in a string.
   * Supported variables:
   * - {{countdown}} - Time remaining until unblock
   * - {{powerPoints}} - Example power points value
   * - {{timestamp}} - Current ISO timestamp
   * - {{appName}} - Name of the blocked app
   */
  private fun resolveTemplateVariables(
    text: String,
    blockedPackage: String,
    sessionEndTime: Long?
  ): String {
    var resolved = text

    // {{appName}} - Get the app name
    try {
      val packageManager = applicationContext.packageManager
      val appInfo = packageManager.getApplicationInfo(blockedPackage, 0)
      val appName = packageManager.getApplicationLabel(appInfo).toString()
      resolved = resolved.replace("{{appName}}", appName)
    } catch (e: Exception) {
      resolved = resolved.replace("{{appName}}", blockedPackage)
    }

    // {{countdown}} - Time remaining
    if (sessionEndTime != null) {
      val remaining = sessionEndTime - System.currentTimeMillis()
      val formattedTime = if (remaining > 0) formatRemainingTime(remaining) else "0s"
      resolved = resolved.replace("{{countdown}}", formattedTime)
    } else {
      resolved = resolved.replace("{{countdown}}", "N/A")
    }

    // {{powerPoints}} - Dynamic power points that increase over time
    resolved = resolved.replace("{{powerPoints}}", powerPoints.toString())

    // {{timestamp}} - Current ISO timestamp
    val timestamp = java.text.SimpleDateFormat(
      "yyyy-MM-dd'T'HH:mm:ss'Z'",
      java.util.Locale.US
    ).apply {
      timeZone = java.util.TimeZone.getTimeZone("UTC")
    }.format(java.util.Date())
    resolved = resolved.replace("{{timestamp}}", timestamp)

    return resolved
  }

  /**
   * Start the countdown timer for temporary blocks.
   * Updates all text views that contain template variables.
   */
  private fun startCountdown(endTime: Long) {
    sessionEndTime = endTime
    android.util.Log.d("BlockerService", "startCountdown called with endTime: $endTime, current time: ${System.currentTimeMillis()}")

    countdownRunnable = object : Runnable {
      override fun run() {
        val now = System.currentTimeMillis()
        val remaining = endTime - now
        android.util.Log.d("BlockerService", "Countdown tick: remaining=$remaining ms, formatted=${formatRemainingTime(remaining)}")

        if (remaining > 0) {
          // Increment power points by random amount (23-27)
          powerPoints += random.nextInt(23, 28) // 23 to 27 inclusive

          val formattedTime = formatRemainingTime(remaining)
          val displayText = "Unblocks in $formattedTime"
          android.util.Log.d("BlockerService", "Setting countdown text: '$displayText', powerPoints=$powerPoints")
          countdownTextView?.text = displayText

          // Update all TextViews that may contain template variables
          currentBlockedPackage?.let { pkg ->
            currentStyle?.let { style ->
              // Update title if it contains template variables
              if (style.title?.contains("{{") == true) {
                titleTextView?.text = resolveTemplateVariables(style.title, pkg, sessionEndTime)
              }

              // Update subtitle if it contains template variables
              if (style.subtitle?.contains("{{") == true) {
                subtitleTextView?.text = resolveTemplateVariables(style.subtitle ?: "", pkg, sessionEndTime)
              }
            }
          }

          // Schedule next update in 1 second
          handler.postDelayed(this, 1000)
        } else {
          // Time's up - the cleanup will be handled by cleanupExpiredSessions
          countdownTextView?.apply {
            text = "Unblocking..."
            invalidate()
            requestLayout()
          }
        }
      }
    }

    // Start the countdown immediately
    countdownRunnable?.let { handler.post(it) }
  }

  /**
   * Stop the countdown timer and clear references.
   */
  private fun stopCountdown() {
    countdownRunnable?.let { handler.removeCallbacks(it) }
    countdownRunnable = null
    countdownTextView = null
    titleTextView = null
    subtitleTextView = null
    sessionEndTime = null
    currentBlockedPackage = null
    currentStyle = null
    // Reset power points to starting value
    powerPoints = 24000
  }

  /**
   * Create a modern styled button with rounded corners.
   */
  private fun createStyledButton(
    text: String,
    backgroundColor: Int,
    textColor: Int,
    onClick: () -> Unit
  ): Button {
    return Button(this).apply {
      this.text = text
      textSize = 17f
      val verticalPadding = (16 * resources.displayMetrics.density).toInt()
      setPadding(0, verticalPadding, 0, verticalPadding)
      setTextColor(textColor)
      minHeight = (56 * resources.displayMetrics.density).toInt()

      // Create rounded background
      val drawable = android.graphics.drawable.GradientDrawable().apply {
        shape = android.graphics.drawable.GradientDrawable.RECTANGLE
        setColor(backgroundColor)
        cornerRadius = 14f * resources.displayMetrics.density
      }
      background = drawable

      setOnClickListener { onClick() }

      // Remove default button styling
      isAllCaps = false
      stateListAnimator = null
      gravity = android.view.Gravity.CENTER
    }
  }

  /**
   * Show the blocking overlay with the specified style.
   */
  private fun showOverlay(sessionId: String, blockedPackage: String) {
    if (isOverlayShowing) return

    // Reset power points to starting value for new overlay session
    powerPoints = 24000

    try {
      val layoutParams = WindowManager.LayoutParams().apply {
        type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY
        } else {
          @Suppress("DEPRECATION")
          WindowManager.LayoutParams.TYPE_SYSTEM_OVERLAY
        }
        flags = WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
        format = PixelFormat.TRANSLUCENT
        width = WindowManager.LayoutParams.MATCH_PARENT
        height = WindowManager.LayoutParams.MATCH_PARENT
      }

      // Get shield style
      val style = getShieldStyle(sessionId)

      // Create overlay container with styled background
      val container = FrameLayout(this)
      val backgroundColor = when {
        style.backgroundColor != null -> style.backgroundColor.toAndroidColor()
        style.backgroundBlurStyle == "dark" -> 0xE6000000.toInt()
        style.backgroundBlurStyle == "light" -> 0xF0FFFFFF.toInt()
        else -> 0xE6000000.toInt()
      }
      container.setBackgroundColor(backgroundColor)

      // Create vertical LinearLayout for content (icon, title, subtitle, countdown)
      val contentLayout = android.widget.LinearLayout(this).apply {
        orientation = android.widget.LinearLayout.VERTICAL
        gravity = android.view.Gravity.CENTER_HORIZONTAL  // Only center horizontally, not width
        setPadding(16, 40, 16, 40)  // Reduced horizontal padding since we have margins on parent
      }

      // Create vertical LinearLayout for buttons at bottom
      val buttonLayout = android.widget.LinearLayout(this).apply {
        orientation = android.widget.LinearLayout.VERTICAL
        setPadding(24, 0, 24, 32)
      }

      // Get app icon or custom image
      try {
        // Use iconSize from style if provided, default to 64dp
        val iconSizeDp = style.iconSize ?: 64
        val iconSize = (iconSizeDp * resources.displayMetrics.density).toInt()
        val iconMargin = (32 * resources.displayMetrics.density).toInt()

        val iconView = ImageView(this).apply {
          // Track whether we successfully loaded a custom image
          var loadedCustomImage = false

          // Try to load custom image first, fallback to app icon
          if (style.primaryImagePath != null) {
            try {
              // Load custom image from file system path using BitmapFactory
              val file = java.io.File(style.primaryImagePath)
              if (file.exists()) {
                val bitmap = android.graphics.BitmapFactory.decodeFile(file.absolutePath)
                if (bitmap != null) {
                  setImageBitmap(bitmap)
                  loadedCustomImage = true
                  android.util.Log.d("BlockerService", "Loaded custom icon from: ${file.absolutePath}")
                } else {
                  // Fallback to app icon if bitmap decode fails
                  val packageManager = applicationContext.packageManager
                  val appIcon = packageManager.getApplicationIcon(blockedPackage)
                  setImageDrawable(appIcon)
                  android.util.Log.w("BlockerService", "Failed to decode custom icon, using app icon")
                }
              } else {
                // Fallback to app icon if file doesn't exist
                val packageManager = applicationContext.packageManager
                val appIcon = packageManager.getApplicationIcon(blockedPackage)
                setImageDrawable(appIcon)
                android.util.Log.w("BlockerService", "Custom icon file not found: ${file.absolutePath}, using app icon")
              }
            } catch (e: Exception) {
              android.util.Log.w("BlockerService", "Could not load custom image, using app icon", e)
              val packageManager = applicationContext.packageManager
              val appIcon = packageManager.getApplicationIcon(blockedPackage)
              setImageDrawable(appIcon)
            }
          } else {
            // Use app icon
            val packageManager = applicationContext.packageManager
            val appIcon = packageManager.getApplicationIcon(blockedPackage)
            setImageDrawable(appIcon)
          }

          // Apply color filter only if NOT using a custom image
          if (!loadedCustomImage) {
            // Apply icon tint if specified, otherwise grayscale
            if (style.iconTint != null) {
              setColorFilter(style.iconTint.toAndroidColor(), android.graphics.PorterDuff.Mode.SRC_IN)
            } else {
              // Default iOS-style grayscale treatment
              val colorMatrix = ColorMatrix().apply {
                setSaturation(0f)
              }
              colorFilter = ColorMatrixColorFilter(colorMatrix)
              alpha = 0.4f
            }
          }
          // If custom image was loaded, no color filter is applied - show original colors
        }

        val iconParams = android.widget.LinearLayout.LayoutParams(iconSize, iconSize).apply {
          bottomMargin = iconMargin
        }
        contentLayout.addView(iconView, iconParams)
      } catch (e: Exception) {
        android.util.Log.w("BlockerService", "Could not load icon", e)
      }

      // Get session for template variable resolution
      val session = sessions[sessionId]

      // Store current context for countdown updates
      currentBlockedPackage = blockedPackage
      currentStyle = style

      // Add title with template variable support
      val titleView = TextView(this).apply {
        val resolvedTitle = resolveTemplateVariables(
          style.title ?: "Stay Focused",
          blockedPackage,
          session?.endsAt
        )
        text = resolvedTitle
        textSize = 28f
        val defaultTitleColor = if (style.backgroundBlurStyle == "light") 0xFF2A2A2A.toInt() else 0xFFFFFFFF.toInt()
        setTextColor(style.titleColor?.toAndroidColor() ?: defaultTitleColor)
        gravity = android.view.Gravity.CENTER
        setPadding(0, 0, 0, 16)
        typeface = android.graphics.Typeface.DEFAULT_BOLD
        // Force minimum width to ensure text is visible
        minWidth = (200 * resources.displayMetrics.density).toInt()
        // Ensure text wrapping works properly
        maxLines = 2
        ellipsize = android.text.TextUtils.TruncateAt.END
      }.also {
        titleTextView = it
      }

      // Add subtitle/message with template variable support
      val subtitleView = TextView(this).apply {
        val resolvedSubtitle = resolveTemplateVariables(
          style.subtitle ?: "Open app to unlock",
          blockedPackage,
          session?.endsAt
        )
        text = resolvedSubtitle
        textSize = 16f
        val defaultSubtitleColor = if (style.backgroundBlurStyle == "light") 0xFF6D6D6D.toInt() else 0xFFCCCCCC.toInt()
        setTextColor(style.subtitleColor?.toAndroidColor() ?: defaultSubtitleColor)
        gravity = android.view.Gravity.CENTER
        setPadding(16, 8, 16, 24)
      }.also {
        subtitleTextView = it
      }

      // Add countdown for temporary blocks (if session has endTime)
      val countdownView = if (session?.endsAt != null) {
        android.util.Log.d("BlockerService", "Creating countdown view for session ${session.id}, endsAt: ${session.endsAt}")
        TextView(this).apply {
          text = "Calculating..."
          textSize = 20f  // Increased from 16f
          setTextColor(0xFFFF6B00.toInt()) // Brighter orange color
          gravity = android.view.Gravity.CENTER
          setPadding(0, 16, 0, 32)  // Increased padding
          typeface = android.graphics.Typeface.DEFAULT_BOLD  // Bold font
          // Force minimum dimensions to ensure visibility
          minWidth = (200 * resources.displayMetrics.density).toInt()
          minHeight = (40 * resources.displayMetrics.density).toInt()
        }.also {
          countdownTextView = it
          android.util.Log.d("BlockerService", "countdownTextView assigned, starting countdown...")
          startCountdown(session.endsAt)
        }
      } else {
        android.util.Log.d("BlockerService", "No countdown view created - session.endsAt is null")
        null
      }

      // Add primary dismiss button
      val defaultPrimaryBg = if (style.backgroundBlurStyle == "light") 0xFFFFE3EC.toInt() else 0xFF2196F3.toInt()
      val defaultPrimaryText = if (style.backgroundBlurStyle == "light") 0xFF7A284B.toInt() else 0xFFFFFFFF.toInt()

      val primaryButton = createStyledButton(
        text = style.resolvePrimaryButtonLabel(),
        backgroundColor = style.primaryButtonBackgroundColor?.toAndroidColor() ?: defaultPrimaryBg,
        textColor = style.primaryButtonLabelColor?.toAndroidColor() ?: defaultPrimaryText
      ) {
        // Record dismissal for cooldown
        lastDismissedPackage = blockedPackage
        lastDismissedTime = System.currentTimeMillis()

        hideOverlay()
        RNDeviceActivityAndroidModule.sendEvent("block_dismissed", blockedPackage, sessionId)

        // Return to parent app (the app using this library)
        val parentPackageName = packageName
        val launchIntent = packageManager.getLaunchIntentForPackage(parentPackageName)

        if (launchIntent != null) {
          launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          launchIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
          launchIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
          startActivity(launchIntent)
        } else {
          // Fallback to home screen if launch intent not available
          val homeIntent = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
          }
          startActivity(homeIntent)
        }
      }

      // Add optional secondary button
      val secondaryButton = if (style.secondaryButtonLabel != null) {
        val defaultSecondaryText = if (style.backgroundBlurStyle == "light") 0xFF7C7C7C.toInt() else 0xFFCCCCCC.toInt()

        createStyledButton(
          text = style.secondaryButtonLabel,
          backgroundColor = style.secondaryButtonBackgroundColor?.toAndroidColor() ?: android.graphics.Color.TRANSPARENT,
          textColor = style.secondaryButtonLabelColor?.toAndroidColor() ?: defaultSecondaryText
        ) {
          // Record dismissal for cooldown
          lastDismissedPackage = blockedPackage
          lastDismissedTime = System.currentTimeMillis()

          hideOverlay()
          RNDeviceActivityAndroidModule.sendEvent("secondary_action", blockedPackage, sessionId)

          // Launch the host app (could be used for "Unlock" or similar actions)
          try {
            val launchIntent = packageManager.getLaunchIntentForPackage(applicationContext.packageName)
            if (launchIntent != null) {
              launchIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
              startActivity(launchIntent)
            } else {
              android.util.Log.e("BlockerService", "Could not get launch intent for app")
              // Fallback to home screen
              val homeIntent = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_HOME)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
              }
              startActivity(homeIntent)
            }
          } catch (e: Exception) {
            android.util.Log.e("BlockerService", "Failed to launch host app", e)
            // Fallback to home screen
            val homeIntent = Intent(Intent.ACTION_MAIN).apply {
              addCategory(Intent.CATEGORY_HOME)
              flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            startActivity(homeIntent)
          }
        }
      } else {
        null
      }

      // Add content views to content layout with explicit MATCH_PARENT width
      val titleParams = android.widget.LinearLayout.LayoutParams(
        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
      )
      contentLayout.addView(titleView, titleParams)

      val subtitleParams = android.widget.LinearLayout.LayoutParams(
        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
      )
      contentLayout.addView(subtitleView, subtitleParams)

      // Add countdown view if it exists (temporary block)
      if (countdownView != null) {
        val countdownParams = android.widget.LinearLayout.LayoutParams(
          android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
          android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
        )
        contentLayout.addView(countdownView, countdownParams)
      }

      // Add primary button with full width
      val primaryButtonParams = android.widget.LinearLayout.LayoutParams(
        android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
      ).apply {
        bottomMargin = (12 * resources.displayMetrics.density).toInt()
      }
      buttonLayout.addView(primaryButton, primaryButtonParams)

      // Add secondary button if it exists with full width
      if (secondaryButton != null) {
        val secondaryButtonParams = android.widget.LinearLayout.LayoutParams(
          android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
          android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
        )
        buttonLayout.addView(secondaryButton, secondaryButtonParams)
      }

      // Add button layout at bottom FIRST
      val buttonParams = FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,
        FrameLayout.LayoutParams.WRAP_CONTENT
      ).apply {
        gravity = android.view.Gravity.BOTTOM
      }
      container.addView(buttonLayout, buttonParams)

      // Add content layout centered in container with bottom margin for buttons
      // Calculate button height to add as bottom margin
      buttonLayout.measure(
        android.view.View.MeasureSpec.makeMeasureSpec(0, android.view.View.MeasureSpec.UNSPECIFIED),
        android.view.View.MeasureSpec.makeMeasureSpec(0, android.view.View.MeasureSpec.UNSPECIFIED)
      )
      val buttonHeight = (150 * resources.displayMetrics.density).toInt() // Reserve space for buttons

      // FIX: Use MATCH_PARENT width so CENTER_HORIZONTAL gravity only affects positioning, not measurement
      val contentParams = FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.MATCH_PARENT,  // Changed from WRAP_CONTENT
        FrameLayout.LayoutParams.WRAP_CONTENT
      ).apply {
        gravity = android.view.Gravity.CENTER_VERTICAL  // Only center vertically
        bottomMargin = buttonHeight // Push content up to avoid button overlap
        // Add horizontal margins to prevent edge-to-edge content
        leftMargin = (32 * resources.displayMetrics.density).toInt()
        rightMargin = (32 * resources.displayMetrics.density).toInt()
      }
      container.addView(contentLayout, contentParams)

      overlayView = container
      windowManager?.addView(container, layoutParams)
      isOverlayShowing = true

      RNDeviceActivityAndroidModule.sendEvent("block_shown", blockedPackage, sessionId)
    } catch (e: Exception) {
      android.util.Log.e("BlockerService", "Failed to show overlay", e)
      e.printStackTrace()
    }
  }

  /**
   * Hide the blocking overlay.
   */
  private fun hideOverlay() {
    if (!isOverlayShowing || overlayView == null) return

    try {
      // Stop countdown timer if running
      stopCountdown()

      windowManager?.removeView(overlayView)
      overlayView = null
      isOverlayShowing = false
    } catch (e: Exception) {
      e.printStackTrace()
    }
  }
}
