import { z } from "zod";

// Schema for incoming request to /api/generate
export const generateRequestSchema = z.object({
  query: z
    .string()
    .trim()
    .min(3, "Query must be at least 3 characters")
    .max(200, "Query cannot exceed 200 characters"),
  batch: z.enum(["initial", "continuation"]).optional().default("initial"),
  // Required when batch === "continuation":
  columns: z.array(z.string()).optional(),
  note: z.string().optional(),
  existingRows: z.array(z.record(z.string(), z.union([z.string(), z.number()]))).optional(),
  existingRowsCount: z.number().int().min(1).max(100).optional(),
  previousItems: z.array(z.string()).optional(),
  targetTotal: z.number().int().min(1).max(100).optional(),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;

// Schema for raw AI initial response
export const aiResponseSchema = z.object({
  status: z.enum(["ok", "error"]),
  message: z.string().optional().default(""),
  note: z.string().default(""),
  targetTotal: z.number().int().optional().default(25),
  hasMore: z.boolean().optional().default(false),
  columns: z.array(z.string()).default([]),
  rows: z.array(z.record(z.string(), z.union([z.string(), z.number()]))).default([]),
});

export type AIResponse = z.infer<typeof aiResponseSchema>;

// Schema for raw AI continuation response
export const aiContinuationSchema = z.object({
  status: z.enum(["ok", "error"]),
  message: z.string().optional().default(""),
  rows: z.array(z.record(z.string(), z.union([z.string(), z.number()]))).default([]),
  hasMore: z.boolean().optional().default(false),
});

export type AIContinuationResponse = z.infer<typeof aiContinuationSchema>;

// Standard API response shape
export interface GenerateResult {
  query: string;
  note: string;
  columns: string[];
  rows: Record<string, string | number>[];
  model: string;
  cached: boolean;
  fromDatabase?: boolean;
  targetTotal?: number;
  hasMore?: boolean;
}

// Standard API error shape
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}
