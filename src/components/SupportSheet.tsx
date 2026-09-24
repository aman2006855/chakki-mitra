"use client";

import { ArrowLeft, Headphones } from "lucide-react";
import Support from "./Support";

interface SupportSheetProps {
  onClose: () => void;
}

// Full-screen support — header ke 🎧 button se khulta hai (professional apps pattern)
export default function SupportSheet({ onClose }: SupportSheetProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50 sup-sheet">
      <style>{`
        @keyframes supSheetUp { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
        .sup-sheet { animation: supSheetUp .28s cubic-bezier(.22,1,.36,1); }
      `}</style>

      {/* Sheet header */}
      <div
        className="bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-lg shrink-0"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="px-3 py-3 flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="p-2 -ml-1 rounded-xl hover:bg-white/10 active:bg-white/20"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-9 h-9 rounded-2xl bg-white/20 flex items-center justify-center">
            <Headphones className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold leading-tight">Help & Support</h1>
            <p className="text-[11px] text-orange-100">Hum yahin hain — ticket bhejo, jawab pao</p>
          </div>
        </div>
      </div>

      {/* Body — poora Support system */}
      <div className="flex-1 overflow-y-auto p-3 pb-8">
        <Support />
      </div>
    </div>
  );
}
