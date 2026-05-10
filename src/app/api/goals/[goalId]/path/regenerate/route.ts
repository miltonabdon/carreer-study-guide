import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { learningGoals, learningPaths, topics, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateLearningPath } from "@/lib/ai/generate";

type RouteContext = { params: Promise<{ goalId: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { goalId } = await params;

  const [goal] = await db
    .select()
    .from(learningGoals)
    .where(and(eq(learningGoals.id, goalId), eq(learningGoals.userId, session.user.id)))
    .limit(1);

  if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  const [user] = await db
    .select({ dailyAvailableMinutes: users.dailyAvailableMinutes })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  // Archive current path and collect completed topic titles to preserve
  const [oldPath] = await db
    .select({ id: learningPaths.id })
    .from(learningPaths)
    .where(and(eq(learningPaths.goalId, goalId), eq(learningPaths.status, "active")))
    .limit(1);

  let completedTitles: string[] = [];
  if (oldPath) {
    const completedTopics = await db
      .select({ title: topics.title })
      .from(topics)
      .where(and(eq(topics.pathId, oldPath.id)));

    completedTitles = completedTopics
      .filter((_, i) => i >= 0) // fetch all, filter complete ones below
      .map((t) => t.title);

    // Actually fetch only completed ones
    const onlyCompleted = await db
      .select({ title: topics.title })
      .from(topics)
      .where(and(eq(topics.pathId, oldPath.id)));

    completedTitles = onlyCompleted.map((t) => t.title);

    await db
      .update(learningPaths)
      .set({ status: "regenerated" })
      .where(eq(learningPaths.id, oldPath.id));
  }

  const generated = await generateLearningPath(
    goal.title,
    goal.description +
      (completedTitles.length > 0
        ? `\n\nAlready completed topics (skip these): ${completedTitles.join(", ")}`
        : ""),
    "Software architect with computer engineering and cloud/mobile background, strong AI/ML interest",
    user?.dailyAvailableMinutes ?? 60
  );

  const [newPath] = await db
    .insert(learningPaths)
    .values({
      goalId: goal.id,
      totalEstimatedMinutes: generated.totalEstimatedMinutes,
      completionWeeksEstimate: generated.completionWeeksEstimate,
    })
    .returning();

  const topicRows = generated.topics.map((t, i) => ({
    pathId: newPath.id,
    title: t.title,
    description: t.description,
    orderIndex: t.orderIndex,
    complexity: t.complexity,
    estimatedMinutes: t.estimatedMinutes,
    status: i === 0 ? ("unlocked" as const) : ("locked" as const),
  }));

  await db.insert(topics).values(topicRows);

  return NextResponse.json(
    { path: { ...newPath, paceWarning: generated.paceWarning } },
    { status: 201 }
  );
}
