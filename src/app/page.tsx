"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useRef } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import QuickEntry from "@/components/QuickEntry";
import KhataBook from "@/components/KhataBook";
import Reports from "@/components/Reports";
import Settings from "@/components/Settings";

type Tab = "home" | "khata" | "reports" | "settings";

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

export default function App() {
  const { user, loading, saveSession } = useAuth();
  const [tab, setTab] = useState<Tab>("home");
  const [settings, setSettings] = useState<SettingsData>({
    shopName: "श्री श्याम आटा चक्की",
    shopPhone: "",
    attaRate: "5",
    daliaRate: "8",
  });
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const initialized = useRef(false);

  // Load initial data ONCE
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      // First try server API
      let data: any;
      try {
        const res = await fetch("/api/settings", { credentials: "same-origin" });
        if (res.ok) {
          data = await res.json();
        }
      } catch {}

      // Fallback to localStorage
      if (!data) {
        try {
          const ls = localStorage.getItem("chakki_mitra_settings");
          if (ls) data = JSON.parse(ls);
        } catch {}
      }

      if (data) {
        setSettings({
          shopName: data.shopName || "श्री श्याम आटा चक्की",
          shopPhone: data.shopPhone || "",
          attaRate: data.attaRate || "5",
          daliaRate: data.daliaRate || "8",
        });
      }

      try {
        const c = await fetch("/api/customers", { credentials: "same-origin" });
        if (c.ok) setCustomers(await c.json());
      } catch {}
    })();
  }, []);

  // Redirect if not authenticated or not registered
  useEffect(() => {
    if (loading) return;
    if (!user) {
      window.location.href = "/login";
      return;
    }
    if (!user.isRegistered) {
      window.location.href = "/register";
      return;
    }
  }, [loading, user]);

  const refreshData = () => {
    setRefreshKey((k) => k + 1);
    (async () => {
      try {
        const s = await fetch("/api/settings", { credentials: "same-origin" });
        if (s.ok) {
          const data = await s.json();
          setSettings({
            shopName: data.shopName || "श्री श्याम आटा चक्की",
            shopPhone: data.shopPhone || "",
            attaRate: data.attaRate || "5",
            daliaRate: data.daliaRate || "8",
          });
          // Also save to localStorage
          try { localStorage.setItem("chakki_mitra_settings", JSON.stringify(data)); } catch {}
        }
      } catch {}
      try {
        const c = await fetch("/api/customers", { credentials: "same-origin" });
        if (c.ok) setCustomers(await c.json());
      } catch {}
    })();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-500 to-amber-400">
        <div className="text-white text-center">
          <div className="text-5xl mb-4 animate-pulse">🌾</div>
          <h1 className="text-2xl font-bold">चक्की मित्र</h1>
          <p className="text-orange-100 mt-2">लोड हो रहा है...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto bg-gray-50 relative">
      <Header shopName={settings.shopName} />
      <main className="flex-1 overflow-y-auto pb-20" key={refreshKey}>
        {tab === "home" && (
          <QuickEntry settings={settings} customers={customers} onSaved={refreshData} />
        )}
        {tab === "khata" && <KhataBook customers={customers} onRefresh={refreshData} />}
        {tab === "reports" && <Reports />}
        {tab === "settings" && (
          <Settings settings={settings} onUpdate={refreshData} customers={customers} />
        )}
      </main>
      <BottomNav activeTab={tab} onTabChange={setTab} />
    </div>
  );
}
