import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  learningGoals,
  learningPaths,
  topics,
  studySessions,
  dailyPlans,
  dailyPlanTasks,
} from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const goals = await db
    .select()
    .from(learningGoals)
    .where(eq(learningGoals.userId, userId));

  const goalsWithPaths = await Promise.all(
    goals.map(async (goal) => {
      const pathRows = await db
        .select()
        .from(learningPaths)
        .where(eq(learningPaths.goalId, goal.id));

      const pathsWithTopics = await Promise.all(
        pathRows.map(async (path) => {
          const topicRows = await db
            .select()
            .from(topics)
            .where(eq(topics.pathId, path.id));
          return { ...path, topics: topicRows };
        })
      );

      return { ...goal, paths: pathsWithTopics };
    })
  );

  const sessions = await db
    .select()
    .from(studySessions)
    .where(eq(studySessions.userId, userId));

  const plans = await db
    .select()
    .from(dailyPlans)
    .where(eq(dailyPlans.userId, userId));

  const plansWithTasks = await Promise.all(
    plans.map(async (plan) => {
      const taskRows = await db
        .select()
        .from(dailyPlanTasks)
        .where(eq(dailyPlanTasks.planId, plan.id));
      return { ...plan, tasks: taskRows };
    })
  );

  const exportData = {
    exportedAt: new Date().toISOString(),
    userId,
    goals: goalsWithPaths,
    studySessions: sessions,
    dailyPlans: plansWithTasks,
  };

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="studyguide-export-${date}.json"`,
    },
  });
}
