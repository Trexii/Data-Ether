import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    // Verify database responsiveness
    await query("SELECT 1;");
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (err: unknown) {
    console.error("Health check failed on database query:", err);
    return NextResponse.json(
      {
        status: "error",
        error: "Database is unreachable",
      },
      { status: 503 }
    );
  }
}
