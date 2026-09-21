"use client";

import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { API_BASE } from "./config";

type SaveSession = (
  userId: number,
  name: string,
  token: string,
  isRegistered?: boolean,
  shopName?: string
) => void;

// APK me Google login: system browser (Custom Tab) me kholo,
// callback chakkimitra://auth deep-link se app me wapas aayega.
// WebView me redirect karne par user browser/website par atak jata hai.
export async function loginWithGoogleNative(
  saveSession: SaveSession,
  onDone: (registered: boolean) => void,
  onError: (msg: string) => void
): Promise<void> {
  let listener: { remove: () => Promise<void> } | null = null;
  try {
    listener = await App.addListener("appUrlOpen", async (event) => {
      try {
        const url = new URL(event.url);
        if (url.protocol !== "chakkimitra:") return;
        const token = url.searchParams.get("token");
        if (!token || token.split(".").length !== 3) {
          onError("Google login adhura raha. Dobara try karein.");
          return;
        }
        let userId = 0;
        let name = url.searchParams.get("name") || "";
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          userId = payload.userId || 0;
          name = name || payload.name || "";
        } catch {}
        const registered = url.searchParams.get("registered") === "1";
        saveSession(userId, name, token, registered, "");
        try {
          await Browser.close();
        } catch {}
        onDone(registered);
      } catch {
        onError("Google login me samasya hui.");
      } finally {
        try {
          await listener?.remove();
        } catch {}
      }
    });
    await Browser.open({ url: `${API_BASE}/api/auth/google/login?platform=android` });
  } catch {
    try {
      await listener?.remove();
    } catch {}
    onError("Browser kholne me samasya hui.");
  }
}
