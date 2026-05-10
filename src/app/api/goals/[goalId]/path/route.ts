import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { learningGoals, learningPaths, topics } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";

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

  const [path] = await db
    .select()
    .from(learningPaths)
    .where(and(eq(learningPaths.goalId, goalId), eq(learningPaths.status, "active")))
    .limit(1);

  if (!path) return NextResponse.json({ error: "No active learning path" }, { status: 404 });

  const topicList = await db
    .select()
    .from(topics)
    .where(eq(topics.pathId, path.id))
    .orderBy(asc(topics.orderIndex));

  const totalTopics = topicList.length;
  const completedTopics = topicList.filter((t) => t.status === "complete").length;
  const completionPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return NextResponse.json({
    goal,
    path: { ...path, completionPercent, totalTopics, completedTopics },
    topics: topicList,
  });
}
