import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { desc, sql, count } from "drizzle-orm";
import { ok, err, options } from "@/lib/cors";
import { requireAdmin } from "@/lib/admin-auth";

export function OPTIONS() {
  return options();
}

// GET — append-only audit trail (read-only; koi edit/delete nahi)
export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth !== true) return auth;

  try {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(10, parseInt(url.searchParams.get("pageSize") || "50", 10) || 50));
    const action = url.searchParams.get("action");
    const offset = (page - 1) * pageSize;

    const where = action ? sql`${auditLogs.action} = ${action}` : undefined;

    const [totalRow] = await db
      .select({ n: count() })
      .from(auditLogs)
      .where(where);

    const rows = await db
      .select()
      .from(auditLogs)
      .where(where)
      .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
      .limit(pageSize)
      .offset(offset);

    return ok({
      items: rows,
      total: Number(totalRow?.n || 0),
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(Number(totalRow?.n || 0) / pageSize)),
      appendOnly: true,
    });
  } catch (e) {
    console.error("[admin_audit_error]", e);
    return err("Internal Server Error", 500);
  }
}
