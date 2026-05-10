import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dailyPlans, dailyPlanTasks, topics, learningPaths, learningGoals } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { generateDailyPlan } from "@/lib/planner";
import { getRedisClient } from "@/lib/redis";

function getTodayString(timezone = "UTC") {
  return new Date().toLocaleDateString("en-CA", { timeZone: timezone });
}

function getMidnightTTL(timezone = "UTC") {
  const now = new Date();
  const tomorrow = new Date(now.toLocaleDateString("en-CA", { timeZone: timezone }));
  tomorrow.setDate(tomorrow.getDate() + 1);
  return Math.max(60, Math.floor((tomorrow.getTime() - now.getTime()) / 1000));
}

async function getPlanWithTasks(planId: string) {
  const [plan] = await db
    .select()
    .from(dailyPlans)
    .where(eq(dailyPlans.id, planId))
    .limit(1);

  if (!plan) return null;

  const tasks = await db
    .select({
      id: dailyPlanTasks.id,
      planId: dailyPlanTasks.planId,
      topicId: dailyPlanTasks.topicId,
      taskType: dailyPlanTasks.taskType,
      suggestedMinutes: dailyPlanTasks.suggestedMinutes,
      orderIndex: dailyPlanTasks.orderIndex,
      status: dailyPlanTasks.status,
      completedAt: dailyPlanTasks.completedAt,
      topicTitle: topics.title,
      topicDescription: topics.description,
      topicStatus: topics.status,
      topicNextReviewAt: topics.nextReviewAt,
      goalTitle: learningGoals.title,
    })
    .from(dailyPlanTasks)
    .innerJoin(topics, eq(dailyPlanTasks.topicId, topics.id))
    .innerJoin(learningPaths, eq(topics.pathId, learningPaths.id))
    .innerJoin(learningGoals, eq(learningPaths.goalId, learningGoals.id))
    .where(eq(dailyPlanTasks.planId, planId))
    .orderBy(asc(dailyPlanTasks.orderIndex));

  const completed = tasks.filter((t) => t.status === "completed").length;
  const completionPercent = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

  return { ...plan, completionPercent, tasks };
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const today = getTodayString();
  const cacheKey = `daily_plan:${userId}:${today}`;

  const redis = getRedisClient();

  // Check Redis cache
  const cached = redis ? await redis.get(cacheKey).catch(() => null) : null;
  if (cached) {
    return NextResponse.json(JSON.parse(cached));
  }

  // Check DB for today's plan
  const [existing] = await db
    .select({ id: dailyPlans.id })
    .from(dailyPlans)
    .where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.planDate, today)))
    .limit(1);

  let planData;
  if (existing) {
    planData = await getPlanWithTasks(existing.id);
  } else {
    const generated = await generateDailyPlan(userId, today);
    planData = { ...generated.plan, tasks: generated.tasks, completionPercent: 0 };
  }

  if (planData && redis) {
    const ttl = getMidnightTTL();
    await redis.setex(cacheKey, ttl, JSON.stringify(planData)).catch(() => null);
  }

  return NextResponse.json(planData);
}
