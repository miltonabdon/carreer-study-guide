import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { learningGoals, learningPaths, topics, users } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { generateLearningPath } from "@/lib/ai/generate";

type RouteContext = { params: Promise<{ goalId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
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

  let [path] = await db
    .select()
    .from(learningPaths)
    .where(and(eq(learningPaths.goalId, goalId), eq(learningPaths.status, "active")))
    .limit(1);

  // Auto-generate path if missing (e.g. previous creation failed mid-way)
  if (!path) {
    const [user] = await db
      .select({ dailyAvailableMinutes: users.dailyAvailableMinutes })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    const generated = await generateLearningPath(
      goal.title,
      goal.description,
      `Software architect with computer engineering and cloud/mobile postgrad background, interest in AI/ML`,
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
      resourceUrl: t.resourceUrl ?? null,
      articleUrl: t.articleUrl ?? null,
      explanation: t.explanation ?? null,
    }));

    await db.insert(topics).values(topicRows);
    path = newPath;
  }

  let topicList = await db
    .select()
    .from(topics)
    .where(eq(topics.pathId, path.id))
    .orderBy(asc(topics.orderIndex));

  // Repair any topics that should be unlocked but are still locked because
  // the predecessor was completed before the unlock-next logic was in place.
  const DONE_STATUSES = new Set(["complete", "in_progress", "known", "skipped"]);
  const toUnlock: string[] = [];
  for (let i = 1; i < topicList.length; i++) {
    const prev = topicList[i - 1];
    const curr = topicList[i];
    if (curr.status === "locked" && DONE_STATUSES.has(prev.status)) {
      toUnlock.push(curr.id);
    }
  }
  if (toUnlock.length > 0) {
    const now = new Date();
    await Promise.all(
      toUnlock.map((id) =>
        db.update(topics).set({ status: "unlocked", updatedAt: now }).where(eq(topics.id, id))
      )
    );
    // Re-fetch with repaired statuses
    topicList = await db
      .select()
      .from(topics)
      .where(eq(topics.pathId, path.id))
      .orderBy(asc(topics.orderIndex));
  }

  const totalTopics = topicList.length;
  const completedTopics = topicList.filter((t) => t.status === "complete").length;
  const completionPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return NextResponse.json({
    goal,
    path: { ...path, completionPercent, totalTopics, completedTopics },
    topics: topicList,
  });
}
