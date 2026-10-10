import { NextRequest, NextResponse } from "next/server";
import { generateRequestSchema } from "@/lib/schema";
import { optimizeQueryPrompt } from "@/lib/ai";
import { checkIpRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = generateRequestSchema.safeParse(body);

    if (!parseResult.success) {
      const firstError = parseResult.error.issues?.[0]?.message || "Invalid query input.";
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: firstError } },
        { status: 400 }
      );
    }

    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const rateLimit = checkIpRateLimit(clientIp);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: "Too many optimization requests. Please wait a moment.",
          },
        },
        { status: 429 }
      );
    }

    const { query: userQuery } = parseResult.data;
    const result = await optimizeQueryPrompt(userQuery);

    return NextResponse.json(result);
  } catch (err: unknown) {
    console.error("Error in /api/optimize-query:", err);
    return NextResponse.json(
      {
        error: {
          code: "SERVER_ERROR",
          message: "Failed to optimize search query.",
        },
      },
      { status: 500 }
    );
  }
}
