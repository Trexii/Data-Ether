import { NextRequest, NextResponse } from "next/server";
import { generateRequestSchema } from "@/lib/schema";
import { generateTableData, AiError } from "@/lib/ai";
import { checkIpRateLimit, checkDailyAiCap } from "@/lib/rateLimit";
import { getCachedGeneration, setCachedGeneration, normalizeCacheKey } from "@/lib/cache";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    // 1. Validate request body
    const body = await req.json();
    const parseResult = generateRequestSchema.safeParse(body);

    if (!parseResult.success) {
      const firstError = parseResult.error.issues?.[0]?.message || "Invalid request parameters.";
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: firstError } },
        { status: 400 }
      );
    }

    const { query: userQuery } = parseResult.data;

    // 2. Check if this exact dataset is already saved in the database
    try {
      const savedResult = await query(
        `SELECT query, note, columns, rows, model 
         FROM datasets 
         WHERE LOWER(TRIM(query)) = LOWER(TRIM($1)) 
         ORDER BY created_at DESC 
         LIMIT 1;`,
        [userQuery]
      );

      if (savedResult.rows.length > 0) {
        const row = savedResult.rows[0];
        return NextResponse.json({
          query: row.query,
          note: row.note,
          columns: typeof row.columns === "string" ? JSON.parse(row.columns) : row.columns,
          rows: typeof row.rows === "string" ? JSON.parse(row.rows) : row.rows,
          model: row.model,
          cached: true,
          fromDatabase: true,
        });
      }
    } catch (err) {
      // If DB check fails, proceed to cache / AI check
      console.warn("Database check skipped:", err);
    }

    // 3. Check IP Rate Limit
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rateLimit = checkIpRateLimit(clientIp);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests. Please wait a minute before generating again.",
          },
        },
        { status: 429 }
      );
    }

    // 4. Check Cache
    const cacheKey = normalizeCacheKey(userQuery);
    const cachedResult = await getCachedGeneration(cacheKey);

    if (cachedResult) {
      return NextResponse.json(cachedResult);
    }

    // 5. Check Daily Global AI Cap
    const dailyCap = await checkDailyAiCap();
    if (!dailyCap.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "DAILY_CAP_REACHED",
            message: "The AI is busy right now. Try again in a minute, or use Load Saved Data.",
          },
        },
        { status: 429 }
      );
    }

    // 6. Call AI generation service
    const { data, modelUsed } = await generateTableData(userQuery);

    const resultPayload = {
      query: userQuery,
      note: data.note,
      columns: data.columns,
      rows: data.rows,
      model: modelUsed,
      cached: false,
      fromDatabase: false,
    };

    // 7. Save successful generation into Cache
    await setCachedGeneration(cacheKey, resultPayload);

    return NextResponse.json(resultPayload);
  } catch (error: unknown) {
    if (error instanceof AiError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      );
    }

    console.error("Unexpected error in /api/generate:", error);
    return NextResponse.json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "An unexpected error occurred while generating data.",
        },
      },
      { status: 500 }
    );
  }
}
