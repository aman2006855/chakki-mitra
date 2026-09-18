"use client";

import { useState } from "react";
import { Save, Download, Upload, RefreshCw } from "lucide-react";

interface SettingsData {
  shopName: string;
  shopPhone: string;
  attaRate: string;
  daliaRate: string;
}

interface SettingsProps {
  settings: SettingsData;
  onUpdate: () => void;
  customers: any[];
}

export default function Settings({ settings, onUpdate }: SettingsProps) {
  const [shopName, setShopName] = useState(settings.shopName);
  const [shopPhone, setShopPhone] = useState(settings.shopPhone);
  const [attaRate, setAttaRate] = useState(settings.attaRate);
  const [daliaRate, setDaliaRate] = useState(settings.daliaRate);
  const [message, setMessage] = useState<string>("");

  const handleSave = async () => {
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName,
          shopPhone,
          attaRate,
          daliaRate,
        }),
      });
      setMessage("✅ सेटिंग सेव हो गई!");
      onUpdate();
      setTimeout(() => setMessage(""), 3000);
    } catch {
      setMessage("❌ सेव नहीं हो पाई");
    }
  };

  const handleExport = async () => {
    try {
      const [customersRes, transactionsRes, paymentsRes, settingsRes] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/transactions"),
        fetch("/api/payments"),
        fetch("/api/settings"),
      ]);
      const data = {
        customers: await customersRes.json(),
        transactions: await transactionsRes.json(),
        payments: await paymentsRes.json(),
        settings: await settingsRes.json(),
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chakki-mitra-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("✅ बैकअप डाउनलोड हो गया!");
      setTimeout(() => setMessage(""), 3000);
    } catch {
      setMessage("❌ बैकअप नहीं हो पाया");
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        setMessage("⚠️ इम्पोर्ट फीचर शीघ्र ही उपलब्ध होगा!");
        setTimeout(() => setMessage(""), 4000);
      } catch {
        setMessage("❌ फ़ाइल में एरर है");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="px-4 py-4 space-y-5">
      <h2 className="text-lg font-bold text-gray-900">⚙️ सेटिंग्स</h2>

      {message && (
        <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
          message.startsWith("✅") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {message}
        </div>
      )}

      {/* Business Profile */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">🏪 बिज़नेस प्रोफाइल</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">दुकान का नाम</label>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">मोबाइल नंबर</label>
            <input
              type="tel"
              value={shopPhone}
              onChange={(e) => setShopPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="9876543210"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
            />
          </div>
        </div>
      </div>

      {/* Rate Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">💰 रेट कार्ड</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              🌾 आटा पिसाई का रेट (₹/किग्रा)
            </label>
            <input
              type="number"
              value={attaRate}
              onChange={(e) => setAttaRate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              🥣 दलिया पिसाई का रेट (₹/किग्रा)
            </label>
            <input
              type="number"
              value={daliaRate}
              onChange={(e) => setDaliaRate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
              inputMode="numeric"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        type="button"
        onClick={handleSave}
        className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-3 rounded-xl font-semibold active:bg-orange-600"
      >
        <Save className="w-5 h-5" />
        सेटिंग सेव करें
      </button>

      {/* Data Backup */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">💾 डेटा बैकअप</h3>
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleExport}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-200 text-sm font-medium active:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            JSON बैकअप डाउनलोड करें
          </button>
          <label className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-200 text-sm font-medium active:bg-gray-50 cursor-pointer">
            <Upload className="w-4 h-4" />
            JSON बैकअप इम्पोर्ट करें
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Logout */}
      <button
        type="button"
        onClick={async () => {
          await fetch("/api/auth/session", { method: "POST" });
          window.location.href = "/login";
        }}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-red-200 text-red-600 font-semibold active:bg-red-50"
      >
        🚪 लॉगआउट
      </button>

      {/* App Info */}
      <div className="text-center text-xs text-gray-400 py-4">
        <div className="font-medium">चक्की मित्र v1.0 (MVP)</div>
        <div className="mt-0.5">आटा चक्की का डिजिटल बहीखाता 📖</div>
      </div>
    </div>
  );
}
