import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function GET(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ auth: false });
  }
  const token = authHeader.slice(7);
  const session = verifyToken(token);
  if (!session) {
    return NextResponse.json({ auth: false });
  }
  return NextResponse.json({ auth: true, ...session });
}

export async function POST() {
  return NextResponse.json({ success: true, message: "Token should be deleted client-side" });
}
