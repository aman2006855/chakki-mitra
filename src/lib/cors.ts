import { NextResponse } from "next/server";

export function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
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
