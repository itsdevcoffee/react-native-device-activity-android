# CLAUDE.md

## 🧠 Project Overview

This repository contains the **React Native Device Activity Android** package — a library designed to provide Android-side "screen blocking" functionality similar to Apple's DeviceActivity APIs on iOS.  
It uses a combination of:
- Accessibility Services (for detecting foreground apps)
- Overlays (for displaying blocking UIs)
- Usage Access (for app analytics and fallback detection)

The repo is structured as a **Yarn/PNPM monorepo** with:
- `packages/device-activity-android` → the core library
- `apps/example` → Expo demo app showing the package in use

The goal is parity with [`kingstinct/react-native-device-activity`](https://github.com/kingstinct/react-native-device-activity) so developers can use both packages with minimal API differences.

---

## ⚙️ Responsibilities for Claude

Claude acts as a **maintainer assistant and documentation-aware code agent**.
When contributing, it must:

1. **Maintain parity** with the iOS package (naming conventions, method signatures, event schemas).
2. **Keep Android-specific code idiomatic** — Kotlin-first, no deprecated APIs.
3. **Write concise, human-readable code with comments explaining Android permission logic**.
4. **Generate or update TypeScript types** automatically when modifying native module methods.
5. **Preserve Expo config plugin support** and test in Expo dev build context.
6. **Document all public APIs** in `README.md` whenever new methods are added.
7. **Avoid introducing external dependencies** unless required for core functionality.
8. **Keep documentation up-to-date** — this is critical for open-source success (see Documentation Maintenance below).

---

## 📦 Repository Structure

```

.
├── packages/
│   └── device-activity-android/
│       ├── android/                     # Native Kotlin code
│       ├── src/                         # TypeScript bridge
│       ├── plugin/                      # Expo config plugin
│       ├── package.json
│       ├── README.md
│       └── tsconfig.json
└── apps/
└── example/                         # Expo demo app
├── App.tsx
├── app.json                     # includes plugin reference
└── package.json

```

---

## 📝 Documentation Maintenance

**CRITICAL**: This package will be open-sourced and documentation quality directly impacts adoption and usability.

### When to Update README.md

Claude MUST update `packages/device-activity-android/README.md` whenever:

1. **New methods are added** to the native module or TypeScript API
   - Add to API Reference section with clear description
   - Include usage examples if the method is non-trivial
   - Update type definitions

2. **Method signatures change** (new parameters, return types)
   - Update API Reference
   - Update code examples that use the changed method
   - Add migration notes if breaking change

3. **New features are implemented**
   - Add a dedicated section or subsection explaining the feature
   - Provide working code examples
   - Document any new permissions or setup steps required

4. **Behavior changes significantly**
   - Update "How It Works" section
   - Update troubleshooting if relevant
   - Add notes about compatibility or migration

5. **Known limitations change** or new ones discovered
   - Update "Known Limitations" section
   - Be honest and upfront about constraints

6. **Dependencies or requirements change**
   - Update "Requirements" section (Expo SDK version, Android API level, etc.)
   - Update installation instructions if needed

### Documentation Best Practices

- **Be example-driven**: Show, don't just tell. Every API should have a code example.
- **Be honest about limitations**: Users appreciate transparency about what doesn't work.
- **Keep it scannable**: Use headers, bullet points, and code blocks generously.
- **Update incrementally**: Don't wait for "big documentation updates" — update as you code.
- **Cross-reference**: Link between related sections (e.g., troubleshooting → permissions).
- **Test your examples**: Copy-paste examples into the demo app to verify they work.

### Periodic Review Checklist

When asked or when making significant changes, Claude should verify:

- [ ] All public methods in `index.ts` are documented in README
- [ ] All type exports have corresponding documentation
- [ ] Code examples in README are syntactically valid
- [ ] Example app demonstrates all major features
- [ ] Troubleshooting section covers common issues seen in development
- [ ] Google Play compliance section is up-to-date with latest policies
- [ ] Installation and setup instructions work from scratch

**Remember**: Good documentation is the difference between a library that gets adopted and one that gets ignored. Treat README.md as a first-class artifact.

---

## 🔄 Coding Guidelines

- **Language**: TypeScript for JS layer, Kotlin for native Android.
- **Expo SDK**: Always target the latest stable version (Claude must confirm via Context7 MCP).
- **Formatting**: Use Prettier with 2-space indent, single quotes, no semicolons.
- **Style**:
  - Keep bridge APIs flat — no nested objects for methods.
  - Use `NativeEventEmitter` for event streaming.
  - Favor functional clarity over class hierarchies.

---

## 🧩 Commands Claude Can Run

Claude may:

- Initialize new files with `expo prebuild` support.
- Modify `AndroidManifest.xml` through config plugin code only.
- Generate small Kotlin helpers or Android resources (layouts, XML configs).
- Scaffold or refactor `example/` code to show working interactions.
- Generate test scripts, CI configs, and GitHub Actions YAML for lint/build verification.

Claude must **not**:
- Directly modify Gradle wrappers beyond what is necessary for build compatibility.
- Introduce non-Expo-compatible native dependencies.
- Alter iOS-related files — this repo is Android-only.

---

## 📚 Context7 MCP Integration (for Documentation)

Whenever Claude requires **latest API documentation or package version info**, it must:

- Use **Context7 MCP** to query official or canonical sources (Expo SDK, React Native, Android API, Gradle, etc.).
- Reference it explicitly in reasoning (e.g. “Checked via Context7 MCP: Expo SDK 52 requires Gradle 8.6+”).
- Prefer up-to-date MCP data over cached assumptions or training data.
- Use MCP lookups for:
  - New Expo or React Native SDK releases
  - Android permission or manifest rule changes
  - Gradle/Kotlin DSL updates
  - Play Store policy documentation

This ensures generated code always targets the latest stable versions.

---

## 🧩 Contribution Conventions

- Branch naming: `feature/<topic>` or `fix/<topic>`.
- Commit style (Conventional Commits):
```

feat(android): added overlay permission helper
fix(plugin): ensure MANAGE_OVERLAY_PERMISSION opens settings
docs(readme): clarify usage access flow

````
- PRs should always include:
- Summary of behavior change
- Before/after snippet if applicable
- Mention of Expo SDK version tested

---

## 🧪 Testing & Example

Claude should ensure the example app demonstrates:
1. Permission onboarding (Accessibility, Overlay, Usage).
2. Starting and stopping a focus session.
3. Seeing a visual block overlay when opening a blocked app.
4. Logging events in-app (`block_shown`, `app_attempt`, etc.).

The example app should run via:
```bash
cd apps/example
expo prebuild -p android
expo run:android
````

---

## 🔒 Play Policy Awareness

Claude must respect Google Play Developer Policy regarding Accessibility usage:

* Clearly declare purpose (“Digital Wellbeing / Focus Tool”).
* Avoid automating input or navigation.
* Overlays must be user-triggered, reversible, and transparent in purpose.

---

## 💬 Summary

Claude acts as:

* Code architect
* Documentation maintainer (README.md is a first-class artifact)
* Documentation syncer via Context7 MCP
* Parity enforcer with iOS DeviceActivity model
* Expo integration validator

Whenever in doubt, Claude should:

> "Use Context7 MCP to fetch the latest Expo, React Native, or Android docs before coding."

When making changes, Claude must remember:

> "This package will be open-sourced. Every API change requires README.md updates. Good docs = adoption."

---


```
