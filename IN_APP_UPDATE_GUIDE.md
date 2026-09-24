# RoomieKhata In-App Update System — Complete Guide

> Ye document batata hai ki RoomieKhata ka **In-App Update system** kya hai, kaise kaam karta hai,
> kya technology use hui hai, aur is system ko **kisi bhi dusre app mein** kaise implement kar sakte ho.
> (Copy-paste ready — sab files, code aur steps diye hue hain.)

---

## 1. Ye System Kya Hai?

Jab bhi RoomieKhata ka naya version release hota hai, **user ko kisi Play Store ya website se manually
download karne ki zaroorat nahi**. App khud background mein check karta hai ki naya version aaya hai ya nahi:

1. App kholte hi server se puchhta hai — *"Kya naya version hai?"*
2. Agar haan → ek **popup** dikhta hai: *"v2.2.63 Ready!"* + What's New (changelog)
3. User **"Download & Install"** dabata hai → APK directly app ke andar download hoti hai
4. Download pura hote hi Android ka **installer auto-khul jata hai** → user install kar deta hai
5. Settings page mein bhi **"Check for Updates"** button hai — manual check + install karne ke liye

Ye **website aur APK dono** mein kaam karta hai (APK mein full experience, web mein service-worker based).

---

## 2. Pura Architecture (Kaise Kaam Karta Hai)

```
┌─────────────────────────────────────────────┐
│            HOSTING (Vercel/CDN)              │
│                                             │
│   public/update.json  ────── version + URL  │
│   public/RoomieKhata_v2.2.63.apk  ← APK     │
│   (CI ab har push par neeche banta hai)     │
└───────────────┬─────────────────────────────┘
                │  GET update.json (?nocache=timestamp)
                ▼
┌─────────────────────────────────────────────┐
│              ANDROID APP (Capacitor)         │
│                                             │
│  src/components/UpdateChecker.tsx           │
│   ├─ App start → version compare            │
│   ├─ 15 min har baar + app active → check   │
│   ├─ Popup: What's New + Update buttons     │
│   └─ Download & Install → ApkUpdater plugin │
│                                             │
│  src/pages/Settings.tsx  (manual check)     │
│   └─ Check for Updates → Install button     │
│                                             │
│  src/config/version.ts                      │
│   └─ APP_VERSION + VERSION_CHANGELOG        │
└───────────────┬─────────────────────────────┘
                │  downloadAndInstall(url, filename)
                ▼
┌─────────────────────────────────────────────┐
│  NATIVE PLUGIN: ApkUpdaterPlugin.java       │
│                                             │
│  1. HTTP GET se APK download (Chunks mein)  │
│  2. Progress events → JS (onDownloadProgress)│
│  3. Download complete → FileProvider         │
│  4. Android installer intent launch         │
└─────────────────────────────────────────────┘
```

**Data flow ka simple version:**

```
User ne app khola
   │
   ├─► fetch(".../update.json?nocache=123")
   │        │
   │        ▼  version compare (2.2.63 > 2.2.62?)
   │        ├─ Nahi ► kuch nahi, app normal chalta hai
   │        └─ Haan ► popup: "v2.2.63 Ready!" + What's New
   │                   │
   │            User click: "Download & Install"
   │                   │
   │                  ▼
   │        ApkUpdater.downloadAndInstall(url)
   │                   │
   │        Native: APK download (progress events)
   │                   │
   │                  ▼
   │        Download 100% ► FileProvider URI
   │                   │
   │                  ▼
   │        Android Installer (ACTION_VIEW) khulta hai
   │                   │
   │                  ▼
   │        User "Install" dabata hai ► new version live!
```

---

## 3. Technology / Stack (Kya-Kya Use Hua Hai)

| Layer | Technology | Kaam |
|-------|-----------|------|
| Framework | **Capacitor 8** (`@capacitor/core`, `@capacitor/android`) | Web (React) ko Android APK mein wrap karta hai |
| UI | **React + Vite + Tailwind** | App ka interface + update popup |
| Version Metadata | **`public/update.json`** (static JSON) | Server se version + APK URL batata hai |
| Local Version | **`src/config/version.ts`** | App ke andar current version aur changelog |
| Auto-build | **GitHub Actions CI** (`.github/workflows/build-apk.yml`) | Har push par APK build karke repo mein push kar deta hai |
| Native Plugin | **`ApkUpdaterPlugin.java`** (custom Capacitor plugin) | APK download + Android installer launch |
| File Access | **FileProvider** (`file_paths.xml`) | Download hui APK ko installer ke liye authorize karta hai |
| Hosting | **Vercel** (static) | `update.json` aur APK file serve karta hai |
| Web Update | **Service Worker** | Website pe SW update + SKIP_WAITING + reload |

**Koi third-party paid service nahi lagti** — sab kuch GitHub Free CI + free hosting se chalta hai.

---

## 4. Files aur Unka Code (Copy-Paste Ready)

### 4.1 `public/update.json` — Server-side version metadata

```json
{
  "version": "2.2.63",
  "url": "https://roomiekhata.vercel.app/RoomieKhata_v2.2.63.apk"
}
```

> Har release par `version` aur `url` update karna hota hai (CI automatically kar deta hai).

---

### 4.2 `src/config/version.ts` — Current version + changelog

```ts
export const APP_VERSION = '2.2.63';
export const PREVIOUS_VERSION = '2.2.62';

export interface ChangelogItem {
  icon: string;
  title: string;
  description: string;
  type: 'feature' | 'improvement' | 'fix';
}

export const VERSION_CHANGELOG: Record<string, ChangelogItem[]> = {
  '2.2.63': [
    {
      icon: '⚡',
      title: 'Enhanced Performance & Bug Fixes',
      description: 'Enhanced performance and bug fixes.',
      type: 'improvement',
    },
  ],
  '2.2.62': [ /* ... */ ],
};

export const CHANGELOG: ChangelogItem[] = VERSION_CHANGELOG[APP_VERSION] || [];

export const getVersionInfo = () => {
  return {
    current: APP_VERSION,
    previous: PREVIOUS_VERSION,
    changelog: CHANGELOG,
    releaseDate: new Date().toLocaleDateString('hi-IN', {
      year: 'numeric', month: 'long', day: 'numeric',
    }),
  };
};
```

---

### 4.3 `src/utils/` — Version compare helper (Settings.tsx mein use hoti hai)

```ts
export const isNewerVersion = (remote: string, local: string) => {
  const r = remote.split('.').map(Number);
  const l = local.split('.').map(Number);
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    if ((r[i] || 0) > (l[i] || 0)) return true;
    if ((r[i] || 0) < (l[i] || 0)) return false;
  }
  return false;
};
```

---

### 4.4 `src/components/UpdateChecker.tsx` — Update popup (app start par check)

**3 kaam karta hai:**
1. **"What's New" popup** — jab app khola jaye tablatest changelog dikhata hai
2. **Background version check** — app start, app active, aur har 15 min mein server se naya version puchta hai
3. **Download & Install** — native plugin se APK download + install

```tsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { APP_VERSION, VERSION_CHANGELOG, getVersionInfo, getUpdateMessage } from '@/config/version';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';
import { Download, Sparkles, TrendingUp } from 'lucide-react';

// localStorage keys — istarah se popup baar-baar nahi aata
const VERSION_SEEN_KEY = 'roomiekhata_last_seen_version';
const UPDATE_DISMISS_KEY = 'roomiekhata_update_dismissed';

interface UpdateData { version: string; url: string; }

export const UpdateChecker: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [updateData, setUpdateData] = useState<UpdateData | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'installing' | 'error'>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const progressRef = useRef<any>(null);
  const errorRef = useRef<any>(null);
  const completeRef = useRef<any>(null);

  const cleanup = useCallback(() => {
    progressRef.current?.remove(); progressRef.current = null;
    errorRef.current?.remove(); errorRef.current = null;
    completeRef.current?.remove(); completeRef.current = null;
  }, []);

  // Step 1: APK kholte hi — naya changelog dikhao
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const lastSeen = localStorage.getItem(VERSION_SEEN_KEY);
    if (lastSeen !== APP_VERSION) { setVisible(true); }
  }, []);

  // Step 2: Server se naya version check (start, active, har 15 min)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const check = async () => {
      try {
        const res = await fetch('https://roomiekhata.vercel.app/update.json?nocache=' + Date.now());
        if (!res.ok) return;
        const data: UpdateData = await res.json();
        if (isNewerVersion(data.version, APP_VERSION)) {
          setUpdateData(data);
          const dismissTime = localStorage.getItem(UPDATE_DISMISS_KEY);
          if (!dismissTime || Date.now() > parseInt(dismissTime)) setVisible(true);
        }
      } catch (e) { console.error('Update check failed:', e); }
    };

    const initial = setTimeout(check, 2000);
    const appState = App.addListener('appStateChange', (state) => { if (state.isActive) check(); });
    const periodic = setInterval(check, 15 * 60 * 1000);

    return () => { clearTimeout(initial); appState.then(l => l.remove()); clearInterval(periodic); };
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const isNewerVersion = (remote: string, local: string) => {
    const r = remote.split('.').map(Number);
    const l = local.split('.').map(Number);
    for (let i = 0; i < Math.max(r.length, l.length); i++) {
      if ((r[i] || 0) > (l[i] || 0)) return true;
      if ((r[i] || 0) < (l[i] || 0)) return false;
    }
    return false;
  };

  // Download + Install (native plugin)
  const handleUpdate = async () => {
    if (!updateData?.url) return;
    cleanup();
    setDownloadStatus('downloading');
    setDownloadProgress(0);
    setErrorMsg('');

    try {
      if (Capacitor.isNativePlatform()) {
        const { ApkUpdater } = Capacitor.Plugins;
        if (ApkUpdater) {
          progressRef.current = (ApkUpdater as any).addListener('onDownloadProgress', (info: any) =>
            setDownloadProgress(info.progress));
          errorRef.current = (ApkUpdater as any).addListener('onDownloadError', (info: any) => {
            cleanup(); setDownloadStatus('error'); setErrorMsg(info.message || 'Download failed.');
          });
          completeRef.current = (ApkUpdater as any).addListener('onDownloadComplete', () => {
            cleanup(); setDownloadStatus('installing');
          });
          await ApkUpdater.downloadAndInstall({
            url: updateData.url,
            filename: `RoomieKhata_v${updateData.version}.apk`
          });
          return;
        }
      }
      // Fallback: browser se download
      cleanup();
      await Browser.open({ url: updateData.url });
      setDownloadStatus('idle');
    } catch (error: any) {
      cleanup(); setDownloadStatus('error');
      setErrorMsg(error?.message || 'Download failed.');
    }
  };

  const handleDismiss = () => {
    cleanup();
    localStorage.setItem(VERSION_SEEN_KEY, APP_VERSION);
    localStorage.setItem(UPDATE_DISMISS_KEY, (Date.now() + 15 * 60 * 1000).toString());
    setVisible(false);
    setDownloadStatus('idle');
  };

  if (!visible) return null;

  const versionInfo = getVersionInfo();
  const updateMessage = getUpdateMessage();
  const isUpdate = !!updateData;
  const targetVersion = isUpdate ? updateData?.version : APP_VERSION;
  const changelog = VERSION_CHANGELOG[targetVersion || APP_VERSION] || [];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="p-6 text-center">
          {/* Icon */}
          <div className={`w-16 h-16 ${isUpdate ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'} rounded-full flex items-center justify-center mx-auto mb-4`}>
            {isUpdate
              ? <Download className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              : <Sparkles className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />}
          </div>

          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {isUpdate ? `v${updateData.version} Ready!` : `${updateMessage.emoji} ${updateMessage.title}`}
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            {isUpdate ? 'New version ready hai — download karo.' : `Version ${APP_VERSION} — kya naya aaya:`}
          </p>

          {/* Changelog */}
          {changelog.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-left mb-4 max-h-[200px] overflow-y-auto">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">What's New:</p>
              {changelog.map((item, i) => (
                <div key={i} className="flex items-start gap-2 mb-2">
                  <span className="text-lg flex-shrink-0">{item.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Progress */}
          {downloadStatus === 'downloading' && (
            <div className="mb-4">
              <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
                <div className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                     style={{ width: `${Math.max(5, downloadProgress)}%` }} />
              </div>
              <p className="text-xs text-gray-500">
                {downloadProgress > 0 ? `${downloadProgress}% downloaded...` : 'Downloading...'}
              </p>
            </div>
          )}
          {downloadStatus === 'installing' && (
            <p className="text-xs text-emerald-600 font-medium mb-4">Downloaded! Opening installer...</p>
          )}
          {downloadStatus === 'error' && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
              <p className="text-xs text-red-600 dark:text-red-400">{errorMsg}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            {isUpdate && downloadStatus === 'idle' && (
              <button onClick={handleUpdate}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl">
                <Download className="h-5 w-5 mr-2 inline" /> Download & Install
              </button>
            )}
            {isUpdate && downloadStatus === 'installing' && (
              <div className="w-full py-3 px-4 bg-emerald-100 text-emerald-700 font-medium rounded-xl text-center">
                Install Prompt Opened
              </div>
            )}
            {isUpdate && downloadStatus === 'error' && (
              <button onClick={handleUpdate}
                className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-xl">Retry</button>
            )}
            {!isUpdate && (
              <button onClick={handleDismiss}
                className="w-full py-3 px-4 bg-primary text-white font-medium rounded-xl">
                <Sparkles className="mr-2 h-4 w-4 inline" /> Samajh gaya! 🚀
              </button>
            )}
            {isUpdate && downloadStatus === 'idle' && (
              <button
                onClick={async () => { cleanup(); if (updateData?.url) await Browser.open({ url: updateData.url }); setDownloadStatus('idle'); }}
                className="w-full py-2.5 px-4 text-blue-600 font-medium rounded-xl text-sm">
                Download via Browser
              </button>
            )}
            <button onClick={handleDismiss}
              className="w-full py-3 px-4 bg-gray-100 text-gray-700 font-medium rounded-xl">
              {isUpdate ? 'Later' : 'Theek hai'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
```

> **Important UI flow:** `ApkUpdater.downloadAndInstall()` native code mein **immediately resolve** ho jaata hai
> (download background thread mein chalta hai). Isliye **listeners ko turant remove mat karna** — unhe
> `onDownloadComplete` / `onDownloadError` events ke andar hi cleanup karo. (Ye common bug tha — pehle progress
> kabhi update nahi hota tha.)

---

### 4.5 `src/pages/Settings.tsx` — Manual check + Install button (part)

```ts
// States
const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
const [installProgress, setInstallProgress] = useState(0);
const [installStatus, setInstallStatus] = useState<'downloading' | 'installing' | 'error' | 'idle'>('idle');

// Check for Updates (button)
const handleCheckUpdate = async () => {
  setIsCheckingUpdate(true);
  try {
    if (Capacitor.isNativePlatform()) {
      const res = await fetch('https://roomiekhata.vercel.app/update.json?t=' + Date.now());
      if (res.ok) {
        const data = await res.json();
        if (isNewerVersion(data.version, APP_VERSION)) {
          setApkUpdateAvailable(data.version);
          toast({ title: `Update v${data.version} available`, description: 'Install button dabao' });
        } else {
          toast({ title: 'Up to date', description: 'Latest version installed' });
        }
      }
    }
  } catch (error: any) {
    toast({ title: 'Error', description: error.message || 'Update check failed', variant: 'destructive' });
  } finally { setIsCheckingUpdate(false); }
};

// Install Update (button)
const handleInstallUpdate = async () => {
  setIsInstallingUpdate(true);
  setInstallProgress(0);
  setInstallStatus('downloading');
  try {
    if (Capacitor.isNativePlatform()) {
      const res = await fetch('https://roomiekhata.vercel.app/update.json?t=' + Date.now());
      const data = await res.json();
      if (!data.url) throw new Error('Update URL not found');

      const { ApkUpdater } = Capacitor.Plugins;
      // listeners: onDownloadProgress → progress bar
      //          onDownloadError   → error toast + reset
      //          onDownloadComplete → "Installer खुल रहा है..."
      await ApkUpdater.downloadAndInstall({ url: data.url, filename: `RoomieKhata_v${data.version}.apk` });
    }
  } catch (error: any) {
    setInstallStatus('error');
    toast({ title: 'Error', description: error.message, variant: 'destructive' });
  }
};
```

UI (SettingRow ke action mein):

```tsx
<SettingRow
  icon={<RefreshCw className={`h-5 w-5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />}
  label="Check for Updates"
  subtitle={apkUpdateAvailable ? `v${apkUpdateAvailable} available` : `v${APP_VERSION} (latest)`}
  action={
    apkUpdateAvailable ? (
      <div className="flex flex-col items-end gap-2">
        <Button size="sm" onClick={handleInstallUpdate} disabled={isInstallingUpdate} className="h-8 text-xs bg-rose-600">
          {isInstallingUpdate && installStatus !== 'error'
            ? installProgress >= 100 ? 'Installing...' : `${installProgress}%`
            : 'Install'}
        </Button>
        {isInstallingUpdate && installStatus !== 'error' && (
          <div className="w-36 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-rose-500 to-primary rounded-full transition-all duration-300"
                 style={{ width: `${installProgress}%` }} />
          </div>
        )}
      </div>
    ) : (
      <Button size="sm" variant="outline" onClick={handleCheckUpdate} disabled={isCheckingUpdate} className="h-8 text-xs">
        Check
      </Button>
    )
  }
/>
```

---

### 4.6 `android/.../ApkUpdaterPlugin.java` — Native Capacitor plugin (MOST IMPORTANT)

```java
package com.roomiekhata.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Environment;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "ApkUpdater")
public class ApkUpdaterPlugin extends Plugin {

    private volatile boolean isDownloading = false;

    @PluginMethod
    public void downloadAndInstall(PluginCall call) {
        String url = call.getString("url");
        String filename = call.getString("filename", "update.apk");
        if (url == null || url.isEmpty()) { call.reject("URL is required"); return; }
        if (isDownloading) { call.reject("Download already in progress"); return; }

        isDownloading = true;
        Context ctx = getContext();
        File destinationFile = new File(ctx.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS), filename);
        if (destinationFile.exists()) destinationFile.delete();

        new Thread(() -> downloadFile(url, destinationFile, call)).start();

        // NOTE: turant resolve — asli download background mein hota hai
        JSObject ret = new JSObject(); ret.put("status", "downloading");
        call.resolve(ret);
    }

    private void downloadFile(String url, File destinationFile, PluginCall call) {
        HttpURLConnection connection = null;
        InputStream inputStream = null;
        FileOutputStream outputStream = null;
        try {
            connection = (HttpURLConnection) new URL(url).openConnection();
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(30000);
            connection.setRequestMethod("GET");
            connection.setInstanceFollowRedirects(true);
            connection.connect();

            int responseCode = connection.getResponseCode();

            // Manual redirect handling (safety net)
            if (responseCode == 301 || responseCode == 302 || responseCode == 303
                || responseCode == 307 || responseCode == 308) {
                String newUrl = connection.getHeaderField("Location");
                connection.disconnect();
                if (newUrl != null) {
                    connection = (HttpURLConnection) new URL(newUrl).openConnection();
                    connection.setConnectTimeout(15000);
                    connection.setReadTimeout(30000);
                    connection.connect();
                    responseCode = connection.getResponseCode();
                }
            }

            if (responseCode < 200 || responseCode >= 300) {
                notifyError("Server error (HTTP " + responseCode + ")");
                isDownloading = false; return;
            }

            int totalSize = connection.getContentLength();
            inputStream = connection.getInputStream();
            outputStream = new FileOutputStream(destinationFile);

            byte[] buffer = new byte[8192];
            long downloaded = 0;
            int bytesRead, lastProgress = 0;

            while ((bytesRead = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, bytesRead);
                downloaded += bytesRead;
                if (totalSize > 0) {
                    int progress = (int) ((downloaded * 100L) / totalSize);
                    if (progress > lastProgress) {
                        lastProgress = progress;
                        JSObject ret = new JSObject();
                        ret.put("progress", progress);
                        ret.put("downloaded", downloaded);
                        ret.put("total", totalSize);
                        notifyListeners("onDownloadProgress", ret);
                    }
                }
            }
            outputStream.flush(); outputStream.close(); outputStream = null;
            inputStream.close(); inputStream = null;

            // Validation: chhota file = galat download
            if (destinationFile.length() < 1000) {
                destinationFile.delete();
                notifyError("Downloaded file is invalid. Please try again.");
                isDownloading = false; return;
            }

            JSObject ret = new JSObject(); ret.put("status", "completed");
            notifyListeners("onDownloadComplete", ret);

            launchInstaller(destinationFile);
            isDownloading = false;

        } catch (Exception e) {
            if (destinationFile.exists()) destinationFile.delete();
            String message;
            if (e instanceof java.net.UnknownHostException) message = "No internet connection.";
            else if (e instanceof java.net.SocketTimeoutException) message = "Connection timed out.";
            else message = "Download failed: " + e.getMessage();
            notifyError(message);
            isDownloading = false;
        } finally {
            try { if (inputStream != null) inputStream.close(); } catch (Exception ignored) {}
            try { if (outputStream != null) outputStream.close(); } catch (Exception ignored) {}
            if (connection != null) connection.disconnect();
        }
    }

    private void launchInstaller(File apkFile) {
        try {
            Uri apkUri = FileProvider.getUriForFile(
                getContext(), getContext().getPackageName() + ".fileprovider", apkFile);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
        } catch (Exception e) {
            notifyError("Download complete but installer failed. File saved at: " + apkFile.getAbsolutePath());
        }
    }

    private void notifyError(String message) {
        JSObject ret = new JSObject(); ret.put("message", message);
        notifyListeners("onDownloadError", ret);
    }
}
```

> **Eligibility check (Android):**
> - Plugin ko `MainActivity.java` mein register karna zaroori hai: `registerPlugin(ApkUpdaterPlugin.class)`
> - **FileProvider** manifest mein hona chahiye (APK ko installer tak pohochnane ke liye)
> - Download location app-private hai (`getExternalFilesDir`) isliye **extra STORAGE permission ki zaroorat nahi** ✓
> - `FileProvider` se file URI pass hota hai isliye **queryAllPackages / legacy intent flags ki zaroorat nahi** ✓

---

### 4.7 `MainActivity.java` — Plugin registration

```java
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ApkUpdaterPlugin.class);   // ← yahan
        super.onCreate(savedInstanceState);
        // permissions...
    }
}
```

---

### 4.8 `AndroidManifest.xml` — FileProvider (installer ke liye)

```xml
<provider
    android:name="androidx.core.content.FileProvider"
    android:authorities="${applicationId}.fileprovider"
    android:exported="false"
    android:grantUriPermissions="true">
    <meta-data
        android:name="android.support.FILE_PROVIDER_PATHS"
        android:resource="@xml/file_paths" />
</provider>
```

---

### 4.9 `res/xml/file_paths.xml` — Download folder expose karta hai

```xml
<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <external-files-path name="downloads" path="Download/" />
</paths>
```

---

### 4.10 CI (`build-apk.yml`) — Har push par auto-build + auto-publish

```yaml
name: Build Android APK

on:
  push:
    branches: [master]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --legacy-peer-deps

      - name: Clean old APKs
        run: rm -f public/RoomieKhata_*.apk

      - name: Build web assets
        run: npx vite build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}

      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'
      - uses: gradle/actions/setup-gradle@v4

      - name: Sync Capacitor
        run: npx cap sync android

      - name: Build release APK
        working-directory: android
        run: ./gradlew assembleRelease

      - name: Get version
        id: version
        run: echo "version=$(grep 'APP_VERSION' src/config/version.ts | head -1 | sed \"s/.*'\\(.*\\)'.*/\\1/\")" >> $GITHUB_OUTPUT

      - name: Push APK to repo
        env:
          GITHUB_PAT: ${{ secrets.GH_PAT }}
        run: |
          VERSION=${{ steps.version.outputs.version }}
          FILENAME="RoomieKhata_v${VERSION}.apk"
          cp android/app/build/outputs/apk/release/app-release.apk "public/${FILENAME}"
          cp "public/${FILENAME}" "public/RoomieKhata_latest.apk"
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git add public/
          git diff --cached --quiet && echo "No changes" && exit 0
          git commit -m "ci: update APK v${VERSION} [skip ci]"
          git push "https://user:${GITHUB_PAT}@github.com/USER/REPO.git" master
```

> **Yaad rakhna:** `update.json` CI mein auto-update **nahi** hota — version bump karne par
> manually ya release script se `public/update.json` ka `version` aur `url` update karna hota hai.
> RoomieKhata mein CI sirf APK publish karta hai; update.json version-release time par update hota hai.

---

## 5. Release Process (Naya Version Kaise Nikalte Ho) — Step by Step

1. **Version bump** karo in 3 jagah (consistent hona chahiye):
   - `src/config/version.ts` → `APP_VERSION = '2.2.X'` + changelog entry
   - `android/app/build.gradle` → `versionCode` +1, `versionName "2.2.X"`
   - `public/update.json` → `"version": "2.2.X"` + naya APK URL

2. **Commit + push** karo → GitHub Actions CI start hota hai.

3. CI:
   - `vite build` (web assets)
   - `cap sync android` (web → Android)
   - `./gradlew assembleRelease` (signed APK)
   - APK ko `public/RoomieKhata_v2.2.X.apk` + `public/RoomieKhata_latest.apk` mein push karta hai

4. **Vercel** automatically deploy karta hai (repo se connect hai):
   - `/update.json` → naya version milta hai
   - `/RoomieKhata_v2.2.X.apk` → download link

5. **Users:** jis user ne purana version (2.2.62) install kiya hai, wo app kholte hi popup dekhga:
   - "v2.2.63 Ready!" → **Download & Install** → naya version live!

---

## 6. Eligibility / Requirements (Dusre App Mein Implement Karne Ke Liye)

System kaam karne ke liye app mein **ye cheezein honi chahiye:**

| # | Requirement | Zaroori Kyun Hai |
|---|------------|-----------------|
| 1 | **Capacitor-based Android app** (ya direct native Android) | WebView bridge + plugin system ke liye |
| 2 | **Statically hosted file** (Vercel / Netlify / GitHub Pages / any CDN) | `update.json` aur APK serve karna |
| 3 | **HTTPS domain** | Android 9+ pe cleartext HTTP blocked hai |
| 4 | **GitHub repo + GitHub Actions** (ya koi bhi CI) | Har version ki signed APK banane ke liye |
| 5 | **Signed release keystore** (committed ya secure secret) | APK install hone ke liye valid signature chahiye |
| 6 | **FileProvider setup** in AndroidManifest + `file_paths.xml` | Download hui APK ko installer ke liye authorize karna |
| 7 | **Plugin registration** in `MainActivity` | ApkUpdater plugin JS se accessible ho |
| 8 | **version.json/update.json pattern** | Server se version compare ka mechanism |
| 9 | **localStorage** availability (Capacitor webview mein default hai) | Popup dismiss/seen yaad rakhna |

**NOT required:**
- ❌ Play Store / upload ka koi account nahi chahiye
- ❌ Paid update service (Microsoft Intune etc.) nahi chahiye
- ❌ STORAGE permission nahi chahiye (app-private file directory use hoti hai)
- ❌ Special Android settings nahi — `ACTION_VIEW` + `FileProvider` Android-agnostic hai
- ❌ Backend server nahi chahiye — sirf static JSON + APK file hosting

---

## 7. Dusre App Mein Implement Karne Ke Steps (Complete Guide)

### Step 1 — Pre-requisites
- Ek **Capacitor Android project** jo build hokar signed APK de raha ho
- Ek **static hosting** (Vercel/Netlify/GitHub Pages) jahan tum files daal sakte ho
- **HTTPS URL**

### Step 2 — Project structure mein ye files copy karo
```
YOUR-APP/
├── public/
│   └── update.json          ← version + APK url
├── src/
│   ├── config/
│   │   └── version.ts       ← APP_VERSION + changelog
│   └── components/
│       └── UpdateChecker.tsx ← popup + download logic
└── android/
    └── app/
        └── src/main/
            ├── java/com/your/app/
            │   └── ApkUpdaterPlugin.java   ← native plugin
            ├── AndroidManifest.xml          ← FileProvider entry
            └── res/xml/file_paths.xml       ← download path
```

### Step 3 — Plugin register (MainActivity)
```java
registerPlugin(ApkUpdaterPlugin.class);
```

### Step 4 — Manifest + FileProvider
`AndroidManifest.xml` mein provider block + `file_paths.xml` (Section 4.8 / 4.9 dekh lo).

### Step 5 — update.json ko apne domain pe daalo
```json
{ "version": "1.0.0", "url": "https://your-domain.com/app_v1.0.0.apk" }
```

### Step 6 — version.ts aur UpdateChecker mein URL change karo
- `fetch('https://<TUMHARA-DOMAIN>/update.json?nocache=' + Date.now())`
- `filename: 'YourApp_v' + data.version + '.apk'`
- Changelog apne versions ke hisaab se

### Step 7 — CI workflow copy karo
`.github/workflows/build-apk.yml` ko apne repo/secrets ke hisaab se adjust karo:
- `secrets.VITE_*` tumhare env vars ke liye (agar hain)
- Git push URL mein apna username/repo
- `GITHUB_PAT` secret (repo mein APK push karne ke liye) — GitHub Settings → Developer settings → Personal access token → repo scope

### Step 8 — Test karo
1. Version `1.0.0` ka APK banao, install karo
2. Version bump karke `1.0.1` karo, update.json update karo, CI se naya APK banwao
3. Purana app kholo → **"v1.0.1 Ready!" popup dikhna chahiye**
4. Download & Install dabao → progress dikhe → installer khule → update complete

---

## 8. Known Gotchas / Important Notes (Jaan Lena Zaroori)

1. **`downloadAndInstall` immediately resolve hota hai** — static code padhte waqt `await` dekh kar mat samajhna
   ki download complete hone par resolve hoga. Native code `call.resolve` turant karta hai.
   Progress nahi aaye toh **listeners ko turant remove ho rahe honge** — iska dhyan rakho.

2. **Redirect handling** — APK hosting par CDN/redirect hota hai toh `setInstanceFollowRedirects(true)`
   + manual redirect fallback dono rakho.

3. **File size validation** — download ke baad `< 1000 bytes` check karo, warna error 404/HTML page
   APK samajh ke installer pass karne pe crash hogi.

4. **Same filename = overwrite** — har version ka filename unique rakho (`RoomieKhata_v2.2.63.apk`),
   isse purana version overwrite nahi hota.

5. **Android "Install unknown apps"** — user ko apne phone pe app ke liye **"Allow from this source"**
   dena padega pehli baar jab installer system se permission maange. Ye normal Android behavior hai.
   Agar installer hi na khule → browser fallback diya hai, wo data share/save kar dega.

6. **versionCode har release mein +1** karna zaroori hai (Android ki requirement) — versionName string kaam
   nahi karta installation override ke liye.

7. **update.json caching** — URL ke saath `?nocache=Date.now()` add karna (ya `Cache-Control: no-store`)
   taaki jo version nibhaye wo stale na ho.

8. **Signature consistency** — in-app update tabhi install hoga jab **dono APK same keystore se signed**
   ho. Alag signature = Android "App not installed" error. Sandnya rakhna keystore kabhi mat badlo.

9. **Web (PWA) alag system** — website pe same popup nahi hota; wahan **service worker** + `SKIP_WAITING`
   + reload vai system use hota hai. Dono ko alag-alag samjho.

10. **Release dependencies** — `update.json` + CI dono dependencies hain. Agar CI fail ho jaye toh APK
    nahi banega; agar update.json update na ho toh users ko popup nahi milega. Dono ek saath release karo.

---

## 9. Quick Glossary (Sab Terms Simple Words Mein)

| Term | Matlab |
|------|--------|
| **Capacitor** | Web app ko real Android/iOS app banaane ka framework |
| **Plugin** | Native (Java) code ka bridge jo JS se call hota hai |
| **ApkUpdater** | Tumhara custom plugin — download + install ka kaam karta hai |
| **FileProvider** | Android ka safe mechanism — file ke liye permission pass karna |
| **ACTION_VIEW** | Image/video/file kholne wala generic Android intent (yahan APK installer) |
| **versionCode** | Android ka internal number (har release +1) |
| **versionName** | User ko dikhne wala version (2.2.63) |
| **update.json** | Hosting par ek chhota JSON file — batata hai latest version aur APK link |
| **Service Worker (web)** | Browser ka background script jo PWA updates handle karta hai |
| **CI / GitHub Actions** | Push hote hi automatically build+test+release karne wala system |

---

*Document generated for RoomieKhata in-app update system. Reusable pattern — kisi bhi Capacitor
Android app mein copy-paste implementation ke liye ready hai.*