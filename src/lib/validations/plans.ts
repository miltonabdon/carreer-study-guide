import { z } from "zod";

export const completeTaskSchema = z.object({
  status: z.enum(["completed", "skipped"]),
  durationMinutes: z.number().int().positive().optional(),
  confidenceRating: z.number().int().min(1).max(5).optional(),
  notes: z.string().optional(),
}).refine(
  (data) =>
    data.status === "skipped" ||
    (data.durationMinutes !== undefined && data.confidenceRating !== undefined),
  {
    message: "durationMinutes and confidenceRating are required when status is 'completed'",
  }
);

export type CompleteTaskInput = z.infer<typeof completeTaskSchema>;
