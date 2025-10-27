# Contributing to React Native Device Activity Android

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Code Style](#code-style)
- [Project Structure](#project-structure)

## Code of Conduct

This project follows a standard code of conduct. Be respectful, inclusive, and collaborative.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/react-native-device-activity-android.git
   cd react-native-device-activity-android
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/breakrr/react-native-device-activity-android.git
   ```

## Development Setup

### Requirements

- Node.js 20.19.x or higher
- Yarn 1.22.x
- Android SDK with API 36
- Java 17
- A physical Android device (recommended for testing Accessibility Service features)

### Installation

```bash
# Install dependencies
yarn install

# Build the TypeScript package
yarn build:package
```

### Running the Example App

```bash
cd apps/example
npx expo prebuild -p android
npx expo run:android
```

**Note:** You must test on a real Android device and grant all permissions (Accessibility, Overlay, Usage Access) to fully test the blocking functionality.

## Making Changes

### Before You Start

1. **Check existing issues** to see if your feature/bug is already being worked on
2. **Create an issue** if one doesn't exist to discuss your proposed changes
3. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

### Types of Contributions

#### Bug Fixes

- Clearly describe the bug and how to reproduce it
- Include device/OS information if relevant
- Add tests if applicable

#### New Features

- Discuss the feature in an issue first
- Ensure it aligns with the project goals (iOS DeviceActivity parity)
- Update documentation
- Add TypeScript types
- Test on multiple Android versions/manufacturers

#### Documentation

- Fix typos, improve clarity
- Add examples
- Update API documentation when code changes

## Testing

### Manual Testing Checklist

When making changes, test the following scenarios:

1. **Permissions Flow**
   - [ ] Request accessibility permission
   - [ ] Request overlay permission
   - [ ] Request usage access permission
   - [ ] Check permission status

2. **Blocking Flow**
   - [ ] Start a session with blocked apps
   - [ ] Open a blocked app - overlay should appear
   - [ ] Dismiss overlay - app should close
   - [ ] Stop session - apps should be accessible

3. **Edge Cases**
   - [ ] App killed while session active - session restores on restart
   - [ ] Session expires - overlay disappears
   - [ ] Multiple sessions
   - [ ] Temporary unblock/block features

4. **Device Testing**
   - Test on at least one device from major manufacturers (Samsung, Google, OnePlus)
   - Test on different Android versions (API 24-35)

### Automated Testing

Currently, this project has minimal test coverage. Contributions that add tests are highly valued!

```bash
# Run type checking
yarn typecheck

# Run linting
yarn lint

# Fix linting issues
yarn format
```

## Submitting Changes

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(android): add temporary block countdown timer
fix(types): include category field in getInstalledApps return type
docs(readme): clarify Google Play compliance requirements
refactor(module): extract duplicate app filtering logic
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Pull Request Process

1. **Update your branch** with latest main:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push your changes**:
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create a Pull Request** on GitHub with:
   - Clear title and description
   - Link to related issue(s)
   - Screenshots/video if UI changes
   - List of tested devices/Android versions
   - Checklist of what was tested

4. **Wait for review** - maintainers will review and may request changes

5. **Address feedback** - push additional commits to your branch

6. **Merge** - maintainers will merge once approved

## Code Style

### TypeScript/JavaScript

- Use **TypeScript** for all new code
- Follow existing code style (enforced by Prettier/ESLint)
- Use **functional programming** patterns where possible
- Add **JSDoc comments** for public APIs
- Avoid `any` types - use proper TypeScript types

Example:
```typescript
/**
 * Block all installed user apps for a specified duration.
 *
 * @param durationSeconds - Duration in seconds to block apps
 * @param style - Optional shield style configuration
 * @returns Promise that resolves when blocking starts
 */
export async function temporaryBlock(
  durationSeconds: number,
  style?: ShieldStyle
): Promise<void> {
  // Implementation
}
```

### Kotlin

- Follow [Kotlin coding conventions](https://kotlinlang.org/docs/coding-conventions.html)
- Use **data classes** for immutable data
- Proper **null safety** (`?` and `!!` operators)
- Add **KDoc comments** for public APIs
- Use meaningful variable names

Example:
```kotlin
/**
 * Get all installed user-facing applications.
 * Filters out system apps and returns only apps with launcher activities.
 *
 * @param includeIcons Whether to include base64-encoded app icons
 * @return Promise resolving to array of installed apps
 */
@ReactMethod
fun getInstalledApps(includeIcons: Boolean, promise: Promise) {
  // Implementation
}
```

### File Organization

- **Native code**: `packages/device-activity-android/android/src/main/java/com/breakrr/deviceactivity/`
- **TypeScript bridge**: `packages/device-activity-android/src/`
- **Type definitions**: `packages/device-activity-android/index.d.ts`
- **Config plugin**: `packages/device-activity-android/plugin/`
- **Example app**: `apps/example/`

## Project Structure

```
.
├── packages/
│   └── device-activity-android/
│       ├── android/                     # Kotlin native code
│       │   └── src/main/java/com/breakrr/deviceactivity/
│       │       ├── BlockerAccessibilityService.kt
│       │       ├── RNDeviceActivityAndroidModule.kt
│       │       ├── SessionState.kt
│       │       └── ...
│       ├── src/                         # TypeScript bridge
│       │   ├── index.ts                # Main API
│       │   └── appCategories.ts        # Utility functions
│       ├── plugin/                      # Expo config plugin
│       │   └── app.plugin.js
│       ├── index.d.ts                   # TypeScript definitions
│       ├── package.json
│       └── README.md
└── apps/
    └── example/                         # Demo app
        ├── App.tsx
        ├── components/
        └── app.json
```

## Documentation Updates

When adding or changing APIs, update:

1. **TypeScript types** in `index.d.ts`
2. **JSDoc comments** in `src/index.ts`
3. **README.md** in `packages/device-activity-android/`
4. **Example app** to demonstrate the feature
5. **CHANGELOG.md** with your changes

## Google Play Compliance

This library uses Android Accessibility Services, which have strict Google Play policies. When contributing:

- **Do NOT** add features that collect data from other apps
- **Do NOT** add automation or macro features
- Ensure all features are **user-initiated** and **transparent**
- Maintain compliance with [Accessibility Service policies](https://support.google.com/googleplay/android-developer/answer/10964491)

## Questions?

- Open a [Discussion](https://github.com/breakrr/react-native-device-activity-android/discussions)
- Ask in an existing [Issue](https://github.com/breakrr/react-native-device-activity-android/issues)
- Review [existing PRs](https://github.com/breakrr/react-native-device-activity-android/pulls) for examples

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
