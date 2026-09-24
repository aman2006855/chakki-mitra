import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ auth: false });
  }
  return NextResponse.json({ auth: true, ...session });
}

export async function POST() {
  return NextResponse.json({ success: true, message: "Token should be deleted client-side" });
}
