import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { query } from "@/lib/db";

const saveRequestSchema = z.object({
  query: z.string().trim().min(1, "Query is required").max(200),
  note: z.string().optional().default(""),
  columns: z.array(z.string()).min(1, "At least one column is required"),
  rows: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
  model: z.string().optional().default("Gemini"),
});

/**
 * GET /api/datasets - Lists the 100 most recent saved datasets.
 */
export async function GET() {
  try {
    const sql = `
      SELECT 
        id, 
        query, 
        row_count AS "rowCount", 
        model, 
        created_at AS "createdAt"
      FROM datasets
      ORDER BY created_at DESC
      LIMIT 100;
    `;

    const result = await query(sql);
    return NextResponse.json(result.rows);
  } catch (err: unknown) {
    console.error("Database error listing datasets:", err);
    return NextResponse.json(
      {
        error: {
          code: "DB_ERROR",
          message: "Could not reach the database.",
        },
      },
      { status: 503 }
    );
  }
}

/**
 * POST /api/datasets - Persists a generated dataset to PostgreSQL.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = saveRequestSchema.safeParse(body);

    if (!parseResult.success) {
      const message = parseResult.error.issues?.[0]?.message || "Invalid dataset format.";
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message } },
        { status: 400 }
      );
    }

    const { query: queryText, note, columns, rows, model } = parseResult.data;

    const sql = `
      INSERT INTO datasets (query, note, columns, rows, row_count, model)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, created_at as "createdAt";
    `;

    const result = await query(sql, [
      queryText,
      note,
      JSON.stringify(columns),
      JSON.stringify(rows),
      rows.length,
      model,
    ]);

    const savedRow = result.rows[0];

    return NextResponse.json(
      {
        id: savedRow.id,
        createdAt: savedRow.createdAt,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("Database error saving dataset:", err);
    return NextResponse.json(
      {
        error: {
          code: "DB_ERROR",
          message: "Could not reach the database.",
        },
      },
      { status: 503 }
    );
  }
}

