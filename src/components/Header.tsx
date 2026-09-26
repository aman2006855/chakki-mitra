"use client";

import { useState, useEffect } from "react";
import { Wheat, LogOut, Wifi, WifiOff, Headphones } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { isOnline, onOnlineChange, getPendingOps } from "@/lib/offline-db";
import { api } from "@/lib/api";

interface HeaderProps {
  shopName: string;
  userName?: string;
  onSupportClick?: () => void;
}

export default function Header({ shopName, onSupportClick }: HeaderProps) {
  const { logout } = useAuth();
  const [online, setOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [supportDot, setSupportDot] = useState(false);

  useEffect(() => {
    setOnline(isOnline());
    setPendingCount(getPendingOps().length);
    const unsub = onOnlineChange((o) => {
      setOnline(o);
      if (o) {
        setTimeout(() => setPendingCount(getPendingOps().length), 1000);
      }
    });
    const interval = setInterval(() => setPendingCount(getPendingOps().length), 3000);
    return () => { unsub(); clearInterval(interval); };
  }, []);

  // Admin ka jawab aaya ho to headphone par dot
  useEffect(() => {
    let stop = false;
    async function checkSupport() {
      try {
        const res = await api("/api/support");
        if (!res.ok || stop) return;
        const d = await res.json();
        const has = ((d.tickets || []) as any[]).some(
          (t) => t.adminReply && ["new", "in_progress", "waiting"].includes(t.status)
        );
        setSupportDot(has);
      } catch {}
    }
    checkSupport();
    const t = setInterval(checkSupport, 60000);
    return () => { stop = true; clearInterval(t); };
  }, []);

  return (
    <header className="bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-lg relative z-30">
      <div className="px-4 pt-3 pb-2" style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wheat className="w-6 h-6 text-amber-100" />
            <h1 className="text-xl font-bold tracking-wide">चक्की मित्र</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
              online ? "bg-green-500/20 text-green-100" : "bg-red-500/20 text-red-200"
            }`}>
              {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {online ? "Online" : "Offline"}
              {pendingCount > 0 && (
                <span className="ml-0.5 bg-white/20 rounded-full px-1" title="Sync pending">
                  ⏳{pendingCount}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onSupportClick}
              className="relative p-1.5 rounded-lg hover:bg-white/10 active:bg-white/20"
              title="Support"
              aria-label="Support"
            >
              <Headphones className="w-4 h-4 text-orange-100" />
              {supportDot && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-red-400 ring-2 ring-orange-600" />
              )}
            </button>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg hover:bg-white/10 active:bg-white/20"
              title="Log out"
            >
              <LogOut className="w-4 h-4 text-orange-100" />
            </button>
          </div>
        </div>
        {shopName && (
          <p className="text-xs text-orange-100 ml-8 truncate">{shopName}</p>
        )}
      </div>
    </header>
  );
}
