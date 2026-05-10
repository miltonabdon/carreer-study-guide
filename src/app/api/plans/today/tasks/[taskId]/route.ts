import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  dailyPlanTasks,
  dailyPlans,
  topics,
  studySessions,
} from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { completeTaskSchema } from "@/lib/validations/plans";
import { reviewCard } from "@/lib/spaced-repetition/fsrs";
import type { FsrsCard, Rating } from "@/lib/spaced-repetition/types";
import { getRedisClient } from "@/lib/redis";

type RouteContext = { params: Promise<{ taskId: string }> };

function getTodayString() {
  return new Date().toLocaleDateString("en-CA");
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { taskId } = await params;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const parsed = completeTaskSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
  }

  const { status, durationMinutes, confidenceRating, notes } = parsed.data;

  // Verify task belongs to user's today plan
  const [task] = await db
    .select({
      id: dailyPlanTasks.id,
      planId: dailyPlanTasks.planId,
      topicId: dailyPlanTasks.topicId,
      taskType: dailyPlanTasks.taskType,
      status: dailyPlanTasks.status,
    })
    .from(dailyPlanTasks)
    .where(eq(dailyPlanTasks.id, taskId))
    .limit(1);

  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const [plan] = await db
    .select({ userId: dailyPlans.userId, planDate: dailyPlans.planDate })
    .from(dailyPlans)
    .where(eq(dailyPlans.id, task.planId))
    .limit(1);

  if (!plan || plan.userId !== session.user.id) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (task.status !== "pending") {
    return NextResponse.json({ error: "Task already completed" }, { status: 409 });
  }

  const [topic] = await db
    .select()
    .from(topics)
    .where(eq(topics.id, task.topicId))
    .limit(1);

  if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });

  const now = new Date();

  await db.transaction(async (tx) => {
    // Update task status
    await tx
      .update(dailyPlanTasks)
      .set({ status, completedAt: now })
      .where(eq(dailyPlanTasks.id, taskId));

    const uid = session?.user?.id;
    if (status === "completed" && durationMinutes && confidenceRating && uid) {
      // Write study session
      await tx.insert(studySessions).values({
        userId: uid,
        topicId: task.topicId,
        sessionType: task.taskType,
        studiedAt: plan.planDate,
        durationMinutes,
        confidenceRating,
        notes: notes ?? null,
      });

      // Update topic FSRS
      const card: FsrsCard = {
        state: topic.fsrsState,
        stability: topic.fsrsStability ?? 0.5,
        difficulty: topic.fsrsDifficulty ?? 5,
        retrievability: topic.fsrsRetrievability ?? 1,
        lapses: topic.fsrsLapses,
        nextReviewAt: topic.nextReviewAt ?? now,
        lastReviewedAt: topic.lastReviewedAt,
      };

      const rating = Math.max(1, Math.min(5, confidenceRating)) as Rating;
      const { newCard } = reviewCard(card, rating, now);

      // Determine new topic status
      let newTopicStatus: typeof topic.status = "complete";
      if (newCard.state === "Relearning" || newCard.state === "Learning") {
        newTopicStatus = "in_progress";
      }

      await tx
        .update(topics)
        .set({
          status: newTopicStatus,
          fsrsState: newCard.state,
          fsrsStability: newCard.stability,
          fsrsDifficulty: newCard.difficulty,
          fsrsRetrievability: newCard.retrievability,
          fsrsLapses: newCard.lapses,
          nextReviewAt: newCard.nextReviewAt,
          lastReviewedAt: newCard.lastReviewedAt,
          updatedAt: now,
        })
        .where(eq(topics.id, task.topicId));

      // Unlock next topic in path if this one is now complete
      if (newTopicStatus === "complete") {
        const nextTopics = await tx
          .select({ id: topics.id, status: topics.status })
          .from(topics)
          .where(eq(topics.pathId, topic.pathId))
          .orderBy(asc(topics.orderIndex));

        const currentIdx = nextTopics.findIndex((t) => t.id === task.topicId);
        if (currentIdx >= 0 && currentIdx + 1 < nextTopics.length) {
          const next = nextTopics[currentIdx + 1];
          if (next.status === "locked") {
            await tx
              .update(topics)
              .set({ status: "unlocked", updatedAt: now })
              .where(eq(topics.id, next.id));
          }
        }
      }
    }
  });

  // Invalidate Redis cache
  const today = getTodayString();
  const redis = getRedisClient();
  if (redis) await redis.del(`daily_plan:${session.user.id}:${today}`).catch(() => null);

  return NextResponse.json({ success: true });
}
