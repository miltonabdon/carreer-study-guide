import { z } from "zod";

export const createSessionSchema = z.object({
  topicId: z.string().uuid(),
  sessionType: z.enum(["new_learning", "review"]),
  studiedAt: z.string().date(),
  durationMinutes: z.number().int().positive(),
  confidenceRating: z.number().int().min(1).max(5),
  notes: z.string().optional(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
