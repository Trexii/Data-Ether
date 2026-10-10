import { query } from "./db";

// In-memory sliding window for per-IP rate limiting
const ipTimestamps = new Map<string, number[]>();

/**
 * Checks if the given IP address has exceeded the rate limit per minute.
 */
export function checkIpRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const limit = parseInt(process.env.RATE_LIMIT_PER_MIN || "5", 10);
  const now = Date.now();
  const windowMs = 60 * 1000;

  // Filter timestamps within last 60 seconds
  const timestamps = (ipTimestamps.get(ip) || []).filter((time) => now - time < windowMs);

  if (timestamps.length >= limit) {
    ipTimestamps.set(ip, timestamps);
    return { allowed: false, remaining: 0 };
  }

  timestamps.push(now);
  ipTimestamps.set(ip, timestamps);

  return { allowed: true, remaining: limit - timestamps.length };
}

/**
 * Checks and increments global daily AI call counter in PostgreSQL.
 */
export async function checkDailyAiCap(): Promise<{ allowed: boolean; callsToday: number }> {
  const dailyCap = parseInt(process.env.DAILY_AI_CAP || "150", 10);

  try {
    const sql = `
      INSERT INTO usage_counter (day, calls)
      VALUES (CURRENT_DATE, 1)
      ON CONFLICT (day) DO UPDATE
      SET calls = usage_counter.calls + 1
      RETURNING calls;
    `;

    const result = await query(sql);
    const calls = result.rows[0]?.calls || 1;

    if (calls > dailyCap) {
      return { allowed: false, callsToday: calls };
    }

    return { allowed: true, callsToday: calls };
  } catch (err) {
    // If DB is offline, log and permit request to avoid blocking AI generation
    console.warn("Could not check daily usage counter in database:", err);
    return { allowed: true, callsToday: 0 };
  }
}
