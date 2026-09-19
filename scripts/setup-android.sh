#!/bin/bash
set -e

echo "Chakki Mitra - Android Setup"
echo "============================="

# Check if android dir exists
if [ ! -d "android" ]; then
  echo ""
  echo "[1/4] Adding Android platform..."
  npx cap add android
else
  echo "[1/4] Android platform already exists, skipping..."
fi

# Copy custom SMS plugin
echo "[2/4] Installing Background SMS Plugin..."
mkdir -p android/app/src/main/java/com/chakkimitra/plugin
cp native/android-plugin/com/chakkimitra/plugin/BackgroundSmsPlugin.java \
   android/app/src/main/java/com/chakkimitra/plugin/

# Sync Capacitor
echo "[3/4] Syncing Capacitor..."
npx cap sync android

echo "[4/4] Done!"
echo ""
echo "============================================"
echo "  APK SIGNING (for release builds)"
echo "============================================"
echo ""
echo "To sign your APK for production releases:"
echo ""
echo "  1. Generate a keystore (ONE TIME ONLY):"
echo "     keytool -genkey -v -keystore release.keystore \\"
echo "       -alias chakkimitra -keyalg RSA -keysize 2048 \\"
echo "       -validity 10000"
echo ""
echo "  2. Back up release.keystore SAFELY."
echo "     If you lose it, you can NEVER update existing users."
echo ""
echo "  3. For CI/CD, encode to base64 and add as GitHub Secret:"
echo "     base64 -i release.keystore | pbcopy"
echo "     Then add to repo > Settings > Secrets > Actions:"
echo "       ANDROID_KEYSTORE_BASE64"
echo "       ANDROID_KEYSTORE_PASSWORD"
echo "       ANDROID_KEY_ALIAS"
echo "       ANDROID_KEY_PASSWORD"
echo ""
echo "============================================"
echo "  NEXT STEPS"
echo "============================================"
echo ""
echo "  Debug build (no signing needed):"
echo "    cd android && ./gradlew assembleDebug"
echo "    adb install app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo "  Open in Android Studio:"
echo "    npx cap open android"
echo ""
