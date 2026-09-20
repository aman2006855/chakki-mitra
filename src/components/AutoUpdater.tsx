"use client";

import { useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";

const GITHUB_REPO = "aman2006855/chakki-mitra";
const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

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

export default function AutoUpdater() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [releaseNotes, setReleaseNotes] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [latestVersion, setLatestVersion] = useState("");

  useEffect(() => {
    checkForUpdate();
  }, []);

  async function checkForUpdate() {
    try {
      const info = await App.getInfo();
      const currentVersion = info.version;

      const res = await fetch(GITHUB_API);
      if (!res.ok) return;
      const release = await res.json();

      const tag = release.tag_name || "";
      if (!tag || !isNewer(tag, currentVersion)) return;

      const apkAsset = (release.assets || []).find(
        (a: any) => a.name.endsWith(".apk")
      );
      if (!apkAsset) return;

      setLatestVersion(tag);
      setReleaseNotes(release.body || "");
      setDownloadUrl(apkAsset.browser_download_url);
      setShowUpdate(true);
    } catch {}
  }

  async function handleUpdate() {
    setShowUpdate(false);
    await Browser.open({ url: downloadUrl });
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
            v{latestVersion}
          </p>
        </div>

        {releaseNotes && (
          <div className="bg-gray-50 rounded-xl p-4 mb-4 max-h-40 overflow-y-auto">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{releaseNotes}</p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => setShowUpdate(false)}
            className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
          >
            बाद में
          </button>
          <button
            onClick={handleUpdate}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold hover:from-orange-600 hover:to-orange-700 transition-colors"
          >
            अपडेट करें
          </button>
        </div>
      </div>
    </div>
  );
}
