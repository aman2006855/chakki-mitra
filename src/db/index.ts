import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
  __arenaNextJsDb?: NodePgDatabase;
};

function getPool(): Pool {
  if (!globalForDb.__arenaNextJsPostgresqlPool) {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error("DATABASE_URL is required at runtime");
    }
    globalForDb.__arenaNextJsPostgresqlPool = new Pool({
      connectionString: databaseUrl,
    });
  }
  return globalForDb.__arenaNextJsPostgresqlPool;
}

function getDb(): NodePgDatabase {
  if (!globalForDb.__arenaNextJsDb) {
    globalForDb.__arenaNextJsDb = drizzle(getPool());
  }
  return globalForDb.__arenaNextJsDb;
}

// Lazy proxy: import { db } from "@/db" works unchanged.
// Database is only initialized when a method is actually called at runtime.
export const db = new Proxy({} as NodePgDatabase, {
  get(_target, prop, _receiver) {
    return (getDb() as any)[prop];
  },
});

export const pool = new Proxy({} as Pool, {
  get(_target, prop, _receiver) {
    return (getPool() as any)[prop];
  },
});
