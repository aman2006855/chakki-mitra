import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql, desc, count, like, or, ilike, and } from "drizzle-orm";
import { ok, err, options } from "@/lib/cors";
import { requireAdmin, maskEmail, maskPhone, isGuestEmail } from "@/lib/admin-auth";

export function OPTIONS() {
  return options();
}

// GET /api/admin/shops?q=&filter=&page=&pageSize=
// filter: all | registered | incomplete | guest | suspended
export async function GET(request: Request) {
  const auth = requireAdmin(request);
  if (auth !== true) return auth;

  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim();
    const filter = url.searchParams.get("filter") || "all";
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.min(100, Math.max(5, parseInt(url.searchParams.get("pageSize") || "20", 10) || 20));
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (q) {
      const pattern = `%${q}%`;
      conditions.push(
        or(
          ilike(users.shopName, pattern),
          ilike(users.name, pattern),
          ilike(users.email, pattern),
          ilike(users.phone, pattern),
          ilike(users.shopPhone, pattern),
          sql`CAST(${users.id} AS TEXT) = ${q}`
        )
      );
    }
    if (filter === "registered") conditions.push(eq(users.isRegistered, true));
    if (filter === "incomplete") conditions.push(eq(users.isRegistered, false));
    if (filter === "guest") conditions.push(like(users.email, "%@local"));
    if (filter === "suspended") conditions.push(eq(users.status, "suspended"));
    if (filter === "active") conditions.push(sql`COALESCE(${users.status}, 'active') != 'suspended'`);

    const where = conditions.length ? and(...conditions) : undefined;

    const [totalRow] = await db
      .select({ n: count() })
      .from(users)
      .where(where);

    const rows = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        phone: users.phone,
        shopName: users.shopName,
        shopPhone: users.shopPhone,
        isRegistered: users.isRegistered,
        smsCredits: users.smsCredits,
        referralCode: users.referralCode,
        referredBy: users.referredBy,
        status: users.status,
        statusReason: users.statusReason,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset(offset);

    const items = rows.map((r) => ({
      ...r,
      emailMasked: maskEmail(r.email),
      phoneMasked: maskPhone(r.phone),
      shopPhoneMasked: maskPhone(r.shopPhone),
      isGuest: isGuestEmail(r.email),
      status: r.status || "active",
    }));

    return ok({
      items,
      total: Number(totalRow?.n || 0),
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(Number(totalRow?.n || 0) / pageSize)),
    });
  } catch (e) {
    console.error("[admin_shops_error]", e);
    return err("Internal Server Error", 500);
  }
}
