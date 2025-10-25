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

  companion object {
    var instance: BlockerAccessibilityService? = null
    var currentForegroundPackage: String? = null
    private val sessions = mutableMapOf<String, SessionState>()
    private val shieldStyles = mutableMapOf<String, ShieldStyle>()

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
        if (session.isActive(now) && session.shouldBlock(packageName)) {
          return Pair(true, id)
        }
      }
      return Pair(false, null)
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
        setPadding(0, 0, 0, 48)
      }

      // Add button
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

      linearLayout.addView(titleView)
      linearLayout.addView(messageView)
      linearLayout.addView(buttonView)

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
      windowManager?.removeView(overlayView)
      overlayView = null
      isOverlayShowing = false
    } catch (e: Exception) {
      e.printStackTrace()
    }
  }
}
