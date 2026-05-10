import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { topics, learningPaths, learningGoals } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import { getRedisClient } from "@/lib/redis";

type RouteContext = { params: Promise<{ topicId: string }> };

const updateTopicSchema = z.object({
  status: z.enum(["skipped", "unlocked", "known"]).optional(),
  resourceUrl: z.string().url().nullable().optional(),
  notes: z.string().nullable().optional(),
  reviewBoost: z.boolean().optional(),
});

async function verifyTopicOwnership(topicId: string, userId: string) {
  const [topic] = await db
    .select({ id: topics.id, pathId: topics.pathId, status: topics.status })
    .from(topics)
    .where(eq(topics.id, topicId))
    .limit(1);

  if (!topic) return null;

  const [path] = await db
    .select({ goalId: learningPaths.goalId })
    .from(learningPaths)
    .where(eq(learningPaths.id, topic.pathId))
    .limit(1);

  if (!path) return null;

  const [goal] = await db
    .select({ userId: learningGoals.userId })
    .from(learningGoals)
    .where(eq(learningGoals.id, path.goalId))
    .limit(1);

  if (!goal || goal.userId !== userId) return null;

  return topic;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { topicId } = await params;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const parsed = updateTopicSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
  }

  const topic = await verifyTopicOwnership(topicId, session.user.id);
  if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });

  const { status, resourceUrl, notes, reviewBoost } = parsed.data;
  const now = new Date();

  const updateData: Record<string, unknown> = { updatedAt: now };
  if (status !== undefined) updateData.status = status;
  if (resourceUrl !== undefined) updateData.resourceUrl = resourceUrl;
  if (notes !== undefined) updateData.notes = notes;

  // "known" = already mastered; schedule a review in 7 days and unlock next topic
  if (status === "known") {
    const nextReviewAt = new Date(now);
    nextReviewAt.setDate(nextReviewAt.getDate() + 7);
    updateData.fsrsState = "Review";
    updateData.fsrsStability = 4;
    updateData.nextReviewAt = nextReviewAt;
    updateData.lastReviewedAt = now;
  }

  // "reviewBoost" = pull next review to tomorrow for complete/known topics
  if (reviewBoost === true && (topic.status === "complete" || topic.status === "known")) {
    const boostDate = new Date(now);
    boostDate.setDate(boostDate.getDate() + 1);
    updateData.nextReviewAt = boostDate;
    updateData.lastReviewedAt = now;
  }

  const [updated] = await db
    .update(topics)
    .set(updateData)
    .where(eq(topics.id, topicId))
    .returning();

  if (!updated) return NextResponse.json({ error: "Topic not found" }, { status: 404 });

  // Unlock next topic when marking as "known"
  if (status === "known") {
    const pathTopics = await db
      .select({ id: topics.id, status: topics.status })
      .from(topics)
      .where(eq(topics.pathId, topic.pathId))
      .orderBy(asc(topics.orderIndex));

    const currentIdx = pathTopics.findIndex((t) => t.id === topicId);
    if (currentIdx >= 0 && currentIdx + 1 < pathTopics.length) {
      const next = pathTopics[currentIdx + 1];
      if (next.status === "locked") {
        await db.update(topics).set({ status: "unlocked", updatedAt: now }).where(eq(topics.id, next.id));
      }
    }
  }

  // Invalidate Redis daily plan cache
  const today = new Date().toLocaleDateString("en-CA");
  const redis = getRedisClient();
  if (redis) await redis.del(`daily_plan:${session.user.id}:${today}`).catch(() => null);

  return NextResponse.json(updated);
}
