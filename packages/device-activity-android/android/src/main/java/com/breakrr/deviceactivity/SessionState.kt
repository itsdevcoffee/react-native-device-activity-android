package com.breakrr.deviceactivity

/**
 * Represents a blocking session with its configuration.
 *
 * @property id Unique session identifier
 * @property blocked Set of package IDs to block
 * @property allow Set of package IDs to allow (whitelist mode if non-empty)
 * @property startsAt Start time in milliseconds since epoch (null = starts immediately)
 * @property endsAt End time in milliseconds since epoch (null = no end time)
 */
data class SessionState(
  val id: String,
  val blocked: Set<String>,
  val allow: Set<String>,
  val startsAt: Long?,
  val endsAt: Long?
) {
  /**
   * Check if this session is currently active based on the time window.
   *
   * @param now Current time in milliseconds since epoch
   * @return true if session is active right now
   */
  fun isActive(now: Long): Boolean {
    val afterStart = (startsAt == null || now >= startsAt)
    val beforeEnd = (endsAt == null || now <= endsAt)
    return afterStart && beforeEnd
  }

  /**
   * Check if a package should be blocked by this session.
   *
   * @param pkg Package name to check
   * @return true if package should be blocked
   */
  fun shouldBlock(pkg: String): Boolean {
    // If allow list is specified, block everything NOT in allow list
    if (allow.isNotEmpty()) {
      return !allow.contains(pkg)
    }
    // Otherwise, block only packages in blocked list
    return blocked.contains(pkg)
  }
}
