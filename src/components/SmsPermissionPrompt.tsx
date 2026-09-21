"use client";

import { useState, useEffect } from "react";
import { MessageSquareText, X } from "lucide-react";
import BackgroundSms from "@/plugins/background-sms";
import { isNativePlatform } from "@/lib/capacitor";

// App kholne par SMS permission popup (native only).
// Granted hai to kuch nahi dikhta. Denied hai to Hindi+English guide.
export default function SmsPermissionPrompt() {
  const [visible, setVisible] = useState(false);
  const [checking, setChecking] = useState(true);
  const [deniedForever, setDeniedForever] = useState(false);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    (async () => {
      if (!isNativePlatform()) return;
      try {
        const res = await BackgroundSms.checkPermission();
        if (!res.granted) setVisible(true);
      } catch {}
      setChecking(false);
    })();
  }, []);

  const handleAllow = async () => {
    setAsking(true);
    try {
      const res = await BackgroundSms.requestPermission();
      if (res.granted) {
        setVisible(false);
      } else {
        // User ne Deny kiya — manual steps dikhao
        setDeniedForever(true);
      }
    } catch {
      setDeniedForever(true);
    }
    setAsking(false);
  };

  if (checking || !visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5">
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="absolute top-3 right-3 p-1 rounded-lg text-gray-400 hover:bg-gray-100"
          aria-label="Band karein"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <MessageSquareText className="w-7 h-7 text-orange-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">📩 SMS Permission Chahiye</h3>
          <p className="text-sm text-gray-600 mt-2 leading-relaxed">
            Har entry par grahak ko <b>automatic SMS receipt</b> bhejne ke liye
            humein SMS permission chahiye.
          </p>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">
            We need SMS permission to send automatic receipts to customers after every entry.
          </p>

          {deniedForever && (
            <div className="mt-3 text-left bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-amber-800 mb-1">📱 Manual tarika / Manual steps:</p>
              <ol className="text-xs text-amber-700 space-y-0.5 list-decimal list-inside">
                <li>Phone ki <b>Settings</b> kholo</li>
                <li><b>Apps → चक्की मित्र</b></li>
                <li><b>Permissions → SMS → Allow</b> karo</li>
              </ol>
              <p className="text-[11px] text-amber-600 mt-1">Open Settings → Apps → Chakki Mitra → Permissions → SMS → Allow.</p>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={() => setVisible(false)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-medium text-sm active:bg-gray-50"
            >
              Baad Me<br /><span className="text-[11px] text-gray-400">Later</span>
            </button>
            <button
              type="button"
              onClick={handleAllow}
              disabled={asking}
              className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white font-semibold text-sm active:bg-orange-600 disabled:opacity-60"
            >
              {asking ? "Ruko..." : (<>✅ Allow Karo<br /><span className="text-[11px] text-orange-100 font-normal">Grant permission</span></>)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
