import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session");
  if (!sessionCookie) {
    return NextResponse.json({ auth: false, debug: "no session cookie" });
  }
  try {
    const session = JSON.parse(sessionCookie.value);
    return NextResponse.json({ auth: true, ...session, debug: `userId=${session.userId}` });
  } catch (e) {
    return NextResponse.json({ auth: false, debug: `parse error: ${e}` });
  }
}

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("session");
  return response;
}
