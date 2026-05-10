import { db } from "@/lib/db";
import {
  learningGoals,
  learningPaths,
  topics,
  dailyPlans,
  dailyPlanTasks,
  users,
} from "@/lib/db/schema";
import { eq, and, asc, desc, sql } from "drizzle-orm";
import { generateDailyPlanWithAI } from "@/lib/ai/generate";

export async function generateDailyPlan(
  userId: string,
  today: string,
  availableMinutesOverride?: number
) {
  // Fetch user
  const [user] = await db
    .select({ dailyAvailableMinutes: users.dailyAvailableMinutes })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) throw new Error("User not found");

  const availableMinutes = availableMinutesOverride ?? user.dailyAvailableMinutes;
  const now = new Date();

  // Get active goals with their active paths
  const activeGoals = await db
    .select({
      id: learningGoals.id,
      title: learningGoals.title,
      priority: learningGoals.priority,
      targetDate: learningGoals.targetDate,
    })
    .from(learningGoals)
    .where(and(eq(learningGoals.userId, userId), eq(learningGoals.status, "active")));

  const dueReviews: Array<{
    topicId: string;
    topicTitle: string;
    goalTitle: string;
    goalPriority: "high" | "medium" | "low";
    daysOverdue: number;
    estimatedMinutes: number;
  }> = [];

  const newLearningCandidates: Array<{
    topicId: string;
    topicTitle: string;
    goalTitle: string;
    goalPriority: "high" | "medium" | "low";
    estimatedMinutes: number;
    targetDateDaysLeft?: number;
  }> = [];

  for (const goal of activeGoals) {
    const [path] = await db
      .select({ id: learningPaths.id })
      .from(learningPaths)
      .where(and(eq(learningPaths.goalId, goal.id), eq(learningPaths.status, "active")))
      .limit(1);

    if (!path) continue;

    // Due reviews: complete topics past next_review_at
    const overdueTopics = await db
      .select({
        id: topics.id,
        title: topics.title,
        estimatedMinutes: topics.estimatedMinutes,
        nextReviewAt: topics.nextReviewAt,
      })
      .from(topics)
      .where(
        and(
          eq(topics.pathId, path.id),
          eq(topics.status, "complete"),
          sql`${topics.nextReviewAt} <= ${now.toISOString()}::timestamptz`
        )
      );

    for (const t of overdueTopics) {
      const daysOverdue = t.nextReviewAt
        ? Math.floor((now.getTime() - t.nextReviewAt.getTime()) / 86400000)
        : 0;
      dueReviews.push({
        topicId: t.id,
        topicTitle: t.title,
        goalTitle: goal.title,
        goalPriority: goal.priority,
        daysOverdue,
        estimatedMinutes: t.estimatedMinutes,
      });
    }

    // New learning: unlocked or in_progress topics
    const availableTopics = await db
      .select({
        id: topics.id,
        title: topics.title,
        estimatedMinutes: topics.estimatedMinutes,
      })
      .from(topics)
      .where(
        and(
          eq(topics.pathId, path.id),
          sql`status IN ('unlocked', 'in_progress')`
        )
      )
      .orderBy(asc(topics.orderIndex))
      .limit(3);

    const targetDateDaysLeft = goal.targetDate
      ? Math.ceil((new Date(goal.targetDate).getTime() - now.getTime()) / 86400000)
      : undefined;

    for (const t of availableTopics) {
      newLearningCandidates.push({
        topicId: t.id,
        topicTitle: t.title,
        goalTitle: goal.title,
        goalPriority: goal.priority,
        estimatedMinutes: t.estimatedMinutes,
        targetDateDaysLeft,
      });
    }
  }

  // Detect missed days gap
  const [lastPlan] = await db
    .select({ planDate: dailyPlans.planDate })
    .from(dailyPlans)
    .where(eq(dailyPlans.userId, userId))
    .orderBy(desc(dailyPlans.planDate))
    .limit(1);

  let gapDays: number | null = null;
  let gapResolved = true;
  if (lastPlan) {
    const lastDate = new Date(lastPlan.planDate + "T12:00:00");
    const todayDate = new Date(today + "T12:00:00");
    const diffDays = Math.round((todayDate.getTime() - lastDate.getTime()) / 86400000) - 1;
    if (diffDays >= 2) {
      gapDays = diffDays;
      gapResolved = false;
    }
  }

  if (dueReviews.length === 0 && newLearningCandidates.length === 0) {
    const [plan] = await db
      .insert(dailyPlans)
      .values({
        userId,
        planDate: today,
        availableMinutes,
        aiRationale: "No topics available yet. Create a goal to get started.",
        gapDays,
        gapResolved,
      })
      .returning();
    return { plan, tasks: [], fallbackUsed: false };
  }

  const generated = await generateDailyPlanWithAI(
    availableMinutes,
    dueReviews,
    newLearningCandidates
  );

  const [plan] = await db
    .insert(dailyPlans)
    .values({
      userId,
      planDate: today,
      availableMinutes,
      aiRationale: generated.aiRationale,
      gapDays,
      gapResolved,
    })
    .returning();

  if (generated.tasks.length > 0) {
    const taskRows = generated.tasks.map((t, i) => ({
      planId: plan.id,
      topicId: t.topicId,
      taskType: t.taskType,
      suggestedMinutes: t.suggestedMinutes,
      orderIndex: i,
    }));
    await db.insert(dailyPlanTasks).values(taskRows);
  }

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
    .where(eq(dailyPlanTasks.planId, plan.id))
    .orderBy(asc(dailyPlanTasks.orderIndex));

  return { plan, tasks, fallbackUsed: generated.fallbackUsed };
}
