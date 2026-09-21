import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chakkimitra.app',
  appName: 'चक्की मित्र',
  webDir: 'out',
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
    backgroundColor: "#ea580c",
  },
  plugins: {
    BackgroundSms: {},
    BackgroundTask: {},
  },
};

export default config;
