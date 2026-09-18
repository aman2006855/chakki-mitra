"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Plus, Minus, Save, UserPlus, Clock, ChevronRight } from "lucide-react";
import AddCustomer from "./AddCustomer";

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
      const res = await fetch("/api/dashboard");
      if (res.ok) setDashboard(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRecent = async () => {
    try {
      const res = await fetch("/api/transactions");
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
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      } else {
        setMessage({ type: "error", text: "❌ सेव नहीं हो पाई" });
      }
    } catch {
      setMessage({ type: "error", text: "❌ नेटवर्क एरर" });
    }
    setSaving(false);
  };

  const handleAddCustomer = async (c: { name: string; phone: string; address: string }) => {
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

  const getProductLabel = (type: string) => {
    return type === "atta" ? "🌾 आटा" : "🥣 दलिया";
  };

  const formatCurrency = (n: number) => `₹${n.toFixed(0)}`;

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Message Banner */}
      {message && (
        <div
          className={`px-3 py-2 rounded-lg text-sm font-medium ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Daily Summary */}
      {dashboard && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-xl border border-gray-200 p-2.5 text-center shadow-sm">
            <div className="text-[10px] text-gray-500 font-medium">आज की कमाई</div>
            <div className="text-base font-bold text-gray-900 mt-0.5">
              {formatCurrency(dashboard.totalSales)}
            </div>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-200 p-2.5 text-center">
            <div className="text-[10px] text-green-600 font-medium">नगद</div>
            <div className="text-base font-bold text-green-700 mt-0.5">
              {formatCurrency(dashboard.totalCash)}
            </div>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-200 p-2.5 text-center">
            <div className="text-[10px] text-red-600 font-medium">बकाया</div>
            <div className="text-base font-bold text-red-700 mt-0.5">
              {formatCurrency(dashboard.totalOutstanding)}
            </div>
          </div>
        </div>
      )}

      {/* Product Selection */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          प्रोडक्ट चुनें
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => { setProduct("atta"); setWeight(""); }}
            className={`py-3 rounded-xl border-2 text-center transition-all ${
              product === "atta"
                ? "border-amber-400 bg-amber-50 shadow-sm"
                : "border-gray-200 bg-white"
            }`}
          >
            <div className="text-2xl">🌾</div>
            <div className="text-sm font-semibold mt-0.5 text-gray-800">आटा</div>
            <div className="text-xs text-gray-500">₹{settings.attaRate}/किग्रा</div>
          </button>
          <button
            type="button"
            onClick={() => { setProduct("dalia"); setWeight(""); }}
            className={`py-3 rounded-xl border-2 text-center transition-all ${
              product === "dalia"
                ? "border-amber-400 bg-amber-50 shadow-sm"
                : "border-gray-200 bg-white"
            }`}
          >
            <div className="text-2xl">🥣</div>
            <div className="text-sm font-semibold mt-0.5 text-gray-800">दलिया</div>
            <div className="text-xs text-gray-500">₹{settings.daliaRate}/किग्रा</div>
          </button>
        </div>
      </div>

      {/* Customer Selection */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          ग्राहक चुनें
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-300 rounded-xl text-left"
          >
            <Search className="w-4 h-4 text-gray-400" />
            <span className="text-sm">
              {customerId !== null
                ? customers.find((c) => c.id === customerId)?.name || "चुनें"
                : "ग्राहक चुनें..."}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShowAddCustomer(true)}
            className="flex items-center justify-center w-12 h-12 bg-orange-500 text-white rounded-xl active:bg-orange-600"
          >
            <UserPlus className="w-5 h-5" />
          </button>
        </div>

        {/* Customer Search Dropdown */}
        {searchOpen && (
          <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
            <input
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="नाम या नंबर से खोजें..."
              className="w-full px-3 py-2 border-b border-gray-100 text-sm outline-none"
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
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm ${
                  customerId === c.id
                    ? "bg-orange-50 text-orange-700"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="text-left">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-gray-500">{c.phone}</div>
                </div>
                {c.address && (
                  <span className="text-xs text-gray-400 truncate max-w-[100px]">
                    {c.address}
                  </span>
                )}
              </button>
            ))}
            {filteredCustomers.length === 0 && (
              <div className="px-3 py-4 text-sm text-gray-400 text-center">
                कोई ग्राहक नहीं मिला
              </div>
            )}
          </div>
        )}
      </div>

      {/* Weight Input */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">वजन (किग्रा)</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleWeightButton(-0.5)}
            className="flex items-center justify-center w-14 h-14 rounded-xl bg-gray-100 border-2 border-gray-200 active:bg-gray-200 active:border-gray-300"
          >
            <Minus className="w-6 h-6 text-gray-700" />
          </button>
          <input
            ref={inputRef}
            type="number"
            step="0.1"
            min="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="0.0"
            className="flex-1 text-center text-lg font-bold px-1 py-1.5 rounded-lg border border-gray-300 bg-white outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400"
            inputMode="decimal"
          />
          <button
            type="button"
            onClick={() => handleWeightButton(0.5)}
            className="flex items-center justify-center w-14 h-14 rounded-xl bg-gray-100 border-2 border-gray-200 active:bg-gray-200 active:border-gray-300"
          >
            <Plus className="w-6 h-6 text-gray-700" />
          </button>
        </div>
        {/* Quick weight buttons */}
        <div className="flex gap-2 mt-2 flex-wrap">
          {[1, 2, 5, 10, 15, 20].map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWeight(w.toString())}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                weight === w.toString()
                  ? "bg-amber-500 text-white"
                  : "bg-gray-100 text-gray-600 active:bg-gray-200"
              }`}
            >
              {w} किग्रा
            </button>
          ))}
        </div>
      </div>

      {/* Amount Display */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3 border border-amber-200">
        <div className="flex items-center justify-between">
          <span className="text-sm text-amber-700">कुल राशि</span>
          <span className="text-2xl font-bold text-amber-800">
            ₹{totalAmount.toFixed(2)}
          </span>
        </div>
        <div className="text-xs text-amber-600 mt-0.5 text-right">
          {weightNum} किग्रा × ₹{rate}/किग्रा
        </div>
      </div>

      {/* Payment Mode */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          पेमेंट मोड
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPaymentMode("cash")}
            className={`py-3 rounded-xl border-2 font-semibold text-base transition-all ${
              paymentMode === "cash"
                ? "border-green-500 bg-green-50 text-green-700 shadow-sm"
                : "border-gray-200 bg-white text-gray-600"
            }`}
          >
            💵 नगद (Cash)
          </button>
          <button
            type="button"
            onClick={() => setPaymentMode("credit")}
            className={`py-3 rounded-xl border-2 font-semibold text-base transition-all ${
              paymentMode === "credit"
                ? "border-red-500 bg-red-50 text-red-700 shadow-sm"
                : "border-gray-200 bg-white text-gray-600"
            }`}
          >
            📒 उधारी (Credit)
          </button>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">नोट (वैकल्पिक)</label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="कोई विशेष नोट..."
          className="w-full px-3 py-2.5 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400"
        />
      </div>

      {/* Save Button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 bg-orange-500 text-white py-3.5 rounded-xl font-bold text-base active:bg-orange-600 transition-colors disabled:opacity-60"
      >
        {saving ? (
          <span>सेव हो रही है...</span>
        ) : (
          <>
            <Save className="w-5 h-5" />
            एंट्री सेव करें
          </>
        )}
      </button>

      {/* Recent Transactions */}
      {recentTxns.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2 mt-4">
            <Clock className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-700">हाल की एंट्रियां</h3>
          </div>
          <div className="space-y-2">
            {recentTxns.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-lg border border-gray-200 p-2.5 flex items-center justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">{getProductLabel(t.productType)}</span>
                    <span className="text-xs text-gray-500">
                      {parseFloat(t.weight).toFixed(1)} किग्रा
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 truncate mt-0.5">
                    {t.customerName || `ग्राहक #${t.customerId}`}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <div className="text-sm font-bold text-gray-900">
                    {formatCurrency(parseFloat(t.amount))}
                  </div>
                  <span
                    className={`text-[10px] font-medium ${
                      t.paymentMode === "cash" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {t.paymentMode === "cash" ? "नगद" : "उधारी"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      <AddCustomer
        isOpen={showAddCustomer}
        onClose={() => setShowAddCustomer(false)}
        onSave={handleAddCustomer}
      />
    </div>
  );
}
