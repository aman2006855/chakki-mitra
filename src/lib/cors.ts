import { NextResponse } from "next/server";

export function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    // X-Idempotency-Key ALLOW-List me hona ZAROORI hai — warna APK (cross-origin)
    // preflight reject ho jata har write par → "offline" stuck + sync band.
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, Accept, X-Requested-With, X-Idempotency-Key",
    "Access-Control-Expose-Headers": "X-Cache, X-Cache-Age",
    // Chhota TTL — fix deploy hote hi purana (galat) preflight cache turant expire ho
    "Access-Control-Max-Age": "600",
  };
}

export function ok(data: any): NextResponse {
  return NextResponse.json(data, { headers: corsHeaders() });
}

export function err(message: string, status: number = 400): NextResponse {
  return NextResponse.json({ error: message }, { status, headers: corsHeaders() });
}

export function options(): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
