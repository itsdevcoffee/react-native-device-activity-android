# NPM Publishing Context - React Native Device Activity Android

## Project Overview

**Package Name**: `@breakr/react-native-device-activity-android`
**Current Version**: `0.1.0`
**Repository**: https://github.com/breakr/react-native-device-activity-android
**License**: MIT
**Author**: Breakr

This is a React Native library for Android that provides screen blocking functionality similar to Apple's DeviceActivity APIs. It allows developers to build digital wellbeing and focus apps that can block specific apps during focus sessions using Android's Accessibility Service.

## Repository Structure

```
react-native-device-activity-android/
├── packages/
│   └── device-activity-android/          # Main library package (THIS IS WHAT GETS PUBLISHED)
│       ├── android/                       # Native Kotlin code
│       │   ├── build.gradle
│       │   └── src/main/java/com/breakr/deviceactivity/
│       ├── lib/                           # Compiled JavaScript (from TypeScript)
│       ├── src/                           # TypeScript source
│       │   └── index.ts
│       ├── plugin/                        # Expo config plugin
│       │   ├── app.plugin.js
│       │   └── package.json
│       ├── index.d.ts                     # TypeScript declarations
│       ├── package.json                   # MAIN PACKAGE FILE
│       ├── README.md                      # Package documentation
│       └── react-native.config.js
└── apps/
    └── example/                           # Demo app (NOT published)

Root files:
├── package.json                           # Monorepo root (NOT published)
├── README.md                              # Monorepo overview
├── GETTING_STARTED.md                     # Comprehensive guide (1,495 lines)
├── LICENSE                                # MIT License
├── CHANGELOG.md                           # Version history
└── CONTRIBUTING.md                        # Contributor guide
```

## Current State

### ✅ Completed
1. **Rebranding**: All references changed from `@breakrr/*` to `@breakr/*`
2. **Package namespace**: Updated from `com.breakrr.deviceactivity` to `com.breakr.deviceactivity`
3. **Documentation**:
   - Comprehensive README.md in package
   - 1,495-line GETTING_STARTED.md with full API reference
   - All examples use correct `@breakr/` namespace
4. **Code**: Fully functional, tested in example app
5. **TypeScript**: Compiled to `lib/` directory
6. **Git**: All changes committed, working tree clean

### 📋 Ready for Publishing
- Package version: `0.1.0` (first public release)
- All files properly structured
- Documentation complete and accurate
- License file in place

## Package Details (packages/device-activity-android/package.json)

```json
{
  "name": "@breakr/react-native-device-activity-android",
  "version": "0.1.0",
  "description": "React Native Device Activity for Android - Screen blocking functionality using Accessibility Service",
  "main": "lib/index.js",
  "types": "index.d.ts",
  "repository": {
    "type": "git",
    "url": "https://github.com/breakr/react-native-device-activity-android.git",
    "directory": "packages/device-activity-android"
  },
  "bugs": {
    "url": "https://github.com/breakr/react-native-device-activity-android/issues"
  },
  "homepage": "https://github.com/breakr/react-native-device-activity-android#readme",
  "author": "Breakr",
  "license": "MIT",
  "keywords": [
    "react-native",
    "expo",
    "android",
    "device-activity",
    "screen-time",
    "accessibility",
    "focus",
    "digital-wellbeing",
    "wellbeing",
    "app-blocker",
    "focus-mode",
    "productivity"
  ],
  "files": [
    "lib",
    "android",
    "plugin",
    "index.d.ts",
    "app.plugin.js",
    "react-native.config.js"
  ]
}
```

## NPM Publishing Requirements

### 1. NPM Account Setup
- Need an NPM account with access to `@breakr` scope/organization
- If `@breakr` scope doesn't exist, need to create it on npmjs.com
- Logged in via `npm login`

### 2. Files to Publish
The `files` array in package.json specifies what gets published:
- ✅ `lib/` - Compiled JavaScript (TypeScript output)
- ✅ `android/` - Native Android code
- ✅ `plugin/` - Expo config plugin
- ✅ `index.d.ts` - TypeScript type definitions
- ✅ `app.plugin.js` - Plugin entry point
- ✅ `react-native.config.js` - React Native autolinking config
- ✅ `README.md` - Automatically included
- ✅ `LICENSE` - Automatically included
- ✅ `package.json` - Automatically included

### 3. Pre-Publishing Checklist

**Build Steps** (must run before publishing):
```bash
cd packages/device-activity-android
yarn build              # Compiles TypeScript to lib/
yarn typecheck          # Verify no type errors
```

**Verify Package Contents**:
```bash
cd packages/device-activity-android
npm pack --dry-run      # Shows what will be included in package
```

**Test Installation Locally**:
```bash
# In a test project
npm install /path/to/react-native-device-activity-android/packages/device-activity-android
```

### 4. Publishing Commands

**First-time publish** (version 0.1.0):
```bash
cd packages/device-activity-android

# Login to NPM (if not already)
npm login

# Publish with public access (required for scoped packages)
npm publish --access public
```

**Future updates**:
```bash
# Update version first
npm version patch   # 0.1.0 -> 0.1.1
npm version minor   # 0.1.0 -> 0.2.0
npm version major   # 0.1.0 -> 1.0.0

# Then publish
npm publish
```

## Important Notes

### Package Scope
- The package is scoped: `@breakr/react-native-device-activity-android`
- Scoped packages are private by default on NPM
- **MUST use `--access public` flag** on first publish
- After first publish with `--access public`, subsequent publishes default to public

### Version Management
- Currently at `0.1.0` (pre-release/beta version)
- Follows semantic versioning (semver): MAJOR.MINOR.PATCH
- Consider versioning strategy:
  - `0.x.x` = Pre-1.0, API may change
  - `1.0.0` = First stable release
  - `1.x.x` = Stable, backward compatible changes
  - `2.0.0+` = Breaking changes

### TypeScript Compilation
- Source: `src/index.ts`
- Output: `lib/index.js`
- Types: `index.d.ts`
- **Must run `yarn build` before publishing**

### Native Code
- All Kotlin code is in `android/src/main/java/com/breakr/deviceactivity/`
- Package namespace: `com.breakr.deviceactivity`
- Gradle config: `android/build.gradle`

### Expo Plugin
- Plugin code: `plugin/app.plugin.js`
- Plugin is automatically discovered via `expo.plugin` field in package.json
- Users add to app.json: `"plugins": ["@breakr/react-native-device-activity-android"]`

## Testing After Publishing

Once published, users can install with:
```bash
# Using npm
npm install @breakr/react-native-device-activity-android

# Using yarn
yarn add @breakr/react-native-device-activity-android

# Using pnpm
pnpm add @breakr/react-native-device-activity-android
```

Then in their `app.json`:
```json
{
  "expo": {
    "plugins": ["@breakr/react-native-device-activity-android"]
  }
}
```

## Common Publishing Issues & Solutions

### Issue: "You do not have permission to publish @breakr/..."
**Solution**:
- Make sure you're logged in: `npm whoami`
- Ensure you own the `@breakr` scope, OR
- Get added as a collaborator to the scope

### Issue: "Package name too similar to existing package"
**Solution**:
- This name should be unique since it's scoped to `@breakr`
- Verify scope is available on npmjs.com

### Issue: "Cannot publish over existing version"
**Solution**:
- Bump version first: `npm version patch/minor/major`
- Never overwrite published versions

### Issue: "Missing files in published package"
**Solution**:
- Check `files` array in package.json
- Run `npm pack --dry-run` to preview
- Ensure `lib/` directory exists (run `yarn build`)

## Post-Publishing Checklist

After successful publish:

1. ✅ Verify on NPM registry: https://www.npmjs.com/package/@breakr/react-native-device-activity-android
2. ✅ Test installation in a fresh React Native/Expo project
3. ✅ Verify example app works with published version (not local link)
4. ✅ Update GitHub repository with release tag
5. ✅ Create GitHub release with changelog
6. ✅ Announce on social media / Discord / relevant communities
7. ✅ Monitor GitHub issues for installation problems

## GitHub Release (Optional but Recommended)

After publishing to NPM:
```bash
# Tag the release
git tag v0.1.0
git push origin v0.1.0

# Create GitHub release with changelog
gh release create v0.1.0 --title "v0.1.0 - Initial Release" --notes-file CHANGELOG.md
```

## Support & Resources

- **NPM Registry**: https://www.npmjs.com/
- **NPM Documentation**: https://docs.npmjs.com/
- **Semantic Versioning**: https://semver.org/
- **GitHub Repository**: https://github.com/breakr/react-native-device-activity-android
- **Package Documentation**: packages/device-activity-android/README.md
- **Getting Started Guide**: GETTING_STARTED.md

## Quick Reference Commands

```bash
# Navigate to package
cd packages/device-activity-android

# Build TypeScript
yarn build

# Check what will be published
npm pack --dry-run

# Login to NPM
npm login

# Publish (first time)
npm publish --access public

# Publish updates
npm version patch  # or minor/major
npm publish

# View published package
npm view @breakr/react-native-device-activity-android

# Test installation
npm install @breakr/react-native-device-activity-android
```

## Environment Info

- **Node.js**: 20.19.x or higher
- **Yarn**: 1.22.x
- **Package Manager**: Yarn workspaces (monorepo)
- **Build Tool**: TypeScript compiler (tsc)
- **Target Platform**: React Native 0.81+ / Expo SDK 54+

## Contact & Ownership

- **NPM Account Required**: Account with access to `@breakr` scope
- **GitHub Access**: Push access to breakr/react-native-device-activity-android
- **Author**: Breakr
- **License**: MIT

---

## Summary for Fresh Context

**Goal**: Publish `@breakr/react-native-device-activity-android` version 0.1.0 to NPM

**Status**:
- ✅ Code ready
- ✅ Documentation complete
- ✅ Package configured
- 🔲 Need to publish to NPM

**Main Package Location**: `packages/device-activity-android/`

**Key Command**:
```bash
cd packages/device-activity-android
yarn build
npm publish --access public
```

**Verification**:
After publishing, the package should be available at:
https://www.npmjs.com/package/@breakr/react-native-device-activity-android
