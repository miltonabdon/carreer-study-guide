import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { learningGoals } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { updateGoalSchema } from "@/lib/validations/goals";
import { getRedisClient } from "@/lib/redis";

type RouteContext = { params: Promise<{ goalId: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { goalId } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const parsed = updateGoalSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.issues }, { status: 400 });
  }

  const { title, description, priority, targetDate, status } = parsed.data;

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (priority !== undefined) updateData.priority = priority;
  if (targetDate !== undefined) updateData.targetDate = targetDate;
  if (status !== undefined) updateData.status = status;

  const [updated] = await db
    .update(learningGoals)
    .set(updateData)
    .where(and(eq(learningGoals.id, goalId), eq(learningGoals.userId, session.user.id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  const today = new Date().toLocaleDateString("en-CA");
  const redis = getRedisClient();
  if (redis) await redis.del(`daily_plan:${session.user.id}:${today}`).catch(() => null);

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { goalId } = await params;

  const [archived] = await db
    .update(learningGoals)
    .set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(learningGoals.id, goalId), eq(learningGoals.userId, session.user.id)))
    .returning({ id: learningGoals.id });

  if (!archived) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  const today = new Date().toLocaleDateString("en-CA");
  const redis = getRedisClient();
  if (redis) await redis.del(`daily_plan:${session.user.id}:${today}`).catch(() => null);

  return new NextResponse(null, { status: 204 });
}
