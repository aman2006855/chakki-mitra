"use client";

import { useState, type ReactNode } from "react";
import {
  LayoutDashboard,
  Store,
  Coins,
  Gift,
  CreditCard,
  LifeBuoy,
  ScrollText,
  Shield,
  Funnel,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { clearAdminToken, getAdminToken } from "@/lib/admin-api";
import { OverviewSection } from "./sections/Overview";
import { ShopsSection } from "./sections/Shops";
import { CreditsSection } from "./sections/Credits";
import { ReferralsSection } from "./sections/Referrals";
import { PlansSection } from "./sections/Plans";
import { TicketsSection } from "./sections/Tickets";
import { AuditSection } from "./sections/Audit";
import { SecuritySection } from "./sections/Security";
import { FunnelSection } from "./sections/Funnel";

export type AdminSection =
  | "overview"
  | "shops"
  | "credits"
  | "referrals"
  | "plans"
  | "tickets"
  | "audit"
  | "security"
  | "funnel";

const NAV: { id: AdminSection; label: string; icon: ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard size={16} /> },
  { id: "shops", label: "Shops & Users", icon: <Store size={16} /> },
  { id: "credits", label: "SMS Credits", icon: <Coins size={16} /> },
  { id: "referrals", label: "Referrals", icon: <Gift size={16} /> },
  { id: "plans", label: "Plans", icon: <CreditCard size={16} /> },
  { id: "tickets", label: "Support", icon: <LifeBuoy size={16} /> },
  { id: "funnel", label: "Funnel & Guests", icon: <Funnel size={16} /> },
  { id: "security", label: "Security", icon: <Shield size={16} /> },
  { id: "audit", label: "Audit Log", icon: <ScrollText size={16} /> },
];

interface Props {
  onLogout: () => void;
}

export function AdminShell({ onLogout }: Props) {
  const [section, setSection] = useState<AdminSection>("overview");
  const [mobileNav, setMobileNav] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = () => setRefreshTick((t) => t + 1);

  function handleLogout() {
    clearAdminToken();
    onLogout();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside
        className={`${
          mobileNav ? "flex" : "hidden"
        } lg:flex flex-col w-full lg:w-60 lg:min-h-screen bg-white border-b lg:border-b-0 lg:border-r border-gray-200 shrink-0`}
      >
        <div className="px-4 py-4 border-b border-gray-100 flex items-center gap-2">
          <span className="text-xl">🛡️</span>
          <div>
            <div className="text-sm font-bold text-gray-900">Chakki Mitra</div>
            <div className="text-[10px] text-gray-400 uppercase tracking-wide">Admin Panel</div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setSection(item.id);
                setMobileNav(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                section === item.id
                  ? "bg-orange-50 text-orange-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-100 space-y-2">
          <button
            type="button"
            onClick={refresh}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-red-600 border border-red-100 hover:bg-red-50"
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between gap-3 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNav((v) => !v)}
              className="lg:hidden p-2 rounded-lg border border-gray-200 text-gray-600"
              aria-label="Menu"
            >
              ☰
            </button>
            <div>
              <h1 className="text-base font-bold text-gray-900">
                {NAV.find((n) => n.id === section)?.label || "Overview"}
              </h1>
              <p className="text-[11px] text-gray-400">
                Read-only unless noted · PII masked · Audit trail on
              </p>
            </div>
          </div>
          <div className="text-[10px] text-gray-400 hidden sm:block">
            {getAdminToken() ? "session: admin" : "no session"}
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 max-w-6xl w-full">
          {section === "overview" && <OverviewSection refreshTick={refreshTick} />}
          {section === "shops" && <ShopsSection refreshTick={refreshTick} />}
          {section === "credits" && <CreditsSection refreshTick={refreshTick} />}
          {section === "referrals" && <ReferralsSection refreshTick={refreshTick} />}
          {section === "plans" && <PlansSection refreshTick={refreshTick} />}
          {section === "tickets" && <TicketsSection refreshTick={refreshTick} />}
          {section === "funnel" && <FunnelSection refreshTick={refreshTick} />}
          {section === "security" && <SecuritySection refreshTick={refreshTick} />}
          {section === "audit" && <AuditSection refreshTick={refreshTick} />}
        </main>
      </div>
    </div>
  );
}
