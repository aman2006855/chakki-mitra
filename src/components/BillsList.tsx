"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

interface Bill {
  transactionId: number;
  createdAt: string;
  productType: string;
  weight: number;
  rate: number;
  billAmount: number;
  previousBalance: number;
  previousDues: number;
  previousAdvance: number;
  advanceApplied: number;
  paymentsReceived: number;
  paymentDetails: { amount: number; type: string; desc: string; ts: string }[];
  netBill: number;
  remainingAfterPayments: number;
  newBalance: number;
  status: "settled" | "dues" | "credit";
}

interface BillsListProps {
  customerId: number;
}

export default function BillsList({ customerId }: BillsListProps) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [finalBalance, setFinalBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedBill, setExpandedBill] = useState<number | null>(null);

  useEffect(() => {
    api(`/api/customers/bills?id=${customerId}`)
      .then((r) => r.json())
      .then((data) => {
        setBills(data.bills || []);
        setFinalBalance(data.finalBalance || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [customerId]);

  const formatCurrency = (n: number) => `₹${Math.abs(n).toFixed(0)}`;
  const getProductLabel = (t: string) => (t === "atta" ? "🌾 आटा" : "🥣 दलिया");
  const getPaymentLabel = (t: string) => {
    switch (t) {
      case "advance": return "एडवांस";
      case "dues_payment": return "बकाया चुकाया";
      case "partial_payment": return "आंशिक जमा";
      default: return t;
    }
  };

  const formatDate = (ts: string) =>
    new Date(ts).toLocaleDateString("hi-IN", { day: "numeric", month: "short", year: "numeric" });

  if (loading) return <div className="text-center py-8 text-gray-400">लोड हो रहा है...</div>;

  if (bills.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <div className="text-3xl mb-2">📋</div>
        <p>कोई बिल नहीं</p>
        <p className="text-xs mt-1">उधारी वाली एंट्रियां यहाँ दिखाई देंगी</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className={`rounded-xl p-3 text-center font-bold ${
        Math.abs(finalBalance) < 0.01
          ? "bg-gray-100 text-gray-700"
          : finalBalance > 0
          ? "bg-red-50 text-red-700 border border-red-200"
          : "bg-green-50 text-green-700 border border-green-200"
      }`}>
        {Math.abs(finalBalance) < 0.01
          ? "✅ सभी हिसाब बराबर"
          : finalBalance > 0
          ? `📕 कुल बकाया: ${formatCurrency(finalBalance)}`
          : `📗 एडवांस शेष: ${formatCurrency(finalBalance)}`}
      </div>

      {bills.map((bill) => (
        <div key={bill.transactionId} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setExpandedBill(expandedBill === bill.transactionId ? null : bill.transactionId)}
            className="w-full p-3 text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">{getProductLabel(bill.productType)}</span>
                  <span className="text-xs text-gray-500">
                    {bill.weight.toFixed(1)} किग्रा × ₹{bill.rate}
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{formatDate(bill.createdAt)}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-gray-900">{formatCurrency(bill.billAmount)}</div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  bill.status === "settled"
                    ? "bg-green-100 text-green-700"
                    : bill.status === "dues"
                    ? "bg-red-100 text-red-700"
                    : "bg-blue-100 text-blue-700"
                }`}>
                  {bill.status === "settled" ? "✅ बराबर" : bill.status === "dues" ? `📕 ${formatCurrency(bill.newBalance)} बकाया` : `📗 ${formatCurrency(bill.newBalance)} एडवांस`}
                </span>
              </div>
            </div>
          </button>

          {expandedBill === bill.transactionId && (
            <div className="border-t border-gray-100 px-3 pb-3 space-y-2">
              {Math.abs(bill.previousBalance) > 0.01 && (
                <div className={`rounded-lg p-2.5 ${
                  bill.previousBalance > 0 ? "bg-red-50" : "bg-blue-50"
                }`}>
                  <div className="text-xs font-semibold mb-1">
                    {bill.previousBalance > 0 ? "📕 पिछला बकाया" : "📗 पिछला एडवांस"}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">पिछले हिसाब में शेष था</span>
                    <span className={`font-bold ${bill.previousBalance > 0 ? "text-red-600" : "text-blue-600"}`}>
                      {bill.previousBalance > 0 ? `+` : `-`}{formatCurrency(bill.previousBalance)}
                    </span>
                  </div>
                </div>
              )}

              <div className="bg-amber-50 rounded-lg p-2.5">
                <div className="text-xs font-semibold mb-1">📋 इस बिल की राशि</div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{bill.weight.toFixed(1)} किग्रा × ₹{bill.rate}</span>
                  <span className="font-bold text-amber-800">{formatCurrency(bill.billAmount)}</span>
                </div>
              </div>

              {bill.advanceApplied > 0 && (
                <div className="bg-green-50 rounded-lg p-2.5">
                  <div className="text-xs font-semibold mb-1">✅ एडवांस कट गया</div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      पिछले एडवांस से इस बिल में कटा
                    </span>
                    <span className="font-bold text-green-700">-{formatCurrency(bill.advanceApplied)}</span>
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    → इस बिल का शेष: {formatCurrency(bill.netBill)}
                  </div>
                </div>
              )}

              {bill.paymentsReceived > 0 && (
                <div className="bg-purple-50 rounded-lg p-2.5">
                  <div className="text-xs font-semibold mb-1">💰 इस बिल में जमा राशि</div>
                  {bill.paymentDetails.map((p, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {getPaymentLabel(p.type)} {p.desc ? `- ${p.desc}` : ""}
                      </span>
                      <span className="font-bold text-purple-700">-{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold mt-1 pt-1 border-t border-purple-200">
                    <span>कुल जमा</span>
                    <span className="text-purple-800">-{formatCurrency(bill.paymentsReceived)}</span>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-200">
                <div className="text-xs font-semibold mb-1">📊 इस बिल का सारांश</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">बिल राशि</span>
                    <span className="font-medium">{formatCurrency(bill.billAmount)}</span>
                  </div>
                  {bill.advanceApplied > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>एडवांस कटा</span>
                      <span>-{formatCurrency(bill.advanceApplied)}</span>
                    </div>
                  )}
                  {bill.paymentsReceived > 0 && (
                    <div className="flex justify-between text-purple-700">
                      <span>जमा राशि</span>
                      <span>-{formatCurrency(bill.paymentsReceived)}</span>
                    </div>
                  )}
                  <div className={`flex justify-between font-bold pt-1 border-t border-gray-300 ${
                    Math.abs(bill.remainingAfterPayments) < 0.01
                      ? "text-gray-900"
                      : bill.remainingAfterPayments > 0
                      ? "text-red-600"
                      : "text-green-600"
                  }`}>
                    <span>इस बिल में शेष</span>
                    <span>
                      {Math.abs(bill.remainingAfterPayments) < 0.01
                        ? "✅ बराबर"
                        : bill.remainingAfterPayments > 0
                        ? `${formatCurrency(bill.remainingAfterPayments)} बकाया`
                        : `${formatCurrency(bill.remainingAfterPayments)} एडवांस`}
                    </span>
                  </div>
                </div>
              </div>

              <div className={`rounded-lg p-2 text-center text-sm font-bold ${
                Math.abs(bill.newBalance) < 0.01
                  ? "bg-gray-100 text-gray-700"
                  : bill.newBalance > 0
                  ? "bg-red-50 text-red-700"
                  : "bg-green-50 text-green-700"
              }`}>
                इस बिल के बाद शेष:{" "}
                {Math.abs(bill.newBalance) < 0.01
                  ? "हिसाब बराबर ✅"
                  : bill.newBalance > 0
                  ? `${formatCurrency(bill.newBalance)} बकाया`
                  : `${formatCurrency(bill.newBalance)} एडवांस`}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
