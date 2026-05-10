import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { topics, learningPaths, learningGoals } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

type RouteContext = { params: Promise<{ topicId: string }> };

const updateTopicSchema = z.object({
  status: z.enum(["skipped", "unlocked"]).optional(),
  resourceUrl: z.string().url().nullable().optional(),
  notes: z.string().nullable().optional(),
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

  const { status, resourceUrl, notes } = parsed.data;

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (status !== undefined) updateData.status = status;
  if (resourceUrl !== undefined) updateData.resourceUrl = resourceUrl;
  if (notes !== undefined) updateData.notes = notes;

  const [updated] = await db
    .update(topics)
    .set(updateData)
    .where(eq(topics.id, topicId))
    .returning();

  return NextResponse.json(updated);
}
