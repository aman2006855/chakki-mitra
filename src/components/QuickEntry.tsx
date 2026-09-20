"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Plus, Minus, Save, UserPlus, Clock, ChevronRight } from "lucide-react";
import AddCustomer from "./AddCustomer";
import BackgroundSms from "@/plugins/background-sms";
import { isNativePlatform } from "@/lib/capacitor";
import { api } from "@/lib/api";

interface SettingsData {
  shopName: string;
  shopPhone: string;
  attaRate: string;
  daliaRate: string;
}

interface CustomerData {
  id: number;
  name: string;
  phone: string;
  address: string;
}

interface QuickEntryProps {
  settings: SettingsData;
  customers: CustomerData[];
  onSaved: () => void;
}

interface RecentTransaction {
  id: number;
  customerId: number;
  customerName?: string;
  productType: string;
  weight: string;
  rate: string;
  amount: string;
  paymentMode: string;
  notes: string;
  created_at: string;
}

export default function QuickEntry({
  settings,
  customers,
  onSaved,
}: QuickEntryProps) {
  const [product, setProduct] = useState<"atta" | "dalia">("atta");
  const [weight, setWeight] = useState<string>("");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [paymentMode, setPaymentMode] = useState<"cash" | "credit" | null>(null);
  const [notes, setNotes] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [dashboard, setDashboard] = useState<any>(null);
  const [recentTxns, setRecentTxns] = useState<RecentTransaction[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const rate = parseFloat(product === "atta" ? settings.attaRate : settings.daliaRate);
  const weightNum = parseFloat(weight) || 0;
  const totalAmount = weightNum * rate;

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  );

  useEffect(() => {
    fetchDashboard();
    fetchRecent();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api("/api/dashboard");
      if (res.ok) setDashboard(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRecent = async () => {
    try {
      const res = await api("/api/transactions");
      if (res.ok) {
        const txns = await res.json();
        const withCustomerNames = txns.map((t: any) => ({
          ...t,
          customerName: customers.find((c) => c.id === t.customerId)?.name,
        }));
        setRecentTxns(withCustomerNames.slice(0, 5));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(t);
    }
  }, [message]);

  const handleSave = async () => {
    if (!customerId) {
      setMessage({ type: "error", text: "⚠️ ग्राहक चुनें" });
      return;
    }
    if (weightNum <= 0) {
      setMessage({ type: "error", text: "⚠️ वजन डालें" });
      return;
    }
    if (!paymentMode) {
      setMessage({ type: "error", text: "⚠️ पेमेंट मोड चुनें" });
      return;
    }

    setSaving(true);
    try {
      const res = await api("/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          customerId: Number(customerId),
          productType: product,
          weight: weightNum.toString(),
          rate: rate.toString(),
          amount: totalAmount.toString(),
          paymentMode,
          notes,
        }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "✅ एंट्री सेव हो गई!" });
        setWeight("");
        setPaymentMode(null);
        setNotes("");
        fetchDashboard();
        fetchRecent();
        onSaved();

        if (isNativePlatform()) {
          const customer = customers.find((c) => c.id === customerId);
          if (customer?.phone) {
            const productLabel = product === "atta" ? "आटा" : "दलिया";
            const paymentLabel = paymentMode === "cash" ? "नगद" : "उधारी";
            const smsText = [
              `🌾 ${settings.shopName}`,
              `${productLabel} ${weightNum}kg × ₹${rate}/kg = ₹${totalAmount.toFixed(0)}`,
              `Mode: ${paymentLabel}`,
              `Dhanyavaad!`,
            ].join("\n");
            try {
              const smsResult = await BackgroundSms.sendSms({
                phoneNumber: customer.phone,
                message: smsText,
              });
              console.log("SMS sent:", smsResult);
            } catch (e: any) {
              console.error("SMS failed:", e);
              setMessage({ type: "error", text: `⚠️ SMS नहीं भेजा: ${e?.message || e}` });
            }
          }
        }
      } else {
        setMessage({ type: "error", text: "❌ सेव नहीं हो पाई" });
      }
    } catch {
      setMessage({ type: "error", text: "❌ नेटवर्क एरर" });
    }
    setSaving(false);
  };

  const handleAddCustomer = async (c: { name: string; phone: string; address: string }) => {
    const res = await api("/api/customers", {
      method: "POST",
      body: JSON.stringify(c),
    });
    if (res.ok) {
      const data = await res.json();
      setCustomerId(data.id);
      onSaved();
    }
  };

  const handleWeightButton = (delta: number) => {
    setWeight((prev) => {
      const val = (parseFloat(prev) || 0) + delta;
      return val > 0 ? val.toFixed(1) : "0.1";
    });
  };

  const formatCurrency = (n: number) => `₹${n.toFixed(0)}`;

  return (
    <div className="px-4 py-3 flex flex-col h-full space-y-4">
      {message && (
        <div
          className={`px-4 py-2 rounded-lg text-sm font-medium text-center ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {dashboard && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center shadow-sm">
            <div className="text-[11px] text-gray-500 font-medium">आज की कमाई</div>
            <div className="text-base font-bold text-gray-900 leading-tight mt-0.5">
              {formatCurrency(dashboard.totalSales)}
            </div>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-200 p-3 text-center">
            <div className="text-[11px] text-green-600 font-medium">नगद</div>
            <div className="text-base font-bold text-green-700 leading-tight mt-0.5">
              {formatCurrency(dashboard.totalCash)}
            </div>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-200 p-3 text-center">
            <div className="text-[11px] text-red-600 font-medium">बकाया</div>
            <div className="text-base font-bold text-red-700 leading-tight mt-0.5">
              {formatCurrency(dashboard.totalOutstanding)}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => { setProduct("atta"); setWeight(""); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm transition-all ${
            product === "atta"
              ? "border-amber-400 bg-amber-50 shadow-sm font-bold text-amber-800"
              : "border-gray-200 bg-white text-gray-600 font-medium"
          }`}
        >
          <span>🌾 आटा</span>
          <span className="text-[11px] opacity-70">₹{settings.attaRate}/kg</span>
        </button>
        <button
          type="button"
          onClick={() => { setProduct("dalia"); setWeight(""); }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm transition-all ${
            product === "dalia"
              ? "border-amber-400 bg-amber-50 shadow-sm font-bold text-amber-800"
              : "border-gray-200 bg-white text-gray-600 font-medium"
          }`}
        >
          <span>🥣 दलिया</span>
          <span className="text-[11px] opacity-70">₹{settings.daliaRate}/kg</span>
        </button>
      </div>

      <div className="flex gap-3 relative">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex-1 flex items-center gap-2.5 px-4 py-3 bg-white border border-gray-300 rounded-xl text-left shadow-sm"
        >
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-700 truncate">
            {customerId !== null
              ? customers.find((c) => c.id === customerId)?.name || "चुनें"
              : "ग्राहक चुनें..."}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setShowAddCustomer(true)}
          className="flex items-center justify-center w-12 bg-orange-500 text-white rounded-xl active:bg-orange-600 flex-shrink-0 shadow-sm"
        >
          <UserPlus className="w-5 h-5" />
        </button>
        
        {searchOpen && (
          <div className="absolute top-full mt-1 w-full z-10 bg-white border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-y-auto">
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="खोजें..."
              className="w-full px-4 py-2.5 border-b border-gray-100 text-sm outline-none"
              onBlur={() => setTimeout(() => setSearchOpen(false), 200)}
            />
            {filteredCustomers.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCustomerId(c.id);
                  setSearchOpen(false);
                  setSearchQuery("");
                }}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left ${
                  customerId === c.id ? "bg-orange-50 text-orange-700" : "hover:bg-gray-50"
                }`}
              >
                <div className="truncate pr-2">
                  <div className="font-medium text-gray-800">{c.name}</div>
                  <div className="text-[11px] text-gray-500">{c.phone}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handleWeightButton(-0.5)}
            className="flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 active:bg-gray-200"
          >
            <Minus className="w-6 h-6 text-gray-700" />
          </button>
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="number"
              step="0.1"
              min="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="वजन (kg)"
              className="w-full text-center text-2xl font-bold py-2.5 rounded-xl border border-gray-300 bg-white outline-none focus:ring-2 focus:ring-amber-300 shadow-sm"
              inputMode="decimal"
            />
          </div>
          <button
            type="button"
            onClick={() => handleWeightButton(0.5)}
            className="flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 active:bg-gray-200"
          >
            <Plus className="w-6 h-6 text-gray-700" />
          </button>
        </div>
        <div className="flex justify-between mt-3">
          {[2, 5, 10, 15, 20].map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWeight(w.toString())}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                weight === w.toString()
                  ? "bg-amber-500 text-white border-amber-600"
                  : "bg-white text-gray-600 border-gray-200 active:bg-gray-100"
              }`}
            >
              {w}kg
            </button>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 flex items-center justify-between">
        <div className="text-xs text-amber-700 font-medium">
          {weightNum || 0}kg × ₹{rate}/kg
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-amber-800 font-bold">कुल राशि:</span>
          <span className="text-2xl font-black text-amber-600 tracking-tight">
            ₹{totalAmount.toFixed(0)}
          </span>
        </div>
      </div>

      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="नोट (वैकल्पिक)..."
        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-amber-300 shadow-sm"
      />

      <div className="flex gap-3 pt-1 pb-4">
        <button
          type="button"
          onClick={() => setPaymentMode("cash")}
          className={`flex-1 py-3 rounded-xl border font-bold text-sm transition-all ${
            paymentMode === "cash"
              ? "border-green-500 bg-green-50 text-green-700 shadow-sm"
              : "border-gray-200 bg-white text-gray-500"
          }`}
        >
          💵 नगद
        </button>
        <button
          type="button"
          onClick={() => setPaymentMode("credit")}
          className={`flex-1 py-3 rounded-xl border font-bold text-sm transition-all ${
            paymentMode === "credit"
              ? "border-red-500 bg-red-50 text-red-700 shadow-sm"
              : "border-gray-200 bg-white text-gray-500"
          }`}
        >
          📒 उधारी
        </button>
        
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex-[1.5] flex items-center justify-center gap-2 bg-orange-500 text-white py-3 rounded-xl font-black text-sm active:bg-orange-600 transition-colors disabled:opacity-60 shadow-md"
        >
          {saving ? (
            <span className="text-sm">सेव...</span>
          ) : (
            <>
              <Save className="w-5 h-5" />
              एंट्री सेव करें
            </>
          )}
        </button>
      </div>

      <AddCustomer
        isOpen={showAddCustomer}
        onClose={() => setShowAddCustomer(false)}
        onSave={handleAddCustomer}
      />
    </div>
  );
}
