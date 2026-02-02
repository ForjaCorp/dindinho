import { z } from "zod";

export const backlogTypeSchema = z.enum(["epic", "story", "spike", "rfc"]);
export type BacklogTypeDTO = z.infer<typeof backlogTypeSchema>;

export const backlogStatusSchema = z.enum([
  "idea",
  "discovery",
  "planned",
  "in_progress",
  "done",
  "dropped",
]);
export type BacklogStatusDTO = z.infer<typeof backlogStatusSchema>;

export const backlogPrioritySchema = z.enum(["p0", "p1", "p2", "p3"]);
export type BacklogPriorityDTO = z.infer<typeof backlogPrioritySchema>;

export const backlogItemSchema = z.object({
  id: z.string().min(3),
  type: backlogTypeSchema,
  title: z.string().min(3),

  problem: z.string().min(10),
  constraints: z.array(z.string().min(3)).default([]),
  acceptance: z.array(z.string().min(3)).default([]),

  status: backlogStatusSchema.default("idea"),
  priority: backlogPrioritySchema.default("p2"),
  mvp: z.boolean().default(false),

  owners: z.array(z.string().min(2)).min(1),
  dependencies: z.array(z.string().min(3)).default([]),

  links: z
    .object({
      docs: z.array(z.string()).default([]),
      issues: z.array(z.string()).default([]),
      pullRequests: z.array(z.string()).default([]),
    })
    .default({ docs: [], issues: [], pullRequests: [] }),
});
export type BacklogItemDTO = z.infer<typeof backlogItemSchema>;
