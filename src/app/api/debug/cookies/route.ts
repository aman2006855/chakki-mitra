import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const allCookies: Record<string, string> = {};
  for (const [name, cookie] of cookieStore) {
    allCookies[name] = cookie.value;
  }
  return NextResponse.json({ cookies: allCookies, count: Object.keys(allCookies).length });
}
