# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Custom shield icon support**
  - New `ensureIconCached()` method to copy custom icons from React Native assets to internal storage
  - Versioning system for icon cache invalidation (e.g., `breakrr-icon-v1.png`)
  - `iconSize` field in `ShieldStyle` to control icon size in dp (density-independent pixels)
  - `primaryImagePath` field in `ShieldStyle` to specify custom icon file path
  - Automatic fallback to default emoji if custom icon fails to load
  - Icon caching persists across app restarts
- TypeScript type definitions for `session_expired` event
- TypeScript type definitions for `temporaryBlock()` method
- TypeScript type definitions for `getAppMetadataDebug()` method
- `category` field in `getInstalledApps()` return type
- LICENSE file (MIT)
- CONTRIBUTING.md with contribution guidelines
- CHANGELOG.md to track version history
- App category utilities exported from package (AppCategory enum, getCategoryLabel, etc.)

### Changed
- Primary button (e.g., "Return to Focus") now redirects users back to the parent app instead of home screen
- This provides a better user experience by guiding users back to their focus/wellbeing app

### Fixed
- Missing `category` field in TypeScript types for `getInstalledApps()`
- Missing `session_expired` event type in BlockEvent union
- Missing app category utility exports in TypeScript definitions
- Refactored duplicate app filtering code into shared helper method
- Extracted magic numbers (icon size, PNG quality) to constants
- **Critical:** Fixed temporary unblock not properly restoring shield styles (colors, buttons, blur) after duration expires
  - SessionStorageHelper now uses comprehensive serialization matching ShieldConfigurationStorageHelper
  - All shield style properties (colors, buttons, blur effects) are now persisted correctly

## [0.1.0] - 2025-01-27

### Added
- Initial release of React Native Device Activity Android
- Core blocking functionality using Android Accessibility Service
- Session-based app blocking with time windows
- Customizable shield overlay screens with multiple themes
- Permission management helpers (Accessibility, Overlay, Usage Access)
- Event streaming for block attempts and service state
- App category support (Games, Social, Productivity, etc.)
- Shield configuration system for reusable themes
- Temporary unblock feature with AlarmManager
- Temporary block feature with countdown timer
- Dynamic power points counter in overlay
- Session persistence across app restarts
- UsageStatsManager polling for reliable foreground app detection
- Expo config plugin for automatic manifest configuration
- Comprehensive API documentation
- Working example app demonstrating all features

### Features
- **Permission Management**
  - `getPermissionsStatus()` - Check all required permissions
  - `requestAccessibilityPermission()` - Open accessibility settings
  - `requestOverlayPermission()` - Open overlay settings
  - `requestUsageAccessPermission()` - Open usage access settings
  - `requestScheduleExactAlarmPermission()` - Open alarm settings

- **Session Management**
  - `startSession()` - Start blocking session with inline styles or shield IDs
  - `updateSession()` - Update existing session configuration
  - `stopSession()` - Stop specific session by ID
  - `stopAllSessions()` - Stop all active sessions
  - `blockAllApps()` - Block all installed user apps
  - `unblockAllApps()` - Unblock all apps
  - `getBlockStatus()` - Get current blocking state

- **Temporary Actions**
  - `temporaryUnblock()` - Pause blocking for N seconds
  - `temporaryBlock()` - Block all apps for N seconds

- **Shield Configuration**
  - `configureShielding()` - Register reusable shield themes
  - `updateShielding()` - Update existing shield configuration
  - `removeShielding()` - Remove shield configuration
  - `getShieldingConfigurations()` - Get all registered shields

- **App Information**
  - `getInstalledApps()` - Get user-facing apps with icons and categories
  - `getCurrentForegroundApp()` - Get current foreground app
  - `isServiceRunning()` - Check if accessibility service is running
  - `getAppMetadataDebug()` - Debug method for comprehensive app metadata

- **Event Handling**
  - `addListener()` - Subscribe to block events
  - Events: `block_shown`, `block_dismissed`, `secondary_action`, `app_attempt`, `service_state`, `temporary_unblock_ended`, `session_expired`

### Technical
- Kotlin-first native implementation
- UsageStatsManager polling instead of AccessibilityEvent callbacks
- SharedPreferences for session persistence
- AlarmManager for background timer reliability
- Expo SDK 54+ compatibility
- Android API 24+ support

### Documentation
- Comprehensive README with API reference
- Google Play policy compliance guidance
- Example app with complete integration
- TypeScript type definitions for all APIs

### Known Limitations
- Overlay restrictions on Android 14/15 require additional permissions
- Some device manufacturers (Samsung, MIUI) have extra Accessibility restrictions
- Aggressive battery savers may kill the service
- Cannot block system apps or Settings

## Version History

- **0.1.0** - Initial release

[Unreleased]: https://github.com/breakrr/react-native-device-activity-android/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/breakrr/react-native-device-activity-android/releases/tag/v0.1.0
