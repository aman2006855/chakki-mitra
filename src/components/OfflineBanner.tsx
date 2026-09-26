"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { isOnline, onOnlineChange, getPendingOps } from "@/lib/offline-db";

// Offline banner — net jaate hi dikhe: phone ka save data chal raha hai
export default function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    setOnline(isOnline());
    setPending(getPendingOps().length);
    const unsub = onOnlineChange((o) => {
      setOnline(o);
      setPending(getPendingOps().length);
    });
    const t = setInterval(() => setPending(getPendingOps().length), 3000);
    return () => { unsub(); clearInterval(t); };
  }, []);

  if (online && pending === 0) return null;

  return (
    <div
      className={`px-4 py-1.5 flex items-center justify-center gap-1.5 text-[11px] font-semibold ${
        online ? "bg-green-600 text-white" : "bg-gray-800 text-gray-100"
      }`}
    >
      {!online && <WifiOff className="w-3 h-3" />}
      {!online
        ? `📴 Offline — phone me save data dikh raha hai${pending > 0 ? ` · ⏳${pending} sync baaki` : ""}`
        : `✅ Net wapas! ⏳${pending} sync ho raha hai...`}
    </div>
  );
}
