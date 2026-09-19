import { ok, options } from "@/lib/cors";

export function OPTIONS() { return options(); }

export async function GET() {
  return ok({ message: "Debug endpoint - auth is now token-based" });
}
