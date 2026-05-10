import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { studySessions, learningGoals, learningPaths, topics, users } from "@/lib/db/schema";
import { eq, and, gte, count, sql, sum } from "drizzle-orm";
import { calculateRisk } from "@/lib/planner/risk";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [user] = await db
    .select({ dailyAvailableMinutes: users.dailyAvailableMinutes })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  // 90-day activity
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const fromDate = ninetyDaysAgo.toISOString().split("T")[0];

  const activityRows = await db
    .select({
      date: studySessions.studiedAt,
      sessionCount: count(),
      totalMinutes: sum(studySessions.durationMinutes).mapWith(Number),
    })
    .from(studySessions)
    .where(and(eq(studySessions.userId, userId), gte(studySessions.studiedAt, fromDate)))
    .groupBy(studySessions.studiedAt);

  const weeklyActivity = activityRows.map((r) => ({
    date: r.date,
    sessionCount: r.sessionCount,
    totalMinutes: r.totalMinutes ?? 0,
  }));

  // Streak calculation
  const allDates = activityRows.map((r) => r.date).sort().reverse();
  let currentStreak = 0;
  let longestStreak = 0;
  let streak = 0;
  const today = new Date().toISOString().split("T")[0];

  if (allDates.length > 0) {
    let checkDate = today;
    for (const date of allDates) {
      if (date === checkDate) {
        currentStreak++;
        const prev = new Date(checkDate);
        prev.setDate(prev.getDate() - 1);
        checkDate = prev.toISOString().split("T")[0];
      } else {
        break;
      }
    }

    // Longest streak (brute force over sorted dates)
    const sortedAsc = [...allDates].reverse();
    streak = 1;
    longestStreak = 1;
    for (let i = 1; i < sortedAsc.length; i++) {
      const prev = new Date(sortedAsc[i - 1]);
      prev.setDate(prev.getDate() + 1);
      if (prev.toISOString().split("T")[0] === sortedAsc[i]) {
        streak++;
        longestStreak = Math.max(longestStreak, streak);
      } else {
        streak = 1;
      }
    }
  }

  const lastStudyDate = allDates[0] ?? null;

  // Overall totals
  const [totals] = await db
    .select({
      totalTopicsStudied: sql<number>`count(distinct topic_id)`.mapWith(Number),
      totalStudyMinutes: sum(studySessions.durationMinutes).mapWith(Number),
    })
    .from(studySessions)
    .where(eq(studySessions.userId, userId));

  // Overdue reviews
  const nowIso = new Date().toISOString();
  const overdueRows = await db
    .select({ id: topics.id })
    .from(topics)
    .innerJoin(learningPaths, eq(topics.pathId, learningPaths.id))
    .innerJoin(learningGoals, eq(learningPaths.goalId, learningGoals.id))
    .where(
      and(
        eq(learningGoals.userId, userId),
        eq(topics.status, "complete"),
        sql`${topics.nextReviewAt} <= ${nowIso}::timestamptz`
      )
    );

  const overdueReviews = overdueRows.length;

  // Per-goal progress
  const activeGoals = await db
    .select({
      id: learningGoals.id,
      title: learningGoals.title,
      priority: learningGoals.priority,
      targetDate: learningGoals.targetDate,
      status: learningGoals.status,
    })
    .from(learningGoals)
    .where(and(eq(learningGoals.userId, userId), eq(learningGoals.status, "active")));

  const goalProgress = await Promise.all(
    activeGoals.map(async (goal) => {
      const [path] = await db
        .select({ id: learningPaths.id })
        .from(learningPaths)
        .where(and(eq(learningPaths.goalId, goal.id), eq(learningPaths.status, "active")))
        .limit(1);

      if (!path) return { ...goal, completionPercent: 0, totalTopics: 0, completedTopics: 0, atRisk: false, estimatedCompletionDate: null };

      const [t] = await db
        .select({
          total: count(),
          completed: sql<number>`count(*) filter (where status = 'complete')`.mapWith(Number),
          remainingMinutes: sql<number>`coalesce(sum(estimated_minutes) filter (where status != 'complete' and status != 'skipped'), 0)`.mapWith(Number),
        })
        .from(topics)
        .where(eq(topics.pathId, path.id));

      const total = t?.total ?? 0;
      const completed = t?.completed ?? 0;
      const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
      const { atRisk, estimatedCompletionDate } = calculateRisk({
        completedTopics: completed,
        totalTopics: total,
        targetDate: goal.targetDate,
        dailyAvailableMinutes: user?.dailyAvailableMinutes ?? 60,
        remainingMinutes: t?.remainingMinutes ?? 0,
      });

      return { ...goal, completionPercent, totalTopics: total, completedTopics: completed, atRisk, estimatedCompletionDate };
    })
  );

  return NextResponse.json({
    streaks: {
      current: currentStreak,
      longest: longestStreak,
      lastStudyDate,
    },
    weeklyActivity,
    goalProgress,
    overdueReviews,
    totalTopicsStudied: totals?.totalTopicsStudied ?? 0,
    totalStudyMinutes: totals?.totalStudyMinutes ?? 0,
  });
}
