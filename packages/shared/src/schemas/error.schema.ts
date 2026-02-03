import { z } from "zod";

export const apiErrorCodeSchema = z
  .string()
  .min(1)
  .regex(/^[A-Z0-9_]+$/)
  .optional();

export const zodIssueSchema = z
  .object({
    code: z.string(),
    message: z.string(),
    path: z.array(z.union([z.string(), z.number()])),
  })
  .passthrough();

export const apiErrorResponseSchema = z
  .object({
    statusCode: z.number().int(),
    error: z.string(),
    message: z.string(),
    code: apiErrorCodeSchema,
    requestId: z.string().min(1).optional(),
    issues: z.array(zodIssueSchema).optional(),
    details: z.unknown().optional(),
  })
  .strict();

export type ApiErrorResponseDTO = z.infer<typeof apiErrorResponseSchema>;
export type ApiErrorCodeDTO = z.infer<typeof apiErrorCodeSchema>;
