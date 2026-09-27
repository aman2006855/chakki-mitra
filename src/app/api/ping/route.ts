import { ok, options } from "@/lib/cors";

export function OPTIONS() {
  return options();
}

// Connectivity probe — koi DB call NAHI (ye /api/health se fark hai).
// App isse poochta hai: "kya main server tak pahunch sakta hoon?"
// DB slow/down ho tab bhi yahan 200 aata hai → app galat "offline" nahi bolta.
export async function GET() {
  return ok({ status: "pong", rev: "net-smart-v1", t: Date.now() });
}
