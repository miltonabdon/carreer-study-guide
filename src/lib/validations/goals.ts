import { z } from "zod";

export const createGoalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(10),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  targetDate: z.string().date().optional(),
});

export const updateGoalSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(10).optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  targetDate: z.string().date().nullable().optional(),
  status: z.enum(["active", "paused", "archived"]).optional(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
