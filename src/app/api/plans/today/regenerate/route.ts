import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dailyPlans } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateDailyPlan } from "@/lib/planner";
import { getRedisClient } from "@/lib/redis";

function getTodayString() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "UTC" });
}

function getMidnightTTL() {
  const now = new Date();
  const tomorrow = new Date(now.toLocaleDateString("en-CA", { timeZone: "UTC" }));
  tomorrow.setDate(tomorrow.getDate() + 1);
  return Math.max(60, Math.floor((tomorrow.getTime() - now.getTime()) / 1000));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  let availableMinutes: number;
  try {
    const body = await req.json();
    const parsed = Number(body.availableMinutes);
    if (!Number.isInteger(parsed) || parsed < 5 || parsed > 480) {
      return NextResponse.json({ error: "availableMinutes must be 5–480" }, { status: 400 });
    }
    availableMinutes = parsed;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const today = getTodayString();
  const cacheKey = `daily_plan:${userId}:${today}`;
  const redis = getRedisClient();

  // Delete existing plan for today (tasks cascade via FK)
  await db
    .delete(dailyPlans)
    .where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.planDate, today)));

  // Clear Redis cache
  if (redis) await redis.del(cacheKey).catch(() => null);

  // Generate new plan with the override
  const generated = await generateDailyPlan(userId, today, availableMinutes);
  const planData = { ...generated.plan, tasks: generated.tasks, completionPercent: 0 };

  // Cache the new plan
  if (redis) {
    const ttl = getMidnightTTL();
    await redis.setex(cacheKey, ttl, JSON.stringify(planData)).catch(() => null);
  }

  return NextResponse.json(planData);
}
