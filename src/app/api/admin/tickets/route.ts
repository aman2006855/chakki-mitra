import { db } from "@/db";
import { supportTickets, users } from "@/db/schema";
import { eq, desc, sql, count } from "drizzle-orm";
import { ok, err, options } from "@/lib/cors";
import { requireAdmin, maskEmail, writeAudit } from "@/lib/admin-auth";

export function OPTIONS() {
  return options();
}

// GET — list tickets (?status=)
export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth !== true) return auth;

  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");

    const rows = await db
      .select({
        id: supportTickets.id,
        userId: supportTickets.userId,
        subject: supportTickets.subject,
        category: supportTickets.category,
        status: supportTickets.status,
        priority: supportTickets.priority,
        message: supportTickets.message,
        adminReply: supportTickets.adminReply,
        resolutionNote: supportTickets.resolutionNote,
        createdAt: supportTickets.createdAt,
        updatedAt: supportTickets.updatedAt,
        shopName: users.shopName,
        userEmail: users.email,
        userName: users.name,
      })
      .from(supportTickets)
      .leftJoin(users, eq(supportTickets.userId, users.id))
      .orderBy(desc(supportTickets.updatedAt))
      .limit(200);

    let items = rows;
    if (status) items = items.filter((r) => r.status === status);

    const [openN] = await db
      .select({ n: count() })
      .from(supportTickets)
      .where(sql`${supportTickets.status} IN ('new', 'in_progress', 'waiting')`);

    return ok({
      items: items.map((r) => ({
        ...r,
        userEmailMasked: maskEmail(r.userEmail),
      })),
      openCount: Number(openN?.n || 0),
    });
  } catch (e) {
    console.error("[admin_tickets_error]", e);
    return err("Internal Server Error", 500);
  }
}

// POST — create ticket { userId?, subject, category, message, priority? }
export async function POST(request: Request) {
  const auth = requireAdmin(request);
  if (auth !== true) return auth;

  try {
    const body = await request.json().catch(() => ({}));
    const subject = String(body.subject || "").trim();
    if (!subject) return err("Subject required", 400);

    const [row] = await db
      .insert(supportTickets)
      .values({
        userId: body.userId ? Number(body.userId) : null,
        subject: subject.slice(0, 300),
        category: String(body.category || "other").slice(0, 40),
        priority: String(body.priority || "medium").slice(0, 20),
        message: String(body.message || ""),
        status: "new",
      })
      .returning();

    await writeAudit({
      action: "ticket.create",
      targetType: "ticket",
      targetId: String(row.id),
      detail: subject.slice(0, 100),
    });

    return ok(row);
  } catch (e) {
    console.error("[admin_ticket_create_error]", e);
    return err("Internal Server Error", 500);
  }
}

// PUT — update { id, status?, adminReply?, resolutionNote?, priority?, assignee? }
export async function PUT(request: Request) {
  const auth = requireAdmin(request);
  if (auth !== true) return auth;

  try {
    const body = await request.json().catch(() => ({}));
    const id = Number(body.id);
    if (!Number.isFinite(id) || id <= 0) return err("id required", 400);

    const [existing] = await db.select().from(supportTickets).where(eq(supportTickets.id, id)).limit(1);
    if (!existing) return err("Ticket not found", 404);

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    const allowedStatus = ["new", "in_progress", "waiting", "resolved", "closed"];
    if (body.status !== undefined) {
      if (!allowedStatus.includes(body.status)) return err("Invalid status", 400);
      updates.status = body.status;
    }
    if (body.adminReply !== undefined) updates.adminReply = String(body.adminReply);
    if (body.resolutionNote !== undefined) updates.resolutionNote = String(body.resolutionNote);
    if (body.priority !== undefined) updates.priority = String(body.priority);
    if (body.category !== undefined) updates.category = String(body.category);

    const [row] = await db.update(supportTickets).set(updates).where(eq(supportTickets.id, id)).returning();

    await writeAudit({
      action: "ticket.update",
      targetType: "ticket",
      targetId: String(id),
      detail: body.status ? `status=${body.status}` : "updated",
    });

    return ok(row);
  } catch (e) {
    console.error("[admin_ticket_update_error]", e);
    return err("Internal Server Error", 500);
  }
}
