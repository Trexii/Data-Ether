import { Pool, QueryResult, QueryResultRow } from "pg";

let pool: Pool | null = null;

/**
 * Returns a singleton connection pool with resilient configuration for serverless and cloud environments.
 */
export function getDbPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not configured in environment variables.");
    }

    const isSsl = process.env.DB_SSL === "true";

    pool = new Pool({
      connectionString,
      max: 10, // Sufficient pool size to prevent contention on slow networks
      idleTimeoutMillis: 15000, // Reclaim idle/stale sockets before remote hosts kill them
      connectionTimeoutMillis: 15000, // 15-second timeout to accommodate remote cloud database latency
      ssl: isSsl ? { rejectUnauthorized: false } : undefined,
    });

    pool.on("error", (err) => {
      console.error("Unexpected error on idle PostgreSQL client:", err);
    });
  }

  return pool;
}

/**
 * Executes a parameterized SQL query with automatic single-retry for transient network/connection drops.
 */
export async function query<R extends QueryResultRow = any>(
  text: string,
  params: any[] = []
): Promise<QueryResult<R>> {
  const db = getDbPool();
  try {
    return await db.query<R>(text, params);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isConnDrop =
      msg.includes("terminated") ||
      msg.includes("closed") ||
      msg.includes("timeout") ||
      msg.includes("ECONNRESET");

    if (isConnDrop) {
      console.warn("Database connection interrupted, retrying query with fresh connection:", msg);
      await new Promise((resolve) => setTimeout(resolve, 350));
      return await db.query<R>(text, params);
    }

    throw err;
  }
}
