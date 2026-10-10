import { NextRequest, NextResponse } from "next/server";
import { generateRequestSchema } from "@/lib/schema";
import { generateInitialTableData, generateContinuationRows, AiError } from "@/lib/ai";
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

    const {
      query: userQuery,
      batch = "initial",
      columns = [],
      note = "",
      existingRows = [],
      existingRowsCount = 0,
      previousItems = [],
      targetTotal = 25,
    } = parseResult.data;

    // Handle continuation batch
    if (batch === "continuation") {
      if (!columns || columns.length === 0) {
        return NextResponse.json(
          { error: { code: "INVALID_INPUT", message: "Columns must be provided for continuation batch." } },
          { status: 400 }
        );
      }

      const { rows: continuationRows, modelUsed } = await generateContinuationRows(
        userQuery,
        columns,
        existingRowsCount || (existingRows ? existingRows.length : 0),
        previousItems,
        targetTotal
      );

      // Save complete merged dataset into cache
      if (existingRows && existingRows.length > 0) {
        try {
          const cacheKey = normalizeCacheKey(userQuery);
          const fullRows = [...existingRows, ...continuationRows];
          await setCachedGeneration(cacheKey, {
            query: userQuery,
            note: note || "",
            columns,
            rows: fullRows,
            model: modelUsed,
            cached: true,
            fromDatabase: false,
            hasMore: false,
            targetTotal: fullRows.length,
          });
        } catch (cacheErr) {
          console.warn("Failed to update cache on continuation:", cacheErr);
        }
      }

      return NextResponse.json({
        rows: continuationRows,
        model: modelUsed,
        hasMore: false,
      });
    }

    // --- INITIAL BATCH FLOW ---

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
          hasMore: false,
        });
      }
    } catch (err) {
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
      return NextResponse.json({
        ...cachedResult,
        hasMore: false,
      });
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

    // 6. Call AI initial generation (fast schema + first batch in ~2s)
    const { data, modelUsed } = await generateInitialTableData(userQuery);

    const resultPayload = {
      query: userQuery,
      note: data.note,
      columns: data.columns,
      rows: data.rows,
      targetTotal: data.targetTotal,
      hasMore: data.hasMore,
      model: modelUsed,
      cached: false,
      fromDatabase: false,
    };

    // If all rows were generated in batch 1, cache immediately
    if (!data.hasMore) {
      await setCachedGeneration(cacheKey, resultPayload);
    }

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
