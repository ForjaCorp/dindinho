import { z } from "zod";

export const docAudienceSchema = z.enum(["dev", "ops", "product", "user"]);
export type DocAudienceDTO = z.infer<typeof docAudienceSchema>;

export const docVisibilitySchema = z.enum(["internal", "public"]);
export type DocVisibilityDTO = z.infer<typeof docVisibilitySchema>;

export const docStatusSchema = z.enum(["draft", "wip", "stable", "deprecated"]);
export type DocStatusDTO = z.infer<typeof docStatusSchema>;

export const docFrontmatterSchema = z.object({
  id: z.string().min(3),
  title: z.string().min(3),
  description: z.string().max(280).optional(),

  audience: z.array(docAudienceSchema).min(1),
  visibility: docVisibilitySchema.default("internal"),
  status: docStatusSchema.default("draft"),

  owners: z.array(z.string().min(2)).min(1),
  tags: z.array(z.string().min(2)).default([]),

  mvp: z.boolean().default(false),

  createdAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  updatedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),

  links: z
    .object({
      repoPaths: z.array(z.string()).default([]),
      relatedDocs: z.array(z.string()).default([]),
      endpoints: z.array(z.string()).default([]),
    })
    .default({ repoPaths: [], relatedDocs: [], endpoints: [] }),
});
export type DocFrontmatterDTO = z.infer<typeof docFrontmatterSchema>;
