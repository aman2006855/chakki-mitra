"use client";

import { useEffect, useState } from "react";
import { WifiOff, Send, RotateCw, AlertTriangle } from "lucide-react";
import {
  isOnline,
  onOnlineChange,
  getPendingOpsSummary,
  forceRetryAllPendingOps,
  requestManualSync,
  getPendingSms,
  removePendingSms,
  getOfflineReason,
} from "@/lib/offline-db";
import { isNativePlatform } from "@/lib/capacitor";
import BackgroundSms from "@/plugins/background-sms";

type Summary = {
  total: number; stuck: number; rejected: number; orphan: number; backingOff: number;
  lastError: string | null; lastStatus: number; maxAttempts: number; storageFull: boolean;
};

// Offline banner — net jaate hi dikhe: phone ka save data chal raha hai.
// + Pending SMS ek-tap resend (offline entry ka chhoota SMS).
// + SACH dikhata hai: sync asli me ho raha hai ya atak gaya (stuck par Retry).
export default function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [reason, setReason] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary>({
    total: 0, stuck: 0, rejected: 0, orphan: 0, backingOff: 0,
    lastError: null, lastStatus: 0, maxAttempts: 0, storageFull: false,
  });
  const [pendingSms, setPendingSms] = useState(0);
  const [sendingSms, setSendingSms] = useState(false);
  const [smsMsg, setSmsMsg] = useState("");
  const [retryMsg, setRetryMsg] = useState("");

  function refreshCounts() {
    try {
      setSummary(getPendingOpsSummary());
      setPendingSms(getPendingSms().length);
      setReason(getOfflineReason());
    } catch {}
  }

  useEffect(() => {
    setOnline(isOnline());
    refreshCounts();
    const unsub = onOnlineChange((o) => {
      setOnline(o);
      refreshCounts();
    });
    const t = setInterval(refreshCounts, 3000);
    return () => { unsub(); clearInterval(t); };
  }, []);

  async function sendPendingSms() {
    if (sendingSms || !isNativePlatform()) return;
    setSendingSms(true);
    setSmsMsg("");
    let sent = 0;
    let failed = 0;
    try {
      const list = getPendingSms();
      for (const s of list) {
        try {
          await BackgroundSms.sendSms({ phoneNumber: s.phone, message: s.message });
          removePendingSms(s.id);
          sent++;
        } catch {
          failed++;
        }
      }
    } catch {
      failed++;
    }
    refreshCounts();
    setSendingSms(false);
    if (sent > 0 && failed === 0) setSmsMsg(`✅ ${sent} SMS bhej diya!`);
    else if (sent > 0) setSmsMsg(`✅ ${sent} bheja · ❌ ${failed} baaki`);
    else setSmsMsg("❌ SMS nahi gaya — cellular/SMS permission check karo");
    setTimeout(() => setSmsMsg(""), 5000);
  }

  // Manual Sync button — user ke haath me: dabate hi probe + queue drain
  function manualSync() {
    try {
      requestManualSync();
      setRetryMsg("🔄 Sync chalu...");
      setTimeout(() => setRetryMsg(""), 2500);
    } catch {}
    refreshCounts();
  }

  // Permanent reject/backoff hatao + sync foran chalu (orphan heal bhi isi me hota hai)
  function retryStuck() {
    try {
      forceRetryAllPendingOps();
      window.dispatchEvent(new CustomEvent("cm:queue-write"));
      setRetryMsg("🔄 Dobara bhej rahe hain...");
      setTimeout(() => setRetryMsg(""), 4000);
    } catch {}
    refreshCounts();
  }

  const { total, stuck, rejected, orphan, lastError, maxAttempts, storageFull } = summary;
  if (online && total === 0 && pendingSms === 0 && !smsMsg && !retryMsg) return null;

  // Offline ka asli wajah dikhao — "net chalu hai par server tak nahi" aur
  // "internet hi band hai" dono same nahi hote
  const noInternet = reason !== "server";
  const offlineText = noInternet
    ? "📴 Offline — internet band hai"
    : "⚠️ Net chalu hai, par server tak nahi pahunch rahe — entries queue me save hain";

  // Stuck ka karan user ko dikhao (isise hume bhi pata chalta hai kya atka hai)
  const stuckReason = storageFull
    ? "phone storage full hai — purana data saaf karo"
    : rejected > 0
      ? lastError
        ? `server ne mana kiya: ${lastError}`
        : "server reject"
      : orphan > 0
        ? "khate (temp id) ka sync ruka"
        : `server busy — retry me${maxAttempts > 0 ? ` (${maxAttempts} try)` : ""}`;
  const stuckStyle = rejected > 0 ? "bg-amber-700 text-white" : "bg-amber-500 text-white";

  return (
    <div
      className={`px-4 py-1.5 flex items-center justify-center gap-1.5 text-[11px] font-semibold flex-wrap ${
        online ? (stuck > 0 ? stuckStyle : "bg-green-600 text-white") : noInternet ? "bg-gray-800 text-gray-100" : "bg-amber-600 text-white"
      }`}
    >
      {!online && <WifiOff className="w-3 h-3 shrink-0" />}
      {!online ? (
        <span>
          {offlineText}
          {total > 0 ? ` · ⏳${total} sync baaki` : ""}
        </span>
      ) : stuck > 0 ? (
        <span className="flex items-center gap-1 flex-wrap justify-center">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          {stuck} entry ruki — {stuckReason}
          <button
            type="button"
            onClick={retryStuck}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/25 active:bg-white/40"
          >
            <RotateCw className="w-3 h-3" />
            Retry
          </button>
        </span>
      ) : total > 0 ? (
        <span className="flex items-center gap-1 flex-wrap justify-center">
          ✅ Net wapas! ⏳{total} sync ho raha hai...
          <button
            type="button"
            onClick={manualSync}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 active:bg-white/40"
          >
            🔄 Sync
          </button>
        </span>
      ) : null}
      {retryMsg && <span>{retryMsg}</span>}
      {pendingSms > 0 && (
        <button
          type="button"
          onClick={sendPendingSms}
          disabled={sendingSms}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/20 active:bg-white/30 disabled:opacity-50"
        >
          <Send className="w-3 h-3" />
          {sendingSms ? "Bhej rahe..." : `📩 ${pendingSms} SMS bhejo`}
        </button>
      )}
      {smsMsg && <span>{smsMsg}</span>}
    </div>
  );
}
