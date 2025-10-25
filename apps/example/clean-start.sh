#!/bin/bash
# Clean start script - use this when Metro bundler has cache issues

set -e

echo "🧹 Stopping all processes..."
pkill -9 -f "expo" 2>/dev/null || true
pkill -9 -f "metro" 2>/dev/null || true
pkill -9 -f "node.*808" 2>/dev/null || true
sleep 1

echo "🗑️  Cleaning all caches..."
rm -rf .expo node_modules/.cache android/build android/.gradle
rm -rf /tmp/metro-* /tmp/haste-map-* ~/.expo/metro-cache 2>/dev/null || true
rm -rf ../../node_modules/.cache ../../.expo 2>/dev/null || true

echo "✨ Starting fresh..."
npx expo start --clear --port 8082

echo "✅ Done! Dev server running on port 8082"
echo "   In another terminal, run: npx expo run:android"
