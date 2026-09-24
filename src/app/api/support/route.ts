import { db } from "@/db";
import { supportTickets } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getUserIdFromRequest } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { ok, err, options } from "@/lib/cors";

export function OPTIONS() { return options(); }

const CATEGORIES = ["general", "billing", "technical", "account", "other"];

// GET /api/support — mere tickets (status + admin reply ke saath)
export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return err("unauthorized", 401);
  try {
    const rows = await db
      .select({
        id: supportTickets.id,
        subject: supportTickets.subject,
        category: supportTickets.category,
        status: supportTickets.status,
        priority: supportTickets.priority,
        message: supportTickets.message,
        adminReply: supportTickets.adminReply,
        createdAt: supportTickets.createdAt,
        updatedAt: supportTickets.updatedAt,
      })
      .from(supportTickets)
      .where(eq(supportTickets.userId, userId))
      .orderBy(desc(supportTickets.updatedAt))
      .limit(20);
    return ok({ tickets: rows });
  } catch (e) {
    console.error("[support_list_error]", e);
    return err("Internal Server Error", 500);
  }
}

// POST /api/support — naya ticket { subject, category?, message? }
export async function POST(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) return err("unauthorized", 401);
  try {
    // Spam guard: 10 tickets per hour per user (fail-open nahi — yahan strict)
    const limit = await checkRateLimit(`support:${userId}`, 10, 3600);
    if (!limit.allowed) {
      return err("Bahut tickets bhej diye. Thodi der baad try karo.", 429);
    }

    const body = await request.json().catch(() => ({}));
    const subject = String(body.subject || "").trim();
    const category = String(body.category || "general").slice(0, 40);
    const message = String(body.message || "").slice(0, 2000);

    if (subject.length < 3) return err("Subject me kam se kam 3 akshar likho", 400);
    if (!CATEGORIES.includes(category)) return err("Invalid category", 400);

    const [row] = await db
      .insert(supportTickets)
      .values({ userId, subject: subject.slice(0, 300), category, message, status: "new" })
      .returning({ id: supportTickets.id });

    return ok({ success: true, id: row.id });
  } catch (e) {
    console.error("[support_create_error]", e);
    return err("Internal Server Error", 500);
  }
}
