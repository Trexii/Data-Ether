import { query } from "./db";
import { GenerateResult } from "./schema";

/**
 * Normalizes user query by trimming, lowercasing, and collapsing multiple spaces.
 */
export function normalizeCacheKey(rawQuery: string): string {
  return rawQuery.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Retrieves cached generation result if present and within TTL (default 6 hours).
 */
export async function getCachedGeneration(
  cacheKey: string
): Promise<GenerateResult | null> {
  try {
    const ttlHours = parseInt(process.env.CACHE_TTL_HOURS || "6", 10);
    const sql = `
      SELECT response, created_at
      FROM generation_cache
      WHERE cache_key = $1
        AND created_at >= NOW() - ($2 || ' hours')::INTERVAL;
    `;

    const result = await query(sql, [cacheKey, ttlHours.toString()]);
    if (result.rows.length === 0) {
      return null;
    }

    const cachedData = result.rows[0].response as GenerateResult;
    return {
      ...cachedData,
      cached: true,
    };
  } catch (err) {
    console.warn("Cache lookup skipped due to database error:", err);
    return null;
  }
}

/**
 * Saves successful generation result to cache.
 */
export async function setCachedGeneration(
  cacheKey: string,
  response: GenerateResult
): Promise<void> {
  try {
    const sql = `
      INSERT INTO generation_cache (cache_key, response, created_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (cache_key) DO UPDATE
      SET response = EXCLUDED.response,
          created_at = NOW();
    `;

    await query(sql, [cacheKey, JSON.stringify(response)]);
  } catch (err) {
    console.warn("Failed to persist to generation cache:", err);
  }
}
