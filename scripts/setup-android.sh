#!/bin/bash
set -e

echo "🚀 Chakki Mitra - Android Setup"

# Check if android dir exists
if [ ! -d "android" ]; then
  echo "📱 Adding Android platform..."
  npx cap add android
fi

# Copy custom SMS plugin
echo "📲 Installing Background SMS Plugin..."
mkdir -p android/app/src/main/java/com/chakkimitra/plugin
cp native/android-plugin/com/chakkimitra/plugin/BackgroundSmsPlugin.java \
   android/app/src/main/java/com/chakkimitra/plugin/

# Sync Capacitor
echo "🔄 Syncing Capacitor..."
npx cap sync android

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Open in Android Studio: npx cap open android"
echo "  2. Or build APK: cd android && ./gradlew assembleDebug"
echo "  3. Install: adb install android/app/build/outputs/apk/debug/app-debug.apk"
