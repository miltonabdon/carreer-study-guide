import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { skillGapReports, learningGoals, learningPaths, topics, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateLearningPath } from "@/lib/ai/generate";

type RouteContext = { params: Promise<{ reportId: string }> };

export async function POST(req: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { reportId } = await params;
  const userId = session.user.id;

  const [report] = await db
    .select()
    .from(skillGapReports)
    .where(and(eq(skillGapReports.id, reportId), eq(skillGapReports.userId, userId)))
    .limit(1);

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  let body: { goalIndex?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const goalIndex = typeof body.goalIndex === "number" ? body.goalIndex : -1;
  const suggestedGoals = report.suggestedGoals as Array<{ title: string; rationale: string }>;

  if (goalIndex < 0 || goalIndex >= suggestedGoals.length) {
    return NextResponse.json(
      { error: `goalIndex out of range (0–${suggestedGoals.length - 1})` },
      { status: 422 }
    );
  }

  const suggestion = suggestedGoals[goalIndex];

  const [user] = await db
    .select({ displayName: users.displayName, dailyAvailableMinutes: users.dailyAvailableMinutes })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  try {
    const generated = await generateLearningPath(
      suggestion.title,
      suggestion.rationale,
      "Software architect with focus on AI/ML",
      user.dailyAvailableMinutes
    );

    const { goal, path } = await db.transaction(async (tx) => {
      const [goal] = await tx
        .insert(learningGoals)
        .values({
          userId,
          title: suggestion.title,
          description: suggestion.rationale,
          priority: "medium",
        })
        .returning();

      const [path] = await tx
        .insert(learningPaths)
        .values({
          goalId: goal.id,
          totalEstimatedMinutes: generated.totalEstimatedMinutes,
          completionWeeksEstimate: generated.completionWeeksEstimate,
        })
        .returning();

      const cappedTopics = generated.topics.slice(0, 30);
      const topicRows = cappedTopics.map((t, i) => ({
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
      { ...goal, path: { ...path, fallbackUsed: generated.fallbackUsed } },
      { status: 201 }
    );
  } catch (err) {
    console.error("[create-goal from suggestion]", err);
    return NextResponse.json(
      { error: "Não foi possível criar a meta — tente novamente em breve" },
      { status: 500 }
    );
  }
}
