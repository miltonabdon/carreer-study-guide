import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { learningGoals, learningPaths, topics, users } from "@/lib/db/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { createGoalSchema } from "@/lib/validations/goals";
import { generateLearningPath } from "@/lib/ai/generate";
import { calculateRisk } from "@/lib/planner/risk";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const goals = await db
    .select({
      id: learningGoals.id,
      title: learningGoals.title,
      description: learningGoals.description,
      priority: learningGoals.priority,
      targetDate: learningGoals.targetDate,
      status: learningGoals.status,
      createdAt: learningGoals.createdAt,
    })
    .from(learningGoals)
    .where(eq(learningGoals.userId, session.user.id))
    .orderBy(sql`CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END`,
      learningGoals.createdAt);

  const [user] = await db
    .select({ dailyAvailableMinutes: users.dailyAvailableMinutes })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  // Compute progress + risk for each goal
  const goalsWithProgress = await Promise.all(
    goals.map(async (goal) => {
      const [path] = await db
        .select({ id: learningPaths.id })
        .from(learningPaths)
        .where(and(eq(learningPaths.goalId, goal.id), eq(learningPaths.status, "active")))
        .limit(1);

      if (!path) {
        return { ...goal, completionPercent: 0, totalTopics: 0, completedTopics: 0, atRisk: false, estimatedCompletionDate: null };
      }

      const [totals] = await db
        .select({
          total: count(),
          completed: sql<number>`count(*) filter (where status = 'complete')`.mapWith(Number),
          remainingMinutes: sql<number>`coalesce(sum(estimated_minutes) filter (where status != 'complete' and status != 'skipped'), 0)`.mapWith(Number),
        })
        .from(topics)
        .where(eq(topics.pathId, path.id));

      const total = totals?.total ?? 0;
      const completed = totals?.completed ?? 0;
      const remainingMinutes = totals?.remainingMinutes ?? 0;
      const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

      const { atRisk, estimatedCompletionDate } = calculateRisk({
        completedTopics: completed,
        totalTopics: total,
        targetDate: goal.targetDate,
        dailyAvailableMinutes: user?.dailyAvailableMinutes ?? 60,
        remainingMinutes,
      });

      return { ...goal, completionPercent, totalTopics: total, completedTopics: completed, atRisk, estimatedCompletionDate };
    })
  );

  return NextResponse.json(goalsWithProgress);
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const parsed = createGoalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
  }

  const { title, description, priority, targetDate } = parsed.data;

  try {
    const [user] = await db
      .select({ displayName: users.displayName, dailyAvailableMinutes: users.dailyAvailableMinutes })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Generate path before DB writes so a failure leaves no orphan
    const generated = await generateLearningPath(
      title,
      description,
      `Software architect with computer engineering and cloud/mobile postgrad background, interest in AI/ML`,
      user.dailyAvailableMinutes
    );

    const userId = session.user!.id as string;
    const { goal, path } = await db.transaction(async (tx) => {
      const [goal] = await tx
        .insert(learningGoals)
        .values({ userId, title, description, priority, targetDate })
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
      return { goal, path };
    });

    return NextResponse.json(
      { ...goal, path: { ...path, paceWarning: generated.paceWarning, fallbackUsed: generated.fallbackUsed } },
      { status: 201 }
    );
  } catch (err) {
    console.error("[POST /api/goals] error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
