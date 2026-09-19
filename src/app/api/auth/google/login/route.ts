import { NextResponse } from "next/server";
import { options as corsOptions } from "@/lib/cors";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_BASE_URL || "https://chakki-mitra.vercel.app"}/api/auth/google/callback`;

export function OPTIONS() { return corsOptions(); }

export async function GET() {
  const state = crypto.randomUUID();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "email profile");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("state", state);

  const response = NextResponse.redirect(url.toString());
  response.cookies.set("oauth_state", state, { httpOnly: true, maxAge: 300 });
  return response;
}
