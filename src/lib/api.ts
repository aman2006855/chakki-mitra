import { API_BASE } from "./config";
import { getCached, setCache, addPendingOp, isOnline } from "./offline-db";

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

export async function api(url: string, options?: RequestInit): Promise<Response> {
  const fullUrl = url.startsWith("http") ? url : `${API_BASE}${url}`;
  const method = options?.method || "GET";

  if (method === "GET" && !isOnline()) {
    const cached = getCached(url);
    if (cached !== null) {
      return new Response(JSON.stringify(cached), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (method !== "GET" && !isOnline()) {
    const opId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    addPendingOp({
      id: opId,
      method,
      url,
      body: options?.body ? JSON.parse(options.body as string) : null,
      timestamp: Date.now(),
    });
    return new Response(JSON.stringify({ success: true, offline: true, opId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const res = await fetch(fullUrl, {
    ...options,
    headers: buildHeaders(options?.headers as Record<string, string>),
    credentials: "omit",
  });

  if (method === "GET" && res.ok) {
    const clone = res.clone();
    try {
      const data = await clone.json();
      setCache(url, data);
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
