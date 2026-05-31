import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { db } from "@/lib/db";
import {
  users,
  studySessions,
  weeklyReports,
  careerTargets,
  topics,
} from "@/lib/db/schema";
import { eq, and, gte, desc, sql, inArray } from "drizzle-orm";
import { generateWeeklyInsight, WEEKLY_INSIGHT_FALLBACK } from "@/lib/ai/generate";
import { buildWeeklyReportEmail } from "@/lib/email/templates";

function getISOWeekId(date: Date): string {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}W${String(weekNo).padStart(2, "0")}`;
}

function getWeekBounds(date: Date): { start: string; end: string } {
  const d = new Date(date);
  const day = d.getUTCDay() || 7;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - day + 1);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  };
}

// Vercel cron sends GET with Authorization: Bearer <CRON_SECRET>
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const secret = authHeader?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const resend = resendKey ? new Resend(resendKey) : null;

  const now = new Date();
  const weekId = getISOWeekId(now);
  const { start: periodStart, end: periodEnd } = getWeekBounds(now);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  // Users with at least 1 session in the last 7 days
  const activeUserIds = await db
    .selectDistinct({ userId: studySessions.userId })
    .from(studySessions)
    .where(gte(studySessions.studiedAt, sevenDaysAgo));

  const userIds = activeUserIds.map((r) => r.userId);
  if (userIds.length === 0) {
    return NextResponse.json({ usersProcessed: 0, emailsSent: 0, emailsSkipped: 0, aiFailures: 0, errors: [] });
  }

  const allUsers = await db
    .select({ id: users.id, email: users.email, displayName: users.displayName, emailNotificationsEnabled: users.emailNotificationsEnabled })
    .from(users)
    .where(inArray(users.id, userIds));

  let usersProcessed = 0;
  let emailsSent = 0;
  let emailsSkipped = 0;
  let aiFailures = 0;
  const errors: string[] = [];

  for (const user of allUsers) {
    try {
      // Aggregate weekly metrics
      const [sessionMetrics] = await db
        .select({
          totalMinutes: sql<number>`coalesce(sum(${studySessions.durationMinutes}), 0)`.mapWith(Number),
          avgConfidence: sql<number>`round(avg(${studySessions.confidenceRating}), 1)`.mapWith(Number),
        })
        .from(studySessions)
        .where(and(eq(studySessions.userId, user.id), gte(studySessions.studiedAt, periodStart)));

      const [topicsMetrics] = await db
        .select({
          completed: sql<number>`count(distinct ${topics.id})`.mapWith(Number),
        })
        .from(studySessions)
        .innerJoin(topics, and(eq(studySessions.topicId, topics.id), inArray(topics.status, ["complete", "known"])))
        .where(and(eq(studySessions.userId, user.id), gte(studySessions.studiedAt, periodStart)));

      // Domain counts for top/weakest
      const domainRows = await db
        .select({
          domain: sql<string>`coalesce(${topics.domain}, 'Outros')`,
          sessionCount: sql<number>`count(*)`.mapWith(Number),
          avgConf: sql<number>`round(avg(${studySessions.confidenceRating}), 1)`.mapWith(Number),
        })
        .from(studySessions)
        .innerJoin(topics, eq(studySessions.topicId, topics.id))
        .where(and(eq(studySessions.userId, user.id), gte(studySessions.studiedAt, periodStart)))
        .groupBy(sql`coalesce(${topics.domain}, 'Outros')`);

      const sortedByCount = [...domainRows].sort((a, b) => b.sessionCount - a.sessionCount);
      const sortedByConf = [...domainRows].sort((a, b) => (a.avgConf ?? 5) - (b.avgConf ?? 5));
      const topDomain = sortedByCount[0]?.domain ?? null;
      const weakestDomain = sortedByConf[0]?.domain ?? null;

      // Streak (rough: count consecutive study days ending today)
      const studyDayRows = await db
        .selectDistinct({ day: studySessions.studiedAt })
        .from(studySessions)
        .where(and(eq(studySessions.userId, user.id), gte(studySessions.studiedAt, sevenDaysAgo)));
      const streakDays = studyDayRows.length;

      const topicsCompleted = topicsMetrics?.completed ?? 0;
      const studyHours = (sessionMetrics?.totalMinutes ?? 0) / 60;

      // Career target
      const [latestTarget] = await db
        .select({ description: careerTargets.description })
        .from(careerTargets)
        .where(eq(careerTargets.userId, user.id))
        .orderBy(desc(careerTargets.createdAt))
        .limit(1);

      // AI insight
      let aiInsight = WEEKLY_INSIGHT_FALLBACK;
      let fallbackUsed = false;
      try {
        aiInsight = await generateWeeklyInsight(latestTarget?.description ?? null, {
          topicsCompleted,
          studyHours,
          streakDays,
          topDomain,
          weakestDomain,
        });
      } catch {
        fallbackUsed = true;
        aiFailures++;
      }

      // Idempotent insert
      await db
        .insert(weeklyReports)
        .values({
          userId: user.id,
          weekId,
          periodStart,
          periodEnd,
          topicsCompleted,
          studyHours: parseFloat(studyHours.toFixed(1)),
          streakAtGeneration: streakDays,
          topDomain,
          weakestDomain,
          aiInsight,
          fallbackUsed,
        })
        .onConflictDoNothing();

      usersProcessed++;

      // Email delivery
      if (user.emailNotificationsEnabled && resend && fromEmail) {
        try {
          const { subject, html } = buildWeeklyReportEmail({
            displayName: user.displayName ?? user.email.split("@")[0],
            weekId,
            periodStart,
            periodEnd,
            topicsCompleted,
            studyHours: parseFloat(studyHours.toFixed(1)),
            streakDays,
            topDomain,
            weakestDomain,
            aiInsight,
            appUrl,
          });
          await resend.emails.send({ from: fromEmail, to: user.email, subject, html });
          emailsSent++;
        } catch {
          // email failure is non-critical
        }
      } else {
        emailsSkipped++;
      }
    } catch (err) {
      errors.push(`${user.id}: ${String(err)}`);
    }
  }

  return NextResponse.json({ usersProcessed, emailsSent, emailsSkipped, aiFailures, errors });
}
