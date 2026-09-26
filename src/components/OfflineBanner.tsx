"use client";

import { useEffect, useState } from "react";
import { WifiOff, Send } from "lucide-react";
import { isOnline, onOnlineChange, getPendingOps, getPendingSms, removePendingSms } from "@/lib/offline-db";
import { isNativePlatform } from "@/lib/capacitor";
import BackgroundSms from "@/plugins/background-sms";

// Offline banner — net jaate hi dikhe: phone ka save data chal raha hai.
// + Pending SMS ek-tap resend (offline entry ka chhoota SMS).
export default function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [pendingSms, setPendingSms] = useState(0);
  const [sendingSms, setSendingSms] = useState(false);
  const [smsMsg, setSmsMsg] = useState("");

  function refreshCounts() {
    try {
      setPending(getPendingOps().length);
      setPendingSms(getPendingSms().length);
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

  if (online && pending === 0 && pendingSms === 0 && !smsMsg) return null;

  return (
    <div
      className={`px-4 py-1.5 flex items-center justify-center gap-1.5 text-[11px] font-semibold flex-wrap ${
        online ? "bg-green-600 text-white" : "bg-gray-800 text-gray-100"
      }`}
    >
      {!online && <WifiOff className="w-3 h-3" />}
      {!online ? (
        <span>
          📴 Offline — phone me save data dikh raha hai{pending > 0 ? ` · ⏳${pending} sync baaki` : ""}
        </span>
      ) : pending > 0 ? (
        <span>✅ Net wapas! ⏳{pending} sync ho raha hai...</span>
      ) : null}
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
