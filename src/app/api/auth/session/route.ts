import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";
import { corsHeaders, options } from "@/lib/cors";

export function OPTIONS() {
  return options();
}

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ auth: false }, { headers: corsHeaders() });
  }
  return NextResponse.json({ auth: true, ...session }, { headers: corsHeaders() });
}

export async function POST() {
  return NextResponse.json({ success: true, message: "Token should be deleted client-side" }, { headers: corsHeaders() });
}
