import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const datasetId = parseInt(id, 10);

    if (isNaN(datasetId)) {
      return NextResponse.json(
        { error: { code: "INVALID_ID", message: "Dataset ID must be a valid number." } },
        { status: 400 }
      );
    }

    const sql = `
      SELECT 
        id, 
        query, 
        note, 
        columns, 
        rows, 
        model, 
        created_at AS "createdAt"
      FROM datasets
      WHERE id = $1;
    `;

    const result = await query(sql, [datasetId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Dataset not found." } },
        { status: 404 }
      );
    }

    const row = result.rows[0];

    return NextResponse.json({
      id: row.id,
      query: row.query,
      note: row.note,
      columns: typeof row.columns === "string" ? JSON.parse(row.columns) : row.columns,
      rows: typeof row.rows === "string" ? JSON.parse(row.rows) : row.rows,
      model: row.model,
      createdAt: row.createdAt,
    });
  } catch (err: unknown) {
    console.error("Database error fetching dataset:", err);
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

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const datasetId = parseInt(id, 10);

    if (isNaN(datasetId)) {
      return NextResponse.json(
        { error: { code: "INVALID_ID", message: "Dataset ID must be a valid number." } },
        { status: 400 }
      );
    }

    const sql = `DELETE FROM datasets WHERE id = $1 RETURNING id;`;
    const result = await query(sql, [datasetId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Dataset not found." } },
        { status: 404 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (err: unknown) {
    console.error("Database error deleting dataset:", err);
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
