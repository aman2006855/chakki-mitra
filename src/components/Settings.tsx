"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Save, Download, Upload, RefreshCw, MessageSquareText, CheckCircle2, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import BackgroundSms from "@/plugins/background-sms";
import { isNativePlatform } from "@/lib/capacitor";

const GITHUB_REPO = "aman2006855/chakki-mitra";
const GITHUB_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

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

export default function Settings({ settings, onUpdate }: SettingsProps) {
  const router = useRouter();
  const { logout } = useAuth();
  const [shopName, setShopName] = useState(settings.shopName);
  const [shopPhone, setShopPhone] = useState(settings.shopPhone);
  const [attaRate, setAttaRate] = useState(settings.attaRate);
  const [daliaRate, setDaliaRate] = useState(settings.daliaRate);
  const [message, setMessage] = useState<string>("");
  const [appVersion, setAppVersion] = useState("1.0.0");
  const [latestVersion, setLatestVersion] = useState("");
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [checkingUpdate, setCheckingUpdate] = useState(true);
  const [smsGranted, setSmsGranted] = useState<boolean | null>(null);
  const [smsAsking, setSmsAsking] = useState(false);
  // email change
  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [ecOtpSent, setEcOtpSent] = useState(false);
  const [ecOtp, setEcOtp] = useState("");
  const [ecBusy, setEcBusy] = useState(false);

  useEffect(() => {
    getVersion();
    checkUpdate();
    checkSmsPermission();
    fetchCurrentEmail();
  }, []);

  async function fetchCurrentEmail() {
    try {
      const res = await api("/api/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.email) setCurrentEmail(data.email);
      }
    } catch {}
  }

  async function handleEmailOtpSend() {
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      showMessage("❌ Sahi nayi email dalo");
      return;
    }
    if (newEmail === currentEmail) {
      showMessage("⚠️ Ye to wahi purani email hai");
      return;
    }
    setEcBusy(true);
    try {
      const res = await api("/api/auth/otp/send", {
        method: "POST",
        body: JSON.stringify({ email: newEmail, purpose: "change" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "OTP nahi bheja gaya");
      setEcOtpSent(true);
      showMessage(`📩 OTP ${newEmail} par bheja gaya! Purani email par kuch nahi jayega.`);
    } catch (e: any) {
      showMessage(`❌ ${e.message || "OTP nahi bheja gaya"}`);
    }
    setEcBusy(false);
  }

  async function handleEmailChange() {
    if (!ecOtp || ecOtp.length !== 6) {
      showMessage("❌ 6-digit OTP dalo");
      return;
    }
    setEcBusy(true);
    try {
      const res = await api("/api/auth/email/change", {
        method: "POST",
        body: JSON.stringify({ newEmail, code: ecOtp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Email change nahi hua");
      setCurrentEmail(data.email || newEmail);
      setNewEmail(""); setEcOtp(""); setEcOtpSent(false);
      showMessage("✅ Email change ho gayi!");
      onUpdate();
    } catch (e: any) {
      showMessage(`❌ ${e.message || "Email change nahi hua"}`);
    }
    setEcBusy(false);
  }

  async function checkSmsPermission() {
    if (!isNativePlatform()) return;
    try {
      const res = await BackgroundSms.checkPermission();
      setSmsGranted(res.granted);
    } catch {
      setSmsGranted(false);
    }
  }

  async function handleSmsAllow() {
    setSmsAsking(true);
    try {
      const res = await BackgroundSms.requestPermission();
      setSmsGranted(res.granted);
      showMessage(res.granted ? "✅ SMS permission mil gayi!" : "⚠️ Permission nahi mili — neeche manual steps dekho");
    } catch {
      setSmsGranted(false);
      showMessage("⚠️ Permission nahi mili — neeche manual steps dekho");
    }
    setSmsAsking(false);
  }

  async function getVersion() {
    try {
      const info = await App.getInfo();
      setAppVersion(info.version);
    } catch {}
  }

  async function checkUpdate() {
    setCheckingUpdate(true);
    try {
      const res = await fetch(GITHUB_API);
      if (!res.ok) return;
      const release = await res.json();
      const tag = release.tag_name || "";
      if (!tag) return;

      const info = await App.getInfo();
      if (isNewer(tag, info.version)) {
        const apkAsset = (release.assets || []).find(
          (a: any) => a.name.endsWith(".apk")
        );
        if (apkAsset) {
          setLatestVersion(tag);
          setDownloadUrl(apkAsset.browser_download_url);
          setUpdateAvailable(true);
        }
      }
    } catch {}
    setCheckingUpdate(false);
  }

  async function handleDownloadUpdate() {
    if (downloadUrl) {
      await Browser.open({ url: downloadUrl });
    }
  }

  const msgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showMessage = (text: string, duration = 3000) => {
    if (msgTimerRef.current) clearTimeout(msgTimerRef.current);
    setMessage(text);
    msgTimerRef.current = setTimeout(() => setMessage(""), duration);
  };

  const handleSave = async () => {
    try {
      const res = await api("/api/settings", {
        method: "PUT",
        body: JSON.stringify({ shopName, shopPhone, attaRate, daliaRate }),
      });
      if (res.ok) {
        showMessage("✅ सेटिंग सेव हो गई!");
        onUpdate();
      } else {
        showMessage("❌ सेव नहीं हो पाई");
      }
    } catch {
      showMessage("❌ सेव नहीं हो पाई");
    }
  };

  const handleExport = async () => {
    try {
      const [customersRes, transactionsRes, paymentsRes, settingsRes] = await Promise.all([
        api("/api/customers").then((r) => r.json()),
        api("/api/transactions").then((r) => r.json()),
        api("/api/payments").then((r) => r.json()),
        api("/api/settings").then((r) => r.json()),
      ]);
      const data = {
        customers: customersRes,
        transactions: transactionsRes,
        payments: paymentsRes,
        settings: settingsRes,
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chakki-mitra-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showMessage("✅ बैकअप डाउनलोड हो गया!");
    } catch {
      showMessage("❌ बैकअप नहीं हो पाया");
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        showMessage("⚠️ इम्पोर्ट फीचर शीघ्र ही उपलब्ध होगा!");
      } catch {
        showMessage("❌ फ़ाइल में एरर है");
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

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📧 Email Change</h3>
        {currentEmail ? (
          <p className="text-xs text-gray-500 mb-3">Current: <b className="text-gray-800">{currentEmail}</b></p>
        ) : null}
        {!ecOtpSent ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nayi email (OTP isi par ayega, purani par nahi)</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="nayi@email.com"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
              />
            </div>
            <button
              type="button"
              onClick={handleEmailOtpSend}
              disabled={ecBusy}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-orange-200 text-orange-700 text-sm font-semibold active:bg-orange-50 disabled:opacity-60"
            >
              {ecBusy ? "Bhej rahe hain..." : "📩 Nayi Email par OTP Bhejo"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2">📩 OTP <b>{newEmail}</b> par bheja gaya!</p>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">6-digit OTP</label>
              <input
                inputMode="numeric"
                value={ecOtp}
                onChange={(e) => setEcOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="••••••"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400 text-center tracking-[0.5em] font-bold"
              />
            </div>
            <button
              type="button"
              onClick={handleEmailChange}
              disabled={ecBusy}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-green-500 text-white text-sm font-semibold active:bg-green-600 disabled:opacity-60"
            >
              {ecBusy ? "Ruko..." : "✅ Verify & Email Change Karo"}
            </button>
            <button
              type="button"
              onClick={handleEmailOtpSend}
              disabled={ecBusy}
              className="w-full text-center text-xs text-orange-600 font-semibold"
            >
              OTP dobara bhejo
            </button>
          </div>
        )}
      </div>

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

      <button
        type="button"
        onClick={handleSave}
        className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-3 rounded-xl font-semibold active:bg-orange-600"
      >
        <Save className="w-5 h-5" />
        सेटिंग सेव करें
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📩 SMS Permission</h3>
        {smsGranted === null ? (
          <p className="text-xs text-gray-400">Web par SMS permission लागू नहीं होती — ye sirf APK me dikhta hai. / SMS permission applies only in the Android app.</p>
        ) : (
          <div className="space-y-3">
            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold ${
              smsGranted
                ? "bg-green-50 text-green-700 border-green-200"
                : "bg-red-50 text-red-700 border-red-200"
            }`}>
              {smsGranted ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              {smsGranted ? "✅ Permission Granted — SMS jayega!" : "❌ Permission Nahi Mili — SMS nahi jayega"}
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Har entry par grahak ko automatic SMS receipt bhejne ke liye permission chahiye.
              <span className="text-gray-400"> SMS permission is needed to send automatic receipts after every entry.</span>
            </p>
            {!smsGranted && (
              <>
                <button
                  type="button"
                  onClick={handleSmsAllow}
                  disabled={smsAsking}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 text-white text-sm font-semibold active:bg-orange-600 disabled:opacity-60"
                >
                  <MessageSquareText className="w-4 h-4" />
                  {smsAsking ? "Ruko..." : "✅ Permission Do / Grant"}
                </button>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-800 mb-1">📱 Manual tarika / Manual steps:</p>
                  <ol className="text-xs text-amber-700 space-y-0.5 list-decimal list-inside">
                    <li>Phone ki <b>Settings</b> kholo</li>
                    <li><b>Apps → चक्की मित्र</b></li>
                    <li><b>Permissions → SMS → Allow</b> karo</li>
                  </ol>
                </div>
              </>
            )}
          </div>
        )}
      </div>

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

      <button
        type="button"
        onClick={() => {
          logout();
          router.replace("/login");
        }}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-red-200 text-red-600 font-semibold active:bg-red-50"
      >
        🚪 लॉगआउट
      </button>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📱 ऐप जानकारी</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">वर्शन</span>
            <span className="font-mono font-medium text-gray-900">v{appVersion}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">अपडेट</span>
            {checkingUpdate ? (
              <span className="text-gray-400 text-xs">चेक हो रहा है...</span>
            ) : updateAvailable ? (
              <button
                onClick={handleDownloadUpdate}
                className="flex items-center gap-1 text-orange-600 font-semibold text-xs active:text-orange-800"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                v{latestVersion} उपलब्ध
              </button>
            ) : (
              <span className="text-green-600 text-xs font-medium">✅ अपडेटेड</span>
            )}
          </div>
        </div>
      </div>

      <div className="text-center text-xs text-gray-400 py-2">
        <div className="font-medium">चक्की मित्र</div>
        <div className="mt-0.5">आटा चक्की का डिजिटल बहीखाता 📖</div>
      </div>
    </div>
  );
}
