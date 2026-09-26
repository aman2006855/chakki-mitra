import { api } from "./api";
import { addPendingCustomer } from "./offline-db";
import { normalizePhone } from "./phone";

export interface CustomerLike {
  id: number | string;
  phone: string;
  name?: string;
}

export type CreateCustomerResult =
  | { status: "reused"; id: number | string }
  | { status: "created"; id: number | string }
  | { status: "queued"; id: string }
  | { status: "error"; message: string };

// NAYA KHATA: pehle check karo, phir banao — duplicate KABHI nahi.
// - Pehle se same phone wala khata hai → wahi reuse (POST hi nahi hoga)
// - Offline hai → phone par temp khata + queue (net aate par sync)
// - Online hai → server khud dedupe karta hai (same phone = wahi row wapas)
export async function createOrReuseCustomer(
  input: { name: string; phone: string; address: string },
  known: CustomerLike[]
): Promise<CreateCustomerResult> {
  const name = (input.name || "").trim();
  const phone = (input.phone || "").trim();
  const address = (input.address || "").trim();
  if (!name || !phone) return { status: "error", message: "Naam aur mobile number zaroori hai" };

  const phoneNorm = normalizePhone(phone);
  if (phoneNorm) {
    const existing = known.find((c) => normalizePhone(c.phone) === phoneNorm);
    if (existing) return { status: "reused", id: existing.id };
  }

  const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  try {
    const res = await api("/api/customers", {
      method: "POST",
      body: JSON.stringify({ name, phone, address, tempId }),
    });
    const data = await res.json().catch(() => ({} as any));

    // Offline/queue: phone par turant dikh, sync ke baad asli id lag jayegi
    if (data?.offline) {
      addPendingCustomer({ tempId, name, phone, address, timestamp: Date.now(), realId: null });
      return { status: "queued", id: tempId };
    }

    if (res.ok && data?.id) {
      return data.deduped ? { status: "reused", id: data.id } : { status: "created", id: data.id };
    }

    return { status: "error", message: data?.error || `API error: ${res.status}` };
  } catch {
    return { status: "error", message: "नेटवर्क एरर" };
  }
}
