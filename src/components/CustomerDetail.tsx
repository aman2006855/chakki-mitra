"use client";

import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft,
  ReceiptText,
  IndianRupee,
  Plus,
  Phone,
  MessageCircle,
  FileText,
  Trash2,
} from "lucide-react";
import BillsList from "./BillsList";
import { api } from "@/lib/api";

interface CustomerWithDues {
  id: number;
  name: string;
  phone: string;
  address: string;
  dues: number;
  advance: number;
  totalCredit: number;
}

interface CustomerDetailProps {
  customer: CustomerWithDues;
  onBack: () => void;
  onRefresh: () => void;
}

interface Transaction {
  id: number;
  productType: string;
  weight: string;
  rate: string;
  amount: string;
  paymentMode: string;
  notes: string;
  created_at: string;
}

interface Payment {
  id: number;
  amount: string;
  type: string;
  description: string;
  created_at: string;
}

interface Summary {
  totalBilled: number;
  totalJama: number;
  pendingDues: number;
  totalAdvance: number;
  netBalance: number;
}

export default function CustomerDetail({
  customer,
  onBack,
  onRefresh,
}: CustomerDetailProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalBilled: 0,
    totalJama: 0,
    pendingDues: 0,
    totalAdvance: 0,
    netBalance: 0,
  });
  const [activeTab, setActiveTab] = useState<"bills" | "transactions" | "payments" | "receipt">("bills");
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentType, setPaymentType] = useState<"advance" | "dues_payment" | "partial_payment">("dues_payment");
  const [paymentDesc, setPaymentDesc] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: { type: "success" | "error"; text: string }, duration = 3000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(msg);
    toastTimerRef.current = setTimeout(() => setToast(null), duration);
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; label: string } | null>(null);

  const handleDeleteTransaction = async (id: number) => {
    try {
      const res = await api(`/api/transactions?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast({ type: "success", text: "✅ एंट्री डिलीट हो गई!" });
        fetchDetail();
        onRefresh();
      } else {
        showToast({ type: "error", text: "❌ डिलीट नहीं हो पाई" });
      }
    } catch {
      showToast({ type: "error", text: "❌ नेटवर्क एरर" });
    }
    setDeleteConfirm(null);
  };

  useEffect(() => {
    fetchDetail();
  }, [customer.id]);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await api(`/api/customers/detail?id=${customer.id}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        setPayments(data.payments || []);
        setSummary(data.summary || {});
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const paymentSavingRef = useRef(false);

  const handlePayment = async () => {
    if (paymentSavingRef.current) return;
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) return;
    paymentSavingRef.current = true;
    try {
      const res = await api("/api/payments", {
        method: "POST",
        body: JSON.stringify({
          customerId: customer.id,
          amount: parseFloat(paymentAmount).toString(),
          type: paymentType,
          description: paymentDesc,
        }),
      });
      if (res.ok) {
        showToast({ type: "success", text: "✅ जमा हो गई!" });
        setShowPaymentModal(false);
        setPaymentAmount("");
        setPaymentDesc("");
        fetchDetail();
        onRefresh();
      } else {
        showToast({ type: "error", text: "❌ जमा नहीं हो पाई" });
      }
    } catch (e) {
      showToast({ type: "error", text: "❌ नेटवर्क एरर" });
    }
    paymentSavingRef.current = false;
  };

  const getShopName = () => {
    let shopName = "चक्की मित्र";
    try {
      const ls = localStorage.getItem("chakki_mitra_settings");
      if (ls) { const s = JSON.parse(ls); if (s.shopName) shopName = s.shopName; }
    } catch {}
    return shopName;
  };

  const formatDate = (d: string) => {
    try {
      const fixed = d.includes("T") ? d : d.replace(" ", "T");
      return new Date(fixed).toLocaleDateString("hi-IN", { day: "numeric", month: "short" });
    } catch { return d; }
  };

  const formatDateTime = (d: string) => {
    try {
      const fixed = d.includes("T") ? d : d.replace(" ", "T");
      return new Date(fixed).toLocaleDateString("hi-IN", {
        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
    } catch { return d; }
  };

  const sendWhatsAppReminder = () => {
    const shopName = getShopName();
    const totalPaid = summary.totalBilled - summary.pendingDues + summary.totalAdvance;
    const txCount = transactions.length;
    const recentTx = transactions.slice(0, 3).map((t, i) =>
      `${i + 1}. ${formatDate(t.created_at)} — ${getProductLabel(t.productType)} ${parseFloat(t.weight).toFixed(0)}kg = ${formatCurrency(parseFloat(t.amount))} (${t.paymentMode === "cash" ? "नगद" : "उधारी"})`
    ).join("\n");

    const msg = encodeURIComponent(
      `📋 *बकाया रिमाइंडर*\n\n` +
      `🙏 ${customer.name} जी,\n\n` +
      `📍 *${shopName}*\n\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `📊 *खाता सारांश:*\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `🛒 कुल पिसाई: ${txCount} बार\n` +
      `💰 कुल बिल: *${formatCurrency(summary.totalBilled)}*\n` +
      `✅ जमा किया: ${formatCurrency(summary.totalJama)}\n` +
      `⏳ बकाया राशि: *${formatCurrency(summary.pendingDues)}*\n` +
      (summary.totalAdvance > 0 ? `🟢 एडवांस: ${formatCurrency(summary.totalAdvance)}\n` : '') +
      `━━━━━━━━━━━━━━━━\n\n` +
      (recentTx ? `📝 *हाल की पिसाई:*\n${recentTx}\n\n` : '') +
      `⚠️ कृपया जल्द से जल्द भुगतान करें।\n\n` +
      `धन्यवाद 🙏`
    );
    window.open(`https://wa.me/91${customer.phone.replace(/^0+/, "")}?text=${msg}`, "_blank");
  };

  const sendWhatsAppBill = () => {
    const shopName = getShopName();
    const now = new Date();
    const dateStr = now.toLocaleDateString("hi-IN", { day: "numeric", month: "long", year: "numeric" });

    let txLines = transactions.map((t, i) => {
      const date = formatDate(t.created_at);
      return `${i + 1}. ${date} — ${getProductLabel(t.productType)} ${parseFloat(t.weight).toFixed(0)}kg × ${formatCurrency(parseFloat(t.rate))} = *${formatCurrency(parseFloat(t.amount))}* (${t.paymentMode === "cash" ? "नगद" : "उधारी"})`;
    }).join("\n");

    let paymentLines = "";
    if (payments.length > 0) {
      paymentLines = "\n✅ *जमा विवरण:*\n" +
        payments.map((p, i) => {
          const date = formatDate(p.created_at);
          return `${i + 1}. ${date} — ${formatCurrency(parseFloat(p.amount))} ${getPaymentLabel(p.type)}`;
        }).join("\n");
    }

    const msg = encodeURIComponent(
      `🧾 *${shopName} — बिल*\n\n` +
      `📅 ${dateStr}\n` +
      `👤 ${customer.name}\n` +
      `📞 ${customer.phone}\n` +
      (customer.address ? `📍 ${customer.address}\n` : '') +
      `\n━━━━━━━━━━━━━━━━\n` +
      `🛒 *पिसाई विवरण:*\n` +
      `━━━━━━━━━━━━━━━━\n` +
      `${txLines}\n` +
      paymentLines +
      `\n━━━━━━━━━━━━━━━━\n` +
      `💰 कुल बिल: *${formatCurrency(summary.totalBilled)}*\n` +
      `✅ कुल जमा: *${formatCurrency(summary.totalJama)}*\n` +
      (summary.totalAdvance > 0 ? `🟢 एडवांस: *${formatCurrency(summary.totalAdvance)}*\n` : '') +
      `⏳ *बकाया: ${formatCurrency(summary.pendingDues)}*\n` +
      `━━━━━━━━━━━━━━━━\n\n` +
      `🙏 ${shopName}\n` +
      `📞 ${customer.phone}`
    );
    window.open(`https://wa.me/91${customer.phone.replace(/^0+/, "")}?text=${msg}`, "_blank");
  };

  const getPaymentLabel = (type: string) => {
    switch (type) {
      case "advance": return "🟢 एडवांस जमा";
      case "dues_payment": return "📗 बकाया चुकाया";
      case "partial_payment": return "📘 आंशिक जमा";
      default: return type;
    }
  };

  const getProductLabel = (type: string) => {
    return type === "atta" ? "🌾 आटा" : "🥣 दलिया";
  };

  const formatCurrency = (n: number) => `₹${n.toFixed(0)}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        लोड हो रहा है...
      </div>
    );
  }

  return (
    <div className="pb-6 relative">
      {toast && (
        <div
          className={`sticky top-0 z-50 mx-4 mt-2 px-4 py-2.5 rounded-lg text-sm font-medium text-center shadow-md ${
            toast.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {toast.text}
        </div>
      )}
      <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-gray-200 sticky top-0 z-10">
        <button type="button" onClick={onBack} className="p-1.5 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="font-bold text-gray-900">{customer.name}</h2>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{customer.phone}</span>
            {customer.address && <span>• {customer.address}</span>}
          </div>
        </div>
        <div className="flex gap-1">
          <a href={`tel:${customer.phone}`} className="p-2 rounded-lg bg-green-50 text-green-600">
            <Phone className="w-4 h-4" />
          </a>
          <button
            type="button"
            onClick={sendWhatsAppReminder}
            className="p-2 rounded-lg bg-emerald-50 text-emerald-600"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
            <ReceiptText className="w-4 h-4" />
            खाता सारांश
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-red-50 rounded-lg p-2.5 text-center">
              <div className="text-xs text-red-600">कुल बिल</div>
              <div className="text-lg font-bold text-red-700">{formatCurrency(summary.totalBilled)}</div>
            </div>
            <div className="bg-green-50 rounded-lg p-2.5 text-center">
              <div className="text-xs text-green-600">कुल जमा</div>
              <div className="text-lg font-bold text-green-700">{formatCurrency(summary.totalJama)}</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-2.5 text-center">
              <div className="text-xs text-amber-600">बकाया राशि</div>
              <div className="text-lg font-bold text-amber-700">{formatCurrency(summary.pendingDues)}</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-2.5 text-center">
              <div className="text-xs text-blue-600">एडवांस</div>
              <div className="text-lg font-bold text-blue-700">{formatCurrency(summary.totalAdvance)}</div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-700">शेष बалан्स</span>
              <span className={`text-lg font-bold ${summary.netBalance > 0 ? "text-red-600" : summary.netBalance < 0 ? "text-green-600" : "text-gray-600"}`}>
                {formatCurrency(summary.netBalance)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 mb-3 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setShowPaymentModal(true)}
          className="flex items-center justify-center gap-1.5 bg-green-500 text-white py-2.5 rounded-xl font-semibold text-xs active:bg-green-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          जमा
        </button>
        <button
          type="button"
          onClick={sendWhatsAppReminder}
          className="flex items-center justify-center gap-1.5 bg-emerald-500 text-white py-2.5 rounded-xl font-semibold text-xs active:bg-emerald-600 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          रिमाइंडर
        </button>
        <button
          type="button"
          onClick={sendWhatsAppBill}
          className="flex items-center justify-center gap-1.5 bg-teal-500 text-white py-2.5 rounded-xl font-semibold text-xs active:bg-teal-600 transition-colors"
        >
          <FileText className="w-4 h-4" />
          बिल भेजें
        </button>
      </div>

      <div className="px-4 mb-3">
        <div className="flex bg-gray-100 rounded-xl p-1">
          {[
            { id: "bills" as const, label: "बिल्स" },
            { id: "transactions" as const, label: "पिसाई" },
            { id: "payments" as const, label: "जमा" },
            { id: "receipt" as const, label: "रसीद" },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4">
        {activeTab === "bills" && (
          <BillsList customerId={customer.id} />
        )}

        {activeTab === "transactions" && (
          <div className="space-y-2">
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-400">कोई एंट्री नहीं</div>
            ) : (
              transactions.map((t) => (
                <div key={t.id} className="bg-white rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm">{getProductLabel(t.productType)}</span>
                        <span className="text-xs text-gray-500">
                          {parseFloat(t.weight).toFixed(1)} किग्रा × ₹{parseFloat(t.rate).toFixed(0)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {formatDateTime(t.created_at)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="font-bold text-gray-900">{formatCurrency(parseFloat(t.amount))}</div>
                        <span
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                            t.paymentMode === "cash"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {t.paymentMode === "cash" ? "नगद" : "उधारी"}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm({
                          id: t.id,
                          label: `${getProductLabel(t.productType)} ${parseFloat(t.weight).toFixed(0)}kg = ${formatCurrency(parseFloat(t.amount))}`
                        })}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {t.notes && (
                    <div className="text-xs text-gray-500 mt-1 bg-gray-50 rounded px-2 py-1">
                      📝 {t.notes}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "payments" && (
          <div className="space-y-2">
            {payments.length === 0 ? (
              <div className="text-center py-8 text-gray-400">कोई जमा एंट्री नहीं</div>
            ) : (
              payments.map((p) => (
                <div key={p.id} className="bg-white rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-800">
                        {getPaymentLabel(p.type)}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {formatDateTime(p.created_at)}
                      </div>
                    </div>
                    <div className="font-bold text-green-700 text-lg">
                      +{formatCurrency(parseFloat(p.amount))}
                    </div>
                  </div>
                  {p.description && (
                    <div className="text-xs text-gray-500 mt-1 bg-gray-50 rounded px-2 py-1">
                      📝 {p.description}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "receipt" && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="text-center border-b border-dashed border-gray-300 pb-3 mb-3">
              <div className="text-lg font-bold text-gray-900">📋 बिल रसीद</div>
              <div className="text-xs text-gray-500 mt-1">{customer.name}</div>
              <div className="text-xs text-gray-500">{customer.phone}</div>
              {customer.address && (
                <div className="text-xs text-gray-500">{customer.address}</div>
              )}
              <div className="text-xs text-gray-400 mt-1">
                {new Date().toLocaleDateString("hi-IN", {
                  day: "numeric", month: "long", year: "numeric"
                })}
              </div>
            </div>

            <div className="space-y-1.5 mb-3">
              <div className="flex justify-between text-xs text-gray-500 font-medium px-1">
                <span>विवरण</span>
                <span>राशि</span>
              </div>
              {transactions.map((t, i) => (
                <div key={t.id} className="flex justify-between text-sm px-1">
                  <span className="text-gray-700">
                    {i + 1}. {getProductLabel(t.productType)} - {parseFloat(t.weight).toFixed(1)} किग्रा
                  </span>
                  <span className="text-gray-900 font-medium whitespace-nowrap ml-2">
                    {formatCurrency(parseFloat(t.amount))}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-gray-300 pt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">कुल बिल</span>
                <span className="font-semibold">{formatCurrency(summary.totalBilled)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">जमा किया</span>
                <span className="font-semibold text-green-600">-{formatCurrency(summary.totalJama)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">एडवांस</span>
                <span className="font-semibold text-blue-600">-{formatCurrency(summary.totalAdvance)}</span>
              </div>
              <div className="flex justify-between text-base pt-2 border-t border-gray-200">
                <span className="font-bold">शेष बकाया</span>
                <span className={`font-bold ${summary.pendingDues > 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatCurrency(summary.pendingDues)}
                </span>
              </div>
            </div>

            <div className="text-center mt-4 pt-3 border-t border-gray-200 text-xs text-gray-400">
              धन्यवाद! 🙏
            </div>
          </div>
        )}
      </div>

      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPaymentModal(false)} />
          <div className="relative w-full max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-5 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-4">💰 जमा / एडवांस दर्ज करें</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">पेमेंट प्रकार</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "dues_payment", label: "बकाया चुकाया", emoji: "📗" },
                    { id: "partial_payment", label: "आंशिक जमा", emoji: "📘" },
                    { id: "advance", label: "एडवांस", emoji: "🟢" },
                  ].map((pt) => (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => setPaymentType(pt.id as typeof paymentType)}
                      className={`py-2.5 rounded-xl border-2 text-center text-xs font-medium transition-all ${
                        paymentType === pt.id
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-gray-200 bg-white text-gray-600"
                      }`}
                    >
                      <div className="text-lg">{pt.emoji}</div>
                      <div>{pt.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">राशि (₹)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-3 rounded-xl border border-gray-300 text-2xl font-bold text-center outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400"
                  inputMode="numeric"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                {[50, 100, 200, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setPaymentAmount(amt.toString())}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      paymentAmount === amt.toString()
                        ? "bg-green-500 text-white"
                        : "bg-gray-100 text-gray-600 active:bg-gray-200"
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
                {summary.pendingDues > 0 && (
                  <button
                    type="button"
                    onClick={() => setPaymentAmount(summary.pendingDues.toFixed(0))}
                    className="px-3 py-2 rounded-lg text-xs font-medium bg-amber-100 text-amber-700 active:bg-amber-200"
                  >
                    पूरा बकाया
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">नोट (वैकल्पिक)</label>
                <input
                  type="text"
                  value={paymentDesc}
                  onChange={(e) => setPaymentDesc(e.target.value)}
                  placeholder="जैसे: UPI से पे किया"
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400"
                />
              </div>

              <div className="bg-green-50 rounded-xl p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-green-700">वर्तमान बकाया:</span>
                  <span className="font-bold text-green-700">{formatCurrency(summary.pendingDues)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">वर्तमान एडवांस:</span>
                  <span className="font-bold text-green-700">{formatCurrency(summary.totalAdvance)}</span>
                </div>
                {paymentAmount && parseFloat(paymentAmount) > 0 && (() => {
                  const amt = parseFloat(paymentAmount);
                  if (paymentType === "advance") {
                    return (
                      <div className="flex flex-col gap-1 pt-1 border-t border-green-200">
                        <div className="flex justify-between">
                          <span className="text-green-700">बकाया (बदलाव नहीं):</span>
                          <span className="font-bold text-green-700">{formatCurrency(summary.pendingDues)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-green-700">नया एडवांस:</span>
                          <span className="font-bold text-blue-700">{formatCurrency(summary.totalAdvance + amt)}</span>
                        </div>
                      </div>
                    );
                  }
                  const newDues = summary.pendingDues - amt;
                  const extraAdvance = newDues < 0 ? Math.abs(newDues) : 0;
                  return (
                    <div className="flex flex-col gap-1 pt-1 border-t border-green-200">
                      <div className="flex justify-between">
                        <span className="text-green-700">नया बकाया:</span>
                        <span className="font-bold text-green-700">{formatCurrency(Math.max(0, newDues))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-green-700">नया एडवांस:</span>
                        <span className="font-bold text-blue-700">{formatCurrency(summary.totalAdvance + extraAdvance)}</span>
                      </div>
                      {extraAdvance > 0 && (
                        <div className="flex justify-between pt-1 border-t border-green-200">
                          <span className="text-amber-700 font-medium">⚠️ ₹{extraAdvance.toFixed(0)} अतिरिक्त जमा हो जाएगा (एडवांस में)</span>
                          <span />
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <button
                type="button"
                onClick={handlePayment}
                className="w-full flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-xl font-semibold active:bg-green-600"
              >
                <IndianRupee className="w-5 h-5" />
                जमा दर्ज करें
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteConfirm(null)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-5 mx-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">⚠️ एंट्री डिलीट करें?</h3>
              <p className="text-sm text-gray-500 mb-2">{deleteConfirm.label}</p>
              <p className="text-xs text-red-500 mb-4">यह क्रिया वापस नहीं हो सकती।</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm active:bg-gray-50"
                >
                  रद्द करें
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteTransaction(deleteConfirm.id)}
                  className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm active:bg-red-600"
                >
                  हाँ, डिलीट करें
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
