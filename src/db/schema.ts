import { pgTable, serial, varchar, numeric, text, timestamp, pgEnum, boolean, integer } from "drizzle-orm/pg-core";

export const productTypeEnum = pgEnum("product_type", ["atta", "dalia"]);
export const paymentModeEnum = pgEnum("payment_mode", ["cash", "credit"]);
export const paymentTypeEnum = pgEnum("payment_type", ["advance", "dues_payment", "partial_payment"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  googleId: varchar("google_id", { length: 200 }).unique(),
  email: varchar("email", { length: 300 }).notNull(),
  name: varchar("name", { length: 200 }),
  phone: varchar("phone", { length: 20 }),
  shopName: varchar("shop_name", { length: 200 }),
  shopPhone: varchar("shop_phone", { length: 20 }),
  attaRate: numeric("atta_rate"),
  daliaRate: numeric("dalia_rate"),
  password: varchar("password", { length: 255 }),
  isRegistered: boolean("is_registered").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  address: text("address").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  customerId: serial("customer_id").references(() => customers.id, { onDelete: "cascade" }).notNull(),
  productType: productTypeEnum("product_type").notNull(),
  weight: numeric("weight").notNull(),
  rate: numeric("rate").notNull(),
  amount: numeric("amount").notNull(),
  paymentMode: paymentModeEnum("payment_mode").notNull(),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  customerId: serial("customer_id").references(() => customers.id, { onDelete: "cascade" }).notNull(),
  amount: numeric("amount").notNull(),
  type: paymentTypeEnum("type").notNull(),
  description: text("description").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

// Email OTPs for signup verification + password reset (Brevo)
export const emailOtps = pgTable("email_otps", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 300 }).notNull(),
  codeHash: varchar("code_hash", { length: 128 }).notNull(),
  purpose: varchar("purpose", { length: 20 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  attempts: integer("attempts").default(0),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Dummy test table
export const testTable = pgTable("test_table", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Generic rate limiting (fixed window) — login brute-force, OTP abuse, API spam
export const rateLimits = pgTable("rate_limits", {
  key: varchar("key", { length: 300 }).primaryKey(),
  count: integer("count").default(1).notNull(),
  windowStart: timestamp("window_start").defaultNow().notNull(),
});
