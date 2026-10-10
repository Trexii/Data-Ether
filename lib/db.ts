import { Pool, QueryResult, QueryResultRow } from "pg";

let pool: Pool | null = null;

/**
 * Returns a singleton connection pool to avoid leaking connections in serverless environments.
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
      max: 2, // Keep connection pool small for serverless AWS Amplify/RDS
      connectionTimeoutMillis: 10000, // 10-second timeout to accommodate remote cloud database latency
      ssl: isSsl ? { rejectUnauthorized: false } : undefined,
    });

    pool.on("error", (err) => {
      console.error("Unexpected error on idle PostgreSQL client:", err);
    });
  }

  return pool;
}

/**
 * Executes a parameterized SQL query with graceful error propagation.
 */
export async function query<R extends QueryResultRow = any>(
  text: string,
  params: any[] = []
): Promise<QueryResult<R>> {
  const db = getDbPool();
  return await db.query<R>(text, params);
}
