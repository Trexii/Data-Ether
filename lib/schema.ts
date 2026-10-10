import { z } from "zod";

// Schema for incoming request to /api/generate
export const generateRequestSchema = z.object({
  query: z
    .string()
    .trim()
    .min(3, "Query must be at least 3 characters")
    .max(200, "Query cannot exceed 200 characters"),
});

// Schema for raw AI response
export const aiResponseSchema = z.object({
  status: z.enum(["ok", "error"]),
  message: z.string().optional().default(""),
  note: z.string().default(""),
  columns: z.array(z.string()).default([]),
  rows: z.array(z.record(z.string(), z.union([z.string(), z.number()]))).default([]),
});

export type AIResponse = z.infer<typeof aiResponseSchema>;

// Standard API response shape
export interface GenerateResult {
  query: string;
  note: string;
  columns: string[];
  rows: Record<string, string | number>[];
  model: string;
  cached: boolean;
}

// Standard API error shape
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}
