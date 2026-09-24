"use client";

import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { api } from "@/lib/api";

interface DailyData {
  day: string;
  atta: number;
  dalia: number;
  total: number;
  cash: number;
  credit: number;
  count: number;
}

export default function Reports() {
  const [dailyData, setDailyData] = useState<DailyData[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // NOTE: res.ok check zaroori hai — offline/401/503 par api() error-shape
    // JSON ({error:...}) deta hai; bina check ke dashboard truthy set ho jata
    // aur .toFixed() crash karke poora page gira deta hai (sab tabs mounted hain)
    Promise.all([
      api("/api/reports").then((r) => (r.ok ? r.json().catch(() => null) : null)),
      api("/api/dashboard").then((r) => (r.ok ? r.json().catch(() => null) : null)),
    ])
      .then(([reportsData, dashData]) => {
        setDailyData(Array.isArray(reportsData?.dailyData) ? reportsData.dailyData : []);
        setDashboard(
          dashData && typeof dashData.totalSales === "number" ? dashData : null
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const barData = dailyData
    .slice(0, 7)
    .reverse()
    .map((d) => ({
      day: new Date(d.day).toLocaleDateString("hi-IN", { day: "numeric", month: "short" }),
      total: d.total,
      cash: d.cash,
      credit: d.credit,
    }));

  const pieData = dashboard
    ? [
        { name: "आटा", value: dashboard.totalAtta || 0 },
        { name: "दलिया", value: dashboard.totalDalia || 0 },
      ].filter((d) => d.value > 0)
    : [];

  const COLORS = ["#f59e0b", "#d97706", "#f97316", "#ea580c"];

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-gray-400">लोड हो रहा है...</div>;
  }

  return (
    <div className="px-4 py-4 space-y-5">
      <h2 className="text-lg font-bold text-gray-900">📊 रिपोर्ट और एनालिटिक्स</h2>

      {dashboard && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
            <div className="text-xs text-gray-500">कुल बिक्री</div>
            <div className="text-xl font-bold text-gray-900 mt-0.5">₹{dashboard.totalSales.toFixed(0)}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {dashboard.totalAtta + dashboard.totalDalia > 0
                ? `${dashboard.customerCount} ग्राहक`
                : "कोई डेटा नहीं"}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
            <div className="text-xs text-gray-500">नगद वसूली</div>
            <div className="text-xl font-bold text-green-600 mt-0.5">₹{dashboard.totalCash.toFixed(0)}</div>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-3 shadow-sm">
            <div className="text-xs text-red-500">कुल उधारी</div>
            <div className="text-xl font-bold text-red-600 mt-0.5">₹{dashboard.totalCredit.toFixed(0)}</div>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-3 shadow-sm">
            <div className="text-xs text-amber-600">बकाया शेष</div>
            <div className="text-xl font-bold text-amber-700 mt-0.5">₹{dashboard.totalOutstanding.toFixed(0)}</div>
          </div>
        </div>
      )}

      {pieData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">🥧 आटा vs दलिया</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((_entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip
                formatter={(value: unknown) => [`₹${(Number(value) || 0).toFixed(0)}`, ""]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 दैनिक बिक्री (पिछले 7 दिन)</h3>
        {barData.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₹${v}`} />
              <Tooltip
                formatter={(value: unknown, name: unknown) => [
                  `₹${(Number(value) || 0).toFixed(0)}`,
                  name === "total" ? "कुल" : name === "cash" ? "नगद" : "उधारी",
                ]}
              />
              <Bar dataKey="cash" fill="#22c55e" radius={[4, 4, 0, 0]} name="नगद" />
              <Bar dataKey="credit" fill="#ef4444" radius={[4, 4, 0, 0]} name="उधारी" />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center py-8 text-gray-400 text-sm">कोई डेटा नहीं</div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">📋 सारांश</h3>
        {dashboard && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">कुल बिक्री</span>
              <span className="font-semibold">₹{dashboard.totalSales.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">कुल नगद</span>
              <span className="font-semibold text-green-600">₹{dashboard.totalCash.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">कुल उधारी</span>
              <span className="font-semibold text-red-600">₹{dashboard.totalCredit.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">जमा राशि</span>
              <span className="font-semibold text-blue-600">₹{dashboard.totalDuesPaid.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">एडवांस जमा</span>
              <span className="font-semibold text-purple-600">₹{dashboard.totalAdvance.toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-gray-100">
              <span className="font-bold">समीकरण</span>
              <span className="font-bold text-xs text-gray-400">
                कुल बिक्री = नगद + उधारी ✓
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
