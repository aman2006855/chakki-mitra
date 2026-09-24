"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { isNativePlatform } from "@/lib/capacitor";
import ApkUpdater from "@/plugins/apk-updater";
import type { PluginListenerHandle } from "@capacitor/core";

const GITHUB_REPO = "aman2006855/chakki-mitra";
const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

// Popup dobara na dikhe — 15 min ke liye dismiss yaad rakho
const UPDATE_DISMISS_KEY = "chakki_mitra_update_dismissed";

function parseVersion(v: string): [number, number, number] {
  const clean = v.replace(/^v/, "").split("-")[0];
  const parts = clean.split(".").map(Number);
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

function isNewer(latest: string, current: string): boolean {
  const [a, b, c] = parseVersion(latest);
  const [x, y, z] = parseVersion(current);
  if (a !== x) return a > x;
  if (b !== y) return b > y;
  return c > z;
}

function formatSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `~${mb.toFixed(1)} MB` : `~${Math.max(1, Math.round(bytes / 1024))} KB`;
}

type DownloadStatus = "idle" | "downloading" | "installing" | "error";

export default function AutoUpdater() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [releaseNotes, setReleaseNotes] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [downloadSize, setDownloadSize] = useState("");
  const [latestVersion, setLatestVersion] = useState("");
  const [status, setStatus] = useState<DownloadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const listenersRef = useRef<PluginListenerHandle[]>([]);

  const cleanup = useCallback(() => {
    for (const h of listenersRef.current) {
      try { h.remove(); } catch {}
    }
    listenersRef.current = [];
  }, []);

  const checkForUpdate = useCallback(async () => {
    try {
      const info = await App.getInfo();
      const currentVersion = info.version;

      const res = await fetch(GITHUB_API);
      if (!res.ok) return;
      const release = await res.json();

      const tag = release.tag_name || "";
      if (!tag || !isNewer(tag, currentVersion)) return;

      const apkAsset =
        (release.assets || []).find((a: any) => a.name.includes("release") && a.name.endsWith(".apk")) ||
        (release.assets || []).find((a: any) => a.name.endsWith(".apk"));
      if (!apkAsset) return;

      setLatestVersion(tag);
      setReleaseNotes(release.body || "");
      setDownloadUrl(apkAsset.browser_download_url);
      setDownloadSize(formatSize(Number(apkAsset.size) || 0));

      const dismissedUntil = Number(localStorage.getItem(UPDATE_DISMISS_KEY) || 0);
      if (!dismissedUntil || Date.now() > dismissedUntil) {
        setStatus("idle");
        setProgress(0);
        setErrorMsg("");
        setShowUpdate(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    // Web pe popup bilkul nahi — sirf APK me
    if (!isNativePlatform()) return;
    checkForUpdate();

    const initial = setTimeout(checkForUpdate, 3000);
    let appStateHandle: PluginListenerHandle | null = null;
    App.addListener("appStateChange", (state) => {
      if (state.isActive) checkForUpdate();
    }).then((h) => { appStateHandle = h; }).catch(() => {});
    const periodic = setInterval(checkForUpdate, 15 * 60 * 1000);

    return () => {
      clearTimeout(initial);
      clearInterval(periodic);
      try { appStateHandle?.remove(); } catch {}
    };
  }, [checkForUpdate]);

  useEffect(() => cleanup, [cleanup]);

  async function handleUpdate() {
    if (!downloadUrl) return;
    setStatus("downloading");
    setProgress(0);
    setErrorMsg("");

    try {
      // Native in-app download + auto-install (ApkUpdater turant resolve hota hai —
      // listeners ko yahan remove MAT karo; complete/error me hi cleanup hoga)
      const progressH = await ApkUpdater.addListener("onDownloadProgress", (info) => {
        setProgress(info.progress || 0);
      });
      const errorH = await ApkUpdater.addListener("onDownloadError", (info) => {
        cleanup();
        setStatus("error");
        setErrorMsg(info.message || "Download failed.");
      });
      const completeH = await ApkUpdater.addListener("onDownloadComplete", () => {
        cleanup();
        setStatus("installing");
        localStorage.setItem(UPDATE_DISMISS_KEY, String(Date.now() + 15 * 60 * 1000));
      });
      listenersRef.current = [progressH, errorH, completeH];

      const fileName = `ChakkiMitra_v${latestVersion.replace(/^v/, "")}.apk`;
      await ApkUpdater.downloadAndInstall({ url: downloadUrl, filename: fileName });
      // installing state tab set hoga jab onDownloadComplete aaye
    } catch {
      // Plugin missing/purana APK — browser fallback
      cleanup();
      setStatus("idle");
      try { await Browser.open({ url: downloadUrl }); } catch {}
    }
  }

  function handleDismiss() {
    cleanup();
    localStorage.setItem(UPDATE_DISMISS_KEY, String(Date.now() + 15 * 60 * 1000));
    setShowUpdate(false);
    setStatus("idle");
    setProgress(0);
    setErrorMsg("");
  }

  if (!showUpdate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className="text-center mb-4">
          <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">🔄</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">अपडेट उपलब्ध है!</h2>
          <p className="text-sm text-gray-500 mt-1">
            v{latestVersion}{downloadSize ? ` · ⬇ ${downloadSize}` : ""}
          </p>
        </div>

        {releaseNotes && status === "idle" && (
          <div className="bg-gray-50 rounded-xl p-4 mb-4 max-h-40 overflow-y-auto">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{releaseNotes}</p>
          </div>
        )}

        {status === "downloading" && (
          <div className="mb-4">
            <div className="bg-gray-200 rounded-full h-3 mb-2">
              <div
                className="bg-gradient-to-r from-orange-500 to-orange-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(5, progress)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 text-center">
              {progress > 0 ? `${progress}% download ho raha hai...` : "Download shuru ho raha hai..."}
            </p>
          </div>
        )}
        {status === "installing" && (
          <p className="text-xs text-green-600 font-medium mb-4 text-center">
            ✅ Download pura! Installer khul raha hai...
          </p>
        )}
        {status === "error" && (
          <div className="mb-4 bg-red-50 rounded-xl p-3">
            <p className="text-xs text-red-600">{errorMsg}</p>
          </div>
        )}

        <div className="flex gap-3">
          {status !== "installing" && (
            <button
              onClick={handleDismiss}
              className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
            >
              बाद में
            </button>
          )}
          {status === "idle" && (
            <button
              onClick={handleUpdate}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold hover:from-orange-600 hover:to-orange-700 transition-colors"
            >
              अपडेट करें
            </button>
          )}
          {status === "error" && (
            <button
              onClick={handleUpdate}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold transition-colors"
            >
              Retry
            </button>
          )}
          {status === "installing" && (
            <div className="flex-1 py-3 rounded-xl bg-green-100 text-green-700 font-bold text-center text-sm">
              Installer khul gaya
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
