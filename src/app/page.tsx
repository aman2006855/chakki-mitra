"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";
import PullToRefresh from "@/components/PullToRefresh";
import AutoUpdater from "@/components/AutoUpdater";
import QuickEntry from "@/components/QuickEntry";
import KhataBook from "@/components/KhataBook";
import Reports from "@/components/Reports";
import Settings from "@/components/Settings";
import { api } from "@/lib/api";

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
  const router = useRouter();
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
  const authRedirected = useRef(false);

  useEffect(() => {
    if (loading || authRedirected.current) return;
    if (!user) {
      authRedirected.current = true;
      router.replace("/login");
      return;
    }
    if (!user.isRegistered) {
      authRedirected.current = true;
      router.replace("/register");
      return;
    }
  }, [loading, user]);

  useEffect(() => {
    const handler = App.addListener("backButton", ({ canGoBack }) => {
      if (tab !== "home") {
        setTab("home");
      } else {
        App.exitApp();
      }
    });
    return () => { handler.then((h) => h.remove()); };
  }, [tab]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    (async () => {
      let data: any;
      try {
        const res = await api("/api/settings");
        if (res.ok) data = await res.json();
      } catch {}

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
        const c = await api("/api/customers");
        if (c.ok) setCustomers(await c.json());
      } catch {}
    })();
  }, []);

  const refreshData = () => {
    setRefreshKey((k) => k + 1);
    (async () => {
      try {
        const s = await api("/api/settings");
        if (s.ok) {
          const data = await s.json();
          setSettings({
            shopName: data.shopName || "श्री श्याम आटा चक्की",
            shopPhone: data.shopPhone || "",
            attaRate: data.attaRate || "5",
            daliaRate: data.daliaRate || "8",
          });
          try { localStorage.setItem("chakki_mitra_settings", JSON.stringify(data)); } catch {}
        }
      } catch {}
      try {
        const c = await api("/api/customers");
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

  if (!user || !user.isRegistered) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto bg-gray-50 relative">
      <AutoUpdater />
      <Header shopName={settings.shopName} />
      <PullToRefresh onRefresh={refreshData}>
        <main className="pb-20" key={refreshKey}>
          {tab === "home" && (
            <QuickEntry settings={settings} customers={customers} onSaved={refreshData} />
          )}
          {tab === "khata" && <KhataBook customers={customers} onRefresh={refreshData} />}
          {tab === "reports" && <Reports />}
          {tab === "settings" && (
            <Settings settings={settings} onUpdate={refreshData} customers={customers} />
          )}
        </main>
      </PullToRefresh>
      <BottomNav activeTab={tab} onTabChange={setTab} />
    </div>
  );
}
