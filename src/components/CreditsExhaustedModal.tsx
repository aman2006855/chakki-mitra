"use client";

import { useState } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreditsExhaustedModal({ isOpen, onClose }: Props) {
  const [msg, setMsg] = useState("");
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
        <div className="text-center mb-4">
          <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">📩</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">SMS क्रेडिट खत्म!</h2>
          <p className="text-sm text-gray-500 mt-1">
            आपके फ्री SMS क्रेडिट खत्म हो गए हैं। आप अपग्रेड कर सकते हैं या दोस्तों को इनवाइट करके फ्री क्रेडिट पा सकते हैं।
          </p>
        </div>

        <div className="space-y-3 mb-4">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
            <div className="text-xs text-orange-600 font-medium mb-1">प्रो प्लान</div>
            <div className="text-lg font-bold text-orange-700">₹99/माह या ₹499/वर्ष</div>
            <div className="text-[11px] text-orange-500 mt-1">अनलिमिटेड SMS + WhatsApp शेयर + रिपोर्ट्स</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
            <div className="text-xs text-green-600 font-medium mb-1">रेफर करें और कमाएं</div>
            <div className="text-sm font-bold text-green-700">दोस्त को इनवाइट करें → दोनों को +20 फ्री क्रेडिट</div>
          </div>
        </div>

        {msg && (
          <div className="bg-gray-50 text-gray-600 text-sm px-4 py-2.5 rounded-xl border border-gray-200 mb-3 text-center">
            {msg}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => {
              setMsg("⏳ जल्द उपलब्ध होगा — अभी सेटिंग्स में जाकर रेफरल कोड शेयर करें।");
            }}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-sm hover:from-orange-600 hover:to-orange-700 transition-colors"
          >
            प्रो अपग्रेड करें
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors"
          >
            बंद करें
          </button>
        </div>
      </div>
    </div>
  );
}
