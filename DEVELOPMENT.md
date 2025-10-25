# Development Guide

## 🚀 Quick Start Scripts

All scripts should be run from the **monorepo root**.

### Daily Development Workflow

```bash
# Build package + run on Android (most common)
yarn dev

# Watch logs in separate terminal
yarn logs
```

---

## 📦 Package Development

### Building the TypeScript Package

```bash
# Build the package (compiles TypeScript to JavaScript)
yarn build:package
# or
yarn build
```

This runs `tsc` in `packages/device-activity-android` and outputs to `lib/`.

**When to rebuild:**
- After changing any `.ts` files in `packages/device-activity-android/src/`
- The `prepare` script auto-builds on `yarn install`

---

## 📱 Example App

### Running the Example App

```bash
# Run on Android (uses existing build)
yarn android

# Build package + run Android
yarn dev

# Clean rebuild everything
yarn dev:clean
```

### Type Checking

```bash
# Check all workspaces
yarn typecheck

# Run typecheck + linting
yarn check
```

---

## 🧹 Cleaning & Rebuilding

### Clean Build

```bash
# Clean Gradle + prebuild + rebuild
yarn clean

# Full restart (uninstall + clean + rebuild)
yarn restart
```

### Manual Clean

```bash
# Uninstall from device
yarn uninstall

# Clean only Gradle
cd apps/example/android && ./gradlew clean
```

---

## 📊 Logging & Debugging

### Watch Logs

```bash
# Filtered logs (RNDeviceActivity + ReactNativeJS)
yarn logs

# Just for development (RNDeviceActivity + ReactNativeJS)
yarn dev:logs

# All logs (very verbose)
yarn logs:all
```

### Check Connected Devices

```bash
yarn devices
```

---

## 🔄 Typical Workflows

### After Changing Native Code (Kotlin)

```bash
# Just rebuild Android (Kotlin changes don't need package rebuild)
yarn android
```

### After Changing TypeScript Bridge

```bash
# Rebuild package + Android
yarn dev
```

### After Changing Plugin Code

```bash
# Clean rebuild to regenerate manifest
yarn dev:clean
```

### Full Reset

```bash
# Nuclear option: uninstall + clean + rebuild
yarn restart
```

---

## 🛠️ Available Scripts (Alphabetical)

| Script | Description |
|--------|-------------|
| `yarn android` | Run example app on Android |
| `yarn build` | Build TypeScript package |
| `yarn build:package` | Same as `build` |
| `yarn check` | Run typecheck + lint |
| `yarn clean` | Clean prebuild + Gradle |
| `yarn dev` | Build package + run Android |
| `yarn dev:clean` | Clean rebuild everything |
| `yarn dev:logs` | Watch filtered logs |
| `yarn devices` | List connected devices |
| `yarn format` | Format all files with Prettier |
| `yarn lint` | Run ESLint |
| `yarn logs` | Watch logs (recommended) |
| `yarn logs:all` | Watch all logs (verbose) |
| `yarn restart` | Uninstall + clean + rebuild |
| `yarn typecheck` | Type check all workspaces |
| `yarn uninstall` | Uninstall app from device |

---

## 📁 Project Structure

```
react-native-device-activity-android/
├── packages/
│   └── device-activity-android/     # Main package
│       ├── android/                  # Native Kotlin code
│       ├── plugin/                   # Expo config plugin
│       ├── src/                      # TypeScript bridge
│       └── lib/                      # Built JavaScript (git-ignored)
├── apps/
│   └── example/                      # Example Expo app
│       ├── android/                  # Generated native code
│       ├── App.tsx                   # Main app component
│       └── app.json                  # Expo config
└── package.json                      # Root package (monorepo)
```

---

## 💡 Tips

1. **Keep logs running** in a separate terminal with `yarn logs`
2. **After native changes**, just run `yarn android` (faster)
3. **After TypeScript changes**, run `yarn dev` (rebuilds package)
4. **Use `yarn restart`** if things get weird
5. **Check types before committing** with `yarn check`

---

## 🐛 Common Issues

### "Module not found" errors
```bash
yarn build:package  # Rebuild the package
```

### Gradle build fails
```bash
yarn clean  # Clean Gradle cache
```

### App won't install
```bash
yarn uninstall  # Remove old version
yarn dev        # Reinstall
```

### Permissions not showing
```bash
yarn dev:clean  # Regenerate AndroidManifest.xml
```

---

## 🔗 Related Files

- [`CLAUDE.md`](./CLAUDE.md) - Project overview & guidelines
- [`README.md`](./packages/device-activity-android/README.md) - Package documentation
- [`package.json`](./package.json) - Root scripts & dependencies
