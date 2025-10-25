package com.breakrr.deviceactivity

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.os.Build
import android.view.LayoutInflater
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.widget.Button
import android.widget.TextView
import android.widget.FrameLayout

/**
 * Accessibility Service that monitors app switches and shows blocking overlay.
 *
 * This service listens for TYPE_WINDOW_STATE_CHANGED events to detect when
 * the user switches to a different app. If the foreground app is blocked by
 * any active session, it displays a full-screen overlay preventing access.
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
  private val DISMISS_COOLDOWN_MS = 3000L // 3 seconds cooldown

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
        title = "App Blocked",
        message = "This app is currently blocked by your focus session.",
        ctaText = "Dismiss"
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
    android.util.Log.d("BlockerService", "Accessibility service created")
  }

  override fun onServiceConnected() {
    super.onServiceConnected()
    android.util.Log.d("BlockerService", "Accessibility service connected and ready")
    RNDeviceActivityAndroidModule.sendServiceStateEvent(true)
  }

  override fun onDestroy() {
    super.onDestroy()
    instance = null
    hideOverlay()
    android.util.Log.d("BlockerService", "Accessibility service destroyed")
    RNDeviceActivityAndroidModule.sendServiceStateEvent(false)
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null) return

    // Listen for window state changes (app switches)
    if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
      val packageName = event.packageName?.toString() ?: return

      android.util.Log.d("BlockerService", "Window changed to: $packageName")

      // Ignore our own package and system UI
      if (packageName == applicationContext.packageName ||
          packageName == "com.android.systemui") {
        return
      }

      currentForegroundPackage = packageName

      // Check if this package should be blocked
      val (shouldBlock, sessionId) = shouldBlockPackage(packageName)

      android.util.Log.d("BlockerService", "Should block $packageName? $shouldBlock (session: $sessionId)")
      android.util.Log.d("BlockerService", "Active sessions: ${sessions.size}")

      if (shouldBlock && sessionId != null) {
        // Check if this package was recently dismissed (cooldown period)
        val now = System.currentTimeMillis()
        val isInCooldown = packageName == lastDismissedPackage &&
                          (now - lastDismissedTime) < DISMISS_COOLDOWN_MS

        if (isInCooldown) {
          android.util.Log.d("BlockerService", "Package $packageName in cooldown, skipping overlay")
          hideOverlay()
          return
        }

        android.util.Log.d("BlockerService", "Showing overlay for $packageName")
        showOverlay(sessionId, packageName)
        // Send event to React Native
        RNDeviceActivityAndroidModule.sendEvent("app_attempt", packageName, sessionId)
      } else {
        hideOverlay()
      }
    }
  }

  override fun onInterrupt() {
    // Called when service is interrupted
    hideOverlay()
  }

  /**
   * Show the blocking overlay with the specified style.
   */
  private fun showOverlay(sessionId: String, blockedPackage: String) {
    if (isOverlayShowing) return

    try {
      val layoutParams = WindowManager.LayoutParams().apply {
        type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          // Android 8.0+: Use TYPE_ACCESSIBILITY_OVERLAY
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
      container.setBackgroundColor(0xE6000000.toInt()) // Semi-transparent black

      // Get shield style
      val style = getShieldStyle(sessionId)

      // Create vertical LinearLayout for stacking views
      val linearLayout = android.widget.LinearLayout(this).apply {
        orientation = android.widget.LinearLayout.VERTICAL
        gravity = android.view.Gravity.CENTER
        setPadding(40, 40, 40, 40)
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
      // Failed to show overlay - log error
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
