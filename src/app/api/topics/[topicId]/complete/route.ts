import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { topics, learningPaths, learningGoals, studySessions } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import { reviewCard } from "@/lib/spaced-repetition/fsrs";
import type { FsrsCard, Rating } from "@/lib/spaced-repetition/types";
import { getRedisClient } from "@/lib/redis";

type RouteContext = { params: Promise<{ topicId: string }> };

const completeTopicSchema = z.object({
  durationMinutes: z.number().int().min(1).max(480),
  confidenceRating: z.number().int().min(1).max(5),
  notes: z.string().nullable().optional(),
});

async function verifyTopicOwnership(topicId: string, userId: string) {
  const [topic] = await db
    .select()
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

export async function POST(request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { topicId } = await params;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const parsed = completeTopicSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
  }

  const { durationMinutes, confidenceRating, notes } = parsed.data;

  const topic = await verifyTopicOwnership(topicId, session.user.id);
  if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });

  if (topic.status === "locked") {
    return NextResponse.json({ error: "Topic is locked" }, { status: 400 });
  }

  const now = new Date();
  const today = new Date().toLocaleDateString("en-CA");
  const userId = session.user.id;

  await db.transaction(async (tx) => {
    await tx.insert(studySessions).values({
      userId,
      topicId,
      sessionType: "new_learning",
      studiedAt: today,
      durationMinutes,
      confidenceRating,
      notes: notes ?? null,
    });

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

    // Explicit "Concluir" always marks the topic complete and unlocks the next.
    // FSRS state drives the review schedule; it does not gate topic completion here.
    await tx
      .update(topics)
      .set({
        status: "complete",
        fsrsState: newCard.state,
        fsrsStability: newCard.stability,
        fsrsDifficulty: newCard.difficulty,
        fsrsRetrievability: newCard.retrievability,
        fsrsLapses: newCard.lapses,
        nextReviewAt: newCard.nextReviewAt,
        lastReviewedAt: newCard.lastReviewedAt,
        updatedAt: now,
      })
      .where(eq(topics.id, topicId));

    {
      const pathTopics = await tx
        .select({ id: topics.id, status: topics.status })
        .from(topics)
        .where(eq(topics.pathId, topic.pathId))
        .orderBy(asc(topics.orderIndex));

      const currentIdx = pathTopics.findIndex((t) => t.id === topicId);
      if (currentIdx >= 0 && currentIdx + 1 < pathTopics.length) {
        const next = pathTopics[currentIdx + 1];
        if (next.status === "locked") {
          await tx
            .update(topics)
            .set({ status: "unlocked", updatedAt: now })
            .where(eq(topics.id, next.id));
        }
      }
    }
  });

  const redis = getRedisClient();
  if (redis) await redis.del(`daily_plan:${userId}:${today}`).catch(() => null);

  return NextResponse.json({ success: true });
}
