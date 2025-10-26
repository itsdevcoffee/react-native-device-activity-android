package com.breakrr.deviceactivity

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

  // Countdown timer for temporary blocks
  private var countdownTextView: TextView? = null
  private var countdownRunnable: Runnable? = null
  private var sessionEndTime: Long? = null

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
      return shieldStyles[sessionId] ?: ShieldStyle(
        title = "Stay Focused",
        message = "This app is blocked during your focus session.",
        ctaText = "Return to Focus"
      )
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

  data class ShieldStyle(
    val title: String,
    val message: String,
    val ctaText: String
  )

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
   * Start the countdown timer for temporary blocks.
   */
  private fun startCountdown(endTime: Long) {
    sessionEndTime = endTime

    countdownRunnable = object : Runnable {
      override fun run() {
        val now = System.currentTimeMillis()
        val remaining = endTime - now

        if (remaining > 0) {
          val formattedTime = formatRemainingTime(remaining)
          countdownTextView?.text = "Unblocks in $formattedTime"

          // Schedule next update in 1 second
          handler.postDelayed(this, 1000)
        } else {
          // Time's up - the cleanup will be handled by cleanupExpiredSessions
          countdownTextView?.text = "Unblocking..."
        }
      }
    }

    // Start the countdown immediately
    countdownRunnable?.let { handler.post(it) }
  }

  /**
   * Stop the countdown timer.
   */
  private fun stopCountdown() {
    countdownRunnable?.let { handler.removeCallbacks(it) }
    countdownRunnable = null
    countdownTextView = null
    sessionEndTime = null
  }

  /**
   * Show the blocking overlay with the specified style.
   */
  private fun showOverlay(sessionId: String, blockedPackage: String) {
    if (isOverlayShowing) return

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

      // Create overlay container
      val container = FrameLayout(this)
      container.setBackgroundColor(0xE6000000.toInt())

      // Get shield style
      val style = getShieldStyle(sessionId)

      // Create vertical LinearLayout for stacking views
      val linearLayout = android.widget.LinearLayout(this).apply {
        orientation = android.widget.LinearLayout.VERTICAL
        gravity = android.view.Gravity.CENTER
        setPadding(40, 40, 40, 40)
      }

      // Get app icon and add it with iOS-style grayscale treatment
      try {
        val packageManager = applicationContext.packageManager
        val appIcon = packageManager.getApplicationIcon(blockedPackage)

        val iconSize = (120 * resources.displayMetrics.density).toInt()
        val iconMargin = (32 * resources.displayMetrics.density).toInt()

        val iconView = ImageView(this).apply {
          setImageDrawable(appIcon)

          // Apply grayscale filter for iOS-style appearance
          val colorMatrix = ColorMatrix().apply {
            setSaturation(0f) // Remove all color (grayscale)
          }
          colorFilter = ColorMatrixColorFilter(colorMatrix)

          // Set alpha for darkened appearance
          alpha = 0.4f // Darken the icon
        }

        val iconParams = android.widget.LinearLayout.LayoutParams(iconSize, iconSize).apply {
          bottomMargin = iconMargin
        }
        linearLayout.addView(iconView, iconParams)
      } catch (e: Exception) {
        android.util.Log.w("BlockerService", "Could not load app icon for $blockedPackage", e)
      }

      // Add title
      val titleView = TextView(this).apply {
        text = style.title
        textSize = 28f
        setTextColor(0xFFFFFFFF.toInt())
        gravity = android.view.Gravity.CENTER
        setPadding(0, 0, 0, 24)
        typeface = android.graphics.Typeface.DEFAULT_BOLD
      }

      // Add message
      val messageView = TextView(this).apply {
        text = style.message
        textSize = 18f
        setTextColor(0xFFCCCCCC.toInt())
        gravity = android.view.Gravity.CENTER
        setPadding(0, 0, 0, 24)
      }

      // Add countdown for temporary blocks
      val session = sessions[sessionId]
      val countdownView = if (session?.endsAt != null) {
        TextView(this).apply {
          text = "Calculating..."
          textSize = 16f
          setTextColor(0xFFFFAA00.toInt()) // Orange color for countdown
          gravity = android.view.Gravity.CENTER
          setPadding(0, 0, 0, 24)
          typeface = android.graphics.Typeface.MONOSPACE
        }.also {
          countdownTextView = it
          startCountdown(session.endsAt)
        }
      } else {
        null
      }

      // Add dismiss button
      val buttonView = Button(this).apply {
        text = style.ctaText
        textSize = 16f
        setPadding(48, 24, 48, 24)
        setBackgroundColor(0xFF2196F3.toInt())
        setTextColor(0xFFFFFFFF.toInt())
        setOnClickListener {
          // Record dismissal for cooldown
          lastDismissedPackage = blockedPackage
          lastDismissedTime = System.currentTimeMillis()

          hideOverlay()
          RNDeviceActivityAndroidModule.sendEvent("block_dismissed", blockedPackage, sessionId)

          // Return to home screen
          val homeIntent = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
          }
          startActivity(homeIntent)
        }
      }

      // Add "Go to Example App" button
      val goToAppButton = Button(this).apply {
        text = "Go to Example App"
        textSize = 16f
        setPadding(48, 24, 48, 24)
        setBackgroundColor(0xFF4CAF50.toInt()) // Green color
        setTextColor(0xFFFFFFFF.toInt())
        val topMargin = (16 * resources.displayMetrics.density).toInt()
        (layoutParams as? android.widget.LinearLayout.LayoutParams)?.topMargin = topMargin

        setOnClickListener {
          // Record dismissal for cooldown
          lastDismissedPackage = blockedPackage
          lastDismissedTime = System.currentTimeMillis()

          hideOverlay()
          RNDeviceActivityAndroidModule.sendEvent("block_dismissed", blockedPackage, sessionId)

          // Launch the example app
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
            android.util.Log.e("BlockerService", "Failed to launch example app", e)
            // Fallback to home screen
            val homeIntent = Intent(Intent.ACTION_MAIN).apply {
              addCategory(Intent.CATEGORY_HOME)
              flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            startActivity(homeIntent)
          }
        }
      }

      linearLayout.addView(titleView)
      linearLayout.addView(messageView)

      // Add countdown view if it exists (temporary block)
      if (countdownView != null) {
        linearLayout.addView(countdownView)
      }

      linearLayout.addView(buttonView)

      // Add margin and append the second button
      val goToAppParams = android.widget.LinearLayout.LayoutParams(
        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT,
        android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
      ).apply {
        topMargin = (16 * resources.displayMetrics.density).toInt()
      }
      linearLayout.addView(goToAppButton, goToAppParams)

      // Add LinearLayout centered in container
      val contentParams = FrameLayout.LayoutParams(
        FrameLayout.LayoutParams.WRAP_CONTENT,
        FrameLayout.LayoutParams.WRAP_CONTENT
      ).apply {
        gravity = android.view.Gravity.CENTER
      }
      container.addView(linearLayout, contentParams)

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
