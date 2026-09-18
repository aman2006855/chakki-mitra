import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chakkimitra.app',
  appName: 'चक्की मित्र',
  webDir: 'out',
  server: {
    url: 'https://chakki-mitra.vercel.app',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    BackgroundSms: {},
  },
};

export default config;
