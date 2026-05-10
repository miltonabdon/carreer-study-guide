import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { users, dailyPlans, dailyPlanTasks, topics, learningPaths, learningGoals } from "@/lib/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { generateDailyPlan } from "@/lib/planner";
import { buildDailyDigestEmail } from "@/lib/email/templates";

function getTodayString() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "UTC" });
}

// Vercel Cron sends GET with Authorization: Bearer <CRON_SECRET>
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = authHeader?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  if (!resendKey || !fromEmail) {
    return NextResponse.json({ error: "RESEND_API_KEY or RESEND_FROM_EMAIL not configured" }, { status: 500 });
  }

  const resend = new Resend(resendKey);
  const today = getTodayString();

  // Get all active users with email notifications enabled (all users for now)
  const allUsers = await db
    .select({ id: users.id, email: users.email, displayName: users.displayName })
    .from(users);

  const results: { userId: string; status: "sent" | "skipped" | "error"; reason?: string }[] = [];

  for (const user of allUsers) {
    try {
      // Get or generate today's plan
      let plan = await db
        .select({ id: dailyPlans.id, availableMinutes: dailyPlans.availableMinutes, planDate: dailyPlans.planDate })
        .from(dailyPlans)
        .where(and(eq(dailyPlans.userId, user.id), eq(dailyPlans.planDate, today)))
        .limit(1)
        .then((r) => r[0] ?? null);

      if (!plan) {
        const generated = await generateDailyPlan(user.id, today);
        plan = { id: generated.plan.id, availableMinutes: generated.plan.availableMinutes, planDate: generated.plan.planDate };
      }

      const tasks = await db
        .select({
          topicTitle: topics.title,
          goalTitle: learningGoals.title,
          taskType: dailyPlanTasks.taskType,
          suggestedMinutes: dailyPlanTasks.suggestedMinutes,
        })
        .from(dailyPlanTasks)
        .innerJoin(topics, eq(dailyPlanTasks.topicId, topics.id))
        .innerJoin(learningPaths, eq(topics.pathId, learningPaths.id))
        .innerJoin(learningGoals, eq(learningPaths.goalId, learningGoals.id))
        .where(and(eq(dailyPlanTasks.planId, plan.id), eq(dailyPlanTasks.status, "pending")))
        .orderBy(asc(dailyPlanTasks.orderIndex));

      const { subject, html } = buildDailyDigestEmail({
        displayName: user.displayName ?? user.email.split("@")[0],
        planDate: plan.planDate,
        availableMinutes: plan.availableMinutes,
        tasks,
        appUrl,
      });

      await resend.emails.send({ from: fromEmail, to: user.email, subject, html });
      results.push({ userId: user.id, status: "sent" });
    } catch (err) {
      results.push({ userId: user.id, status: "error", reason: String(err) });
    }
  }

  return NextResponse.json({ date: today, results });
}
