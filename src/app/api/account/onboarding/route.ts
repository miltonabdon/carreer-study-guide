import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, learningGoals, learningPaths, topics } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { generateLearningPath } from "@/lib/ai/generate";

const onboardingSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  priority: z.enum(["high", "medium", "low"]),
  targetDate: z.string().optional(),
  dailyMinutes: z.number().int().min(15).max(480),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
  }

  const { title, description, priority, targetDate, dailyMinutes } = parsed.data;
  const userId = session.user.id;

  try {
    await db.update(users).set({ dailyAvailableMinutes: dailyMinutes }).where(eq(users.id, userId));

    const generated = await generateLearningPath(
      title,
      description,
      `Software architect with computer engineering and cloud/mobile postgrad background, interest in AI/ML`,
      dailyMinutes
    );

    const { goalId } = await db.transaction(async (tx) => {
      const [goal] = await tx
        .insert(learningGoals)
        .values({ userId, title, description, priority, targetDate: targetDate || null })
        .returning();

      const [path] = await tx
        .insert(learningPaths)
        .values({
          goalId: goal.id,
          totalEstimatedMinutes: generated.totalEstimatedMinutes,
          completionWeeksEstimate: generated.completionWeeksEstimate,
        })
        .returning();

      const topicRows = generated.topics.map((t, i) => ({
        pathId: path.id,
        title: t.title,
        description: t.description,
        orderIndex: t.orderIndex,
        complexity: t.complexity,
        estimatedMinutes: t.estimatedMinutes,
        status: i === 0 ? ("unlocked" as const) : ("locked" as const),
      }));

      await tx.insert(topics).values(topicRows);

      await tx.update(users).set({ onboardingCompleted: true }).where(eq(users.id, userId));

      return { goalId: goal.id };
    });

    return NextResponse.json({ goalId });
  } catch (err) {
    console.error("[POST /api/account/onboarding] error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
