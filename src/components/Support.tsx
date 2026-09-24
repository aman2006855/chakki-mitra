"use client";

import { useEffect, useRef, useState } from "react";
import { LifeBuoy, Phone, MessageCircle, Send, ChevronDown } from "lucide-react";
import { api } from "@/lib/api";

// Build time par set hota hai (Vercel env / APK CI env). Na ho to call buttons chhup jayenge.
const SUPPORT_PHONE = (process.env.NEXT_PUBLIC_SUPPORT_PHONE || "").replace(/\D/g, "");

const CATEGORIES = [
  { id: "general", label: "General" },
  { id: "billing", label: "Billing / Khata" },
  { id: "technical", label: "App problem" },
  { id: "account", label: "Account" },
  { id: "other", label: "Other" },
];

const STATUS_STYLE: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  waiting: "bg-purple-100 text-purple-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-500",
};

const STATUS_LABEL: Record<string, string> = {
  new: "Naya",
  in_progress: "Kaam chal raha",
  waiting: "Jawab ka intezaar",
  resolved: "Hal ho gaya",
  closed: "Band",
};

interface Ticket {
  id: number;
  subject: string;
  category: string | null;
  status: string | null;
  message: string | null;
  adminReply: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export default function Support() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const seenReplies = useRef<Map<number, string>>(new Map());

  async function load(silent = false) {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await api("/api/support");
      if (res.ok) {
        const d = await res.json();
        const list: Ticket[] = d.tickets || [];
        setTickets(list);
        // Naya/updated admin jawab aaye to auto-expand (background me aaya ho to notice bhi)
        const fresh = list.find((t) => t.adminReply && seenReplies.current.get(t.id) !== t.adminReply);
        if (fresh && fresh.adminReply) {
          seenReplies.current.set(fresh.id, fresh.adminReply);
          setExpanded(fresh.id);
          if (silent) setNote("💬 Admin ka naya jawab aaya hai!");
        }
        for (const t of list) if (t.adminReply) seenReplies.current.set(t.id, t.adminReply);
      }
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    load();
    // Admin ka jawab aate hi dikhe — har 30s silent refresh
    // (Settings tab display:none se chhupta hai, unmount nahi hota — isliye interval zaroori)
    const t = setInterval(() => load(true), 30000);
    return () => clearInterval(t);
  }, []);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (subject.trim().length < 3) {
      setNote("❌ Subject me kam se kam 3 akshar likho");
      return;
    }
    setSending(true);
    setNote("");
    try {
      const res = await api("/api/support", {
        method: "POST",
        body: JSON.stringify({ subject: subject.trim(), category, message: message.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Bheja nahi gaya");
      setSubject(""); setMessage(""); setCategory("general");
      setOpen(false);
      setNote("✅ Ticket bhej diya! Jawab yahin dikhega.");
      await load();
    } catch (err: any) {
      setNote(`❌ ${err.message || "Bheja nahi gaya"}`);
    }
    setSending(false);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
        <LifeBuoy className="w-4 h-4 text-orange-500" /> 🆘 Support
      </h3>

      {/* Direct contact */}
      {SUPPORT_PHONE ? (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <a
            href={`tel:${SUPPORT_PHONE}`}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-bold active:bg-green-100"
          >
            <Phone className="w-3.5 h-3.5" /> Call karo
          </a>
          <a
            href={`https://wa.me/${SUPPORT_PHONE}?text=${encodeURIComponent("Namaste! Chakki Mitra me help chahiye.")}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold active:bg-emerald-100"
          >
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </a>
        </div>
      ) : (
        <p className="text-xs text-gray-500 leading-relaxed mb-3">
          Koi problem ho to neeche ticket bhejo — humara jawab yahin dikhega. 🙏
        </p>
      )}

      {/* New ticket */}
      {!open ? (
        <button
          type="button"
          onClick={() => { setOpen(true); setNote(""); }}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-bold active:opacity-90"
        >
          ✍️ Naya ticket bhejo
        </button>
      ) : (
        <form onSubmit={handleSend} className="space-y-2 bg-gray-50 rounded-xl p-3">
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject — jaise: SMS nahi ja raha"
            maxLength={300}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:ring-2 focus:ring-orange-500"
          />
          <div className="flex gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white outline-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={sending}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" /> {sending ? "Bhej rahe..." : "Bhejo"}
            </button>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Detail me likho (optional)"
            rows={3}
            maxLength={2000}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm bg-white outline-none focus:ring-2 focus:ring-orange-500 resize-none"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full text-xs text-gray-400 py-1"
          >
            Cancel
          </button>
        </form>
      )}

      {note && <div className="text-xs mt-2 text-center">{note}</div>}

      {/* My tickets */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-xs font-bold text-gray-600">Mere tickets ({tickets.length})</div>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing}
            className="text-[11px] font-bold text-orange-600 active:text-orange-800 disabled:opacity-40"
          >
            {refreshing ? "⏳..." : "🔄 Refresh"}
          </button>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center text-xs text-gray-400 py-4 bg-gray-50 rounded-xl">
            Abhi tak koi ticket nahi 🎫
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map((t) => (
              <div key={t.id} className="border border-gray-100 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-gray-800 truncate">#{t.id} · {t.subject}</div>
                  </div>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_STYLE[t.status || "new"] || STATUS_STYLE.new}`}>
                    {STATUS_LABEL[t.status || "new"] || t.status}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${expanded === t.id ? "rotate-180" : ""}`} />
                </button>
                {expanded === t.id && (
                  <div className="px-3 pb-3 space-y-2 text-xs">
                    {t.message && (
                      <div className="bg-gray-50 rounded-lg px-2.5 py-2 text-gray-600">
                        <span className="font-bold text-gray-500">Aapne likha: </span>{t.message}
                      </div>
                    )}
                    {t.adminReply ? (
                      <div className="bg-green-50 border border-green-100 rounded-lg px-2.5 py-2 text-green-800">
                        <span className="font-bold">💬 Hamara jawab: </span>{t.adminReply}
                      </div>
                    ) : (
                      <div className="text-gray-400">⏳ Jawab ka intezaar hai...</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
