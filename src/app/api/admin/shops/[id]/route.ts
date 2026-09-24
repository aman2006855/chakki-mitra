import { db } from "@/db";
import { users, customers, transactions, payments } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import { ok, err, options } from "@/lib/cors";
import { requireAdmin, maskEmail, maskPhone, isGuestEmail, writeAudit } from "@/lib/admin-auth";

export function OPTIONS() {
  return options();
}

type Params = { params: Promise<{ id: string }> };

// GET — shop detail (read-only, PII masked)
export async function GET(request: Request, { params }: Params) {
  const auth = requireAdmin(request);
  if (auth !== true) return auth;

  try {
    const { id } = await params;
    const userId = Number(id);
    if (!Number.isFinite(userId) || userId <= 0) return err("Invalid id", 400);

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return err("Shop not found", 404);

    const [custCount] = await db.select({ n: count() }).from(customers).where(eq(customers.userId, userId));
    const [txnCount] = await db.select({ n: count() }).from(transactions).where(eq(transactions.userId, userId));
    const [payCount] = await db.select({ n: count() }).from(payments).where(eq(payments.userId, userId));

    return ok({
      id: user.id,
      email: user.email,
      emailMasked: maskEmail(user.email),
      name: user.name || "",
      phone: user.phone || "",
      phoneMasked: maskPhone(user.phone),
      shopName: user.shopName || "",
      shopPhone: user.shopPhone || "",
      shopPhoneMasked: maskPhone(user.shopPhone),
      attaRate: user.attaRate || "",
      daliaRate: user.daliaRate || "",
      isRegistered: user.isRegistered ?? false,
      smsCredits: user.smsCredits ?? 0,
      referralCode: user.referralCode || "",
      referredBy: user.referredBy || "",
      status: user.status || "active",
      statusReason: user.statusReason || "",
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      isGuest: isGuestEmail(user.email),
      counts: {
        customers: Number(custCount?.n || 0),
        transactions: Number(txnCount?.n || 0),
        payments: Number(payCount?.n || 0),
      },
    });
  } catch (e) {
    console.error("[admin_shop_detail_error]", e);
    return err("Internal Server Error", 500);
  }
}

// PUT — activate / suspend (reason mandatory for suspend)
export async function PUT(request: Request, { params }: Params) {
  const auth = requireAdmin(request);
  if (auth !== true) return auth;

  try {
    const { id } = await params;
    const userId = Number(id);
    if (!Number.isFinite(userId) || userId <= 0) return err("Invalid id", 400);

    const body = await request.json().catch(() => ({}));
    const action = body.action as string;
    const reason = String(body.reason || "").trim();

    if (action !== "suspend" && action !== "activate") {
      return err("action must be suspend or activate", 400);
    }
    if (action === "suspend" && reason.length < 3) {
      return err("Suspension reason required (min 3 chars)", 400);
    }

    const [user] = await db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return err("Shop not found", 404);

    if (action === "suspend") {
      await db
        .update(users)
        .set({ status: "suspended", statusReason: reason })
        .where(eq(users.id, userId));
    } else {
      await db
        .update(users)
        .set({ status: "active", statusReason: reason || "" })
        .where(eq(users.id, userId));
    }

    await writeAudit({
      action: action === "suspend" ? "shop.suspend" : "shop.activate",
      targetType: "user",
      targetId: String(userId),
      reason,
      detail: `email=${maskEmail(user.email)}`,
    });

    return ok({ success: true, status: action === "suspend" ? "suspended" : "active" });
  } catch (e) {
    console.error("[admin_shop_status_error]", e);
    return err("Internal Server Error", 500);
  }
}
