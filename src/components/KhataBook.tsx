"use client";

import { useState, useEffect } from "react";
import { Plus, Phone, MessageCircle, ChevronRight, Search, Edit2 } from "lucide-react";
import AddCustomer from "./AddCustomer";
import CustomerDetail from "./CustomerDetail";
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

interface KhataBookProps {
  customers: any[];
  onRefresh: () => void;
}

export default function KhataBook({ onRefresh }: KhataBookProps) {
  const [customerList, setCustomerList] = useState<CustomerWithDues[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerWithDues | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomers();
  }, [onRefresh]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api("/api/customers/detail");
      if (res.ok) {
        const data = await res.json();
        setCustomerList(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const filtered = customerList.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery)
  );

  const totalOutstanding = customerList.reduce((sum, c) => sum + c.dues, 0);
  const totalAdvance = customerList.reduce((sum, c) => sum + c.advance, 0);

  if (selectedCustomer) {
    return (
      <CustomerDetail
        customer={selectedCustomer}
        onBack={() => setSelectedCustomer(null)}
        onRefresh={() => { fetchCustomers(); onRefresh(); }}
      />
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <div className="text-xs text-red-600 font-medium">कुल बकाया</div>
          <div className="text-xl font-bold text-red-700 mt-0.5">₹{totalOutstanding.toFixed(0)}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3">
          <div className="text-xs text-green-600 font-medium">कुल एडवांस जमा</div>
          <div className="text-xl font-bold text-green-700 mt-0.5">₹{totalAdvance.toFixed(0)}</div>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ग्राहक खोजें..."
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-300 bg-white text-sm outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-400"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center w-12 h-12 bg-orange-500 text-white rounded-xl active:bg-orange-600 shadow-sm"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">लोड हो रहा है...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">📖</div>
          <p>कोई ग्राहक नहीं मिला</p>
          <p className="text-sm">ऊपर + दबाकर नया ग्राहक जोड़ें</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm flex-shrink-0"
                >
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{c.name}</h3>
                    <span className={`text-sm font-bold ${c.dues > 0 ? "text-red-600" : "text-gray-400"}`}>
                      {c.dues > 0 ? `₹${c.dues.toFixed(0)}` : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    <span>{c.phone}</span>
                    {c.advance > 0 && (
                      <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
                        एडवांस ₹{c.advance.toFixed(0)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                <a
                  href={`tel:${c.phone}`}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-green-50 text-green-700 text-xs font-medium active:bg-green-100"
                >
                  <Phone className="w-3.5 h-3.5" />
                  कॉल
                </a>
                <a
                  href={`https://wa.me/91${c.phone.replace(/^0+/, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-green-50 text-green-700 text-xs font-medium active:bg-green-100"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedCustomer(c)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-orange-50 text-orange-700 text-xs font-medium active:bg-orange-100"
                >
                  खाता देखें
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddCustomer
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={async (data) => {
          await api("/api/customers", {
            method: "POST",
            body: JSON.stringify(data),
          });
          fetchCustomers();
          onRefresh();
        }}
      />
    </div>
  );
}
