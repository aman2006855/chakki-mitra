import { API_BASE } from "./config";
import {
  addPendingOp,
  isOnline,
  reportNetworkResult,
  requestNetworkProbe,
  getPendingCustomers,
  isTempId,
} from "./offline-db";
import { cacheGet, cacheSet } from "./idb-cache";

function getToken(): string | null {
  try {
    return localStorage.getItem("chakki_mitra_token");
  } catch {
    return null;
  }
}

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extra,
  };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

function parseBody(body: unknown): any {
  if (!body) return null;
  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }
  return body;
}

function json(data: any, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function queueWrite(opId: string, method: string, url: string, body: any): Response {
  try {
    addPendingOp({ id: opId, method, url, body, timestamp: Date.now() });
  } catch {}
  return json({ success: true, offline: true, opId });
}

// Offline khate (tmp_...) se judi koi bhi entry khata sync hone TAK queue me jayegi —
// warna server "tmp_x" ko number samajh kar reject kar deta.
function hasTempCustomerRef(body: any): boolean {
  return !!(body && isTempId((body as any).customerId));
}

// Phone me bana offline khata list me dikhna chahiye — online list ke saath merge.
// Server par aa chuka khata yahan se apne aap hat jata hai (self-cleanup).
function mergePendingCustomers(url: string, data: any): any {
  if (!Array.isArray(data) || !url.startsWith("/api/customers")) return data;
  let pending: ReturnType<typeof getPendingCustomers> = [];
  try {
    pending = getPendingCustomers();
  } catch {
    return data;
  }
  if (!pending.length) return data;

  const isDetail = url.startsWith("/api/customers/detail");
  const seen = new Set(data.map((c: any) => String(c?.id)));
  const extra: any[] = [];

  for (const p of pending) {
    const id = p.realId ?? p.tempId;
    // Server me already hai → dobara mat jodo (realId mapping rehne do —
    // purani temp id se bani entries ab bhi sahi khate par sync hongi)
    if (seen.has(String(id)) || seen.has(p.tempId)) continue;
    const base = {
      id,
      name: p.name,
      phone: p.phone,
      address: p.address,
      createdAt: new Date(p.timestamp).toISOString(),
      pendingSync: true,
    };
    extra.push(isDetail ? { ...base, dues: 0, advance: 0, totalCredit: 0 } : base);
  }

  return extra.length ? [...data, ...extra] : data;
}

export async function api(url: string, options?: RequestInit): Promise<Response> {
  const fullUrl = url.startsWith("http") ? url : `${API_BASE}${url}`;
  const method = options?.method || "GET";
  const parsedBody = parseBody(options?.body);

  // Har WRITE ko unique idempotency id — online bhejo ya queue karo,
  // server duplicate entry kabhi nahi banayega (retry/sync safe)
  const opId = method !== "GET" ? `${Date.now()}_${Math.random().toString(36).slice(2, 8)}` : "";

  // OFFLINE GET: phone me save data turant dikhao (chahe kitna purana ho)
  if (method === "GET" && !isOnline()) {
    // State galat bhi ho sakti hai (net chalu par "offline" chipka ho) —
    // probe chalao taki jaldi wapas online aaye aur fresh data aaye
    requestNetworkProbe();
    const hit = await cacheGet(url);
    if (hit) {
      return json(mergePendingCustomers(url, hit.data), 200, {
        "X-Cache": "offline",
        "X-Cache-Age": String(hit.timestamp || 0),
      });
    }
    return json({ error: "offline" }, 503);
  }

  if (method !== "GET" && (!isOnline() || hasTempCustomerRef(parsedBody))) {
    if (!isOnline()) requestNetworkProbe();
    return queueWrite(opId, method, url, parsedBody);
  }

  let res: Response;
  try {
    res = await fetch(fullUrl, {
      ...options,
      headers: buildHeaders({
        ...((options?.headers as Record<string, string> | undefined) || {}),
        ...(opId ? { "X-Idempotency-Key": opId } : {}),
      }),
      credentials: "omit",
    });
    // Response aaya (chaho status kuch bhi ho) = net sach me chal raha hai
    reportNetworkResult(true);
  } catch (e) {
    // Fetch fail = sach me offline (navigator.onLine jhooth bhi bole to bhi)
    reportNetworkResult(false);
    // Network fail (net gaya / server down / navigator.onLine ne jhooth bola):
    // GET ho to phone ka save data do, WRITE ho to queue me daalo (fake success)
    if (method === "GET") {
      const hit = await cacheGet(url);
      if (hit) {
        return json(mergePendingCustomers(url, hit.data), 200, {
          "X-Cache": "offline",
          "X-Cache-Age": String(hit.timestamp || 0),
        });
      }
    } else {
      return queueWrite(opId, method, url, parsedBody);
    }
    throw e;
  }

  if (method === "GET" && res.ok) {
    try {
      const data = await res.clone().json();
      await cacheSet(url, data);
      const merged = mergePendingCustomers(url, data);
      // Offline khata add hua ho tabhi nayi Response banao, warna purani hi wapas
      if (merged !== data) return json(merged, res.status);
    } catch {}
  }

  return res;
}

export async function apiGet(url: string): Promise<any> {
  const res = await api(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function apiPost(url: string, body: any): Promise<any> {
  const res = await api(url, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `API error: ${res.status}`);
  }
  return res.json();
}

export async function apiPut(url: string, body: any): Promise<any> {
  const res = await api(url, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `API error: ${res.status}`);
  }
  return res.json();
}
