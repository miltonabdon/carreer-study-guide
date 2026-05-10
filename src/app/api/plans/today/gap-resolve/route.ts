import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { dailyPlans, dailyPlanTasks } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const bodySchema = z.object({
  choice: z.enum(["recover", "resume"]),
});

function getTodayString() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "UTC" });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid choice" }, { status: 400 });
  }

  const { choice } = parsed.data;
  const userId = session.user.id;
  const today = getTodayString();

  const [plan] = await db
    .select()
    .from(dailyPlans)
    .where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.planDate, today)))
    .limit(1);

  if (!plan) {
    return NextResponse.json({ error: "No plan for today" }, { status: 404 });
  }

  if (choice === "recover" && plan.gapDays && plan.gapDays >= 2) {
    const pendingTasks = await db
      .select()
      .from(dailyPlanTasks)
      .where(and(eq(dailyPlanTasks.planId, plan.id), eq(dailyPlanTasks.status, "pending")));

    if (pendingTasks.length > 0 && plan.gapDays > 0) {
      const tasksPerDay = Math.ceil(pendingTasks.length / plan.gapDays);
      for (let day = 1; day <= plan.gapDays; day++) {
        const slice = pendingTasks.slice((day - 1) * tasksPerDay, day * tasksPerDay);
        if (slice.length === 0) continue;

        const recoveryDate = new Date(today + "T12:00:00");
        recoveryDate.setDate(recoveryDate.getDate() + day);
        const recoveryDateStr = recoveryDate.toLocaleDateString("en-CA", { timeZone: "UTC" });

        const [recoveryPlan] = await db
          .insert(dailyPlans)
          .values({
            userId,
            planDate: recoveryDateStr,
            availableMinutes: plan.availableMinutes,
            aiRationale: `Recuperação de conteúdo — dia ${day} de ${plan.gapDays}`,
            gapDays: null,
            gapResolved: true,
          })
          .returning();

        await db.insert(dailyPlanTasks).values(
          slice.map((t, i) => ({
            planId: recoveryPlan.id,
            topicId: t.topicId,
            taskType: t.taskType,
            suggestedMinutes: t.suggestedMinutes,
            orderIndex: i,
          }))
        );
      }
    }
  }

  const [updated] = await db
    .update(dailyPlans)
    .set({ gapResolved: true })
    .where(eq(dailyPlans.id, plan.id))
    .returning();

  return NextResponse.json(updated);
}
