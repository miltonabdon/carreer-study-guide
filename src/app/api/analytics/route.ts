import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  topics,
  learningPaths,
  learningGoals,
  studySessions,
} from "@/lib/db/schema";
import { eq, and, isNull, inArray, sql } from "drizzle-orm";
import { inferTopicDomains } from "@/lib/ai/generate";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const { searchParams } = new URL(req.url);
  const goalId = searchParams.get("goalId");

  // ── Lazy domain inference ──────────────────────────────────────────────────
  try {
    const topicsNeedingDomain = await db
      .select({ id: topics.id, title: topics.title, description: topics.description })
      .from(topics)
      .innerJoin(learningPaths, eq(topics.pathId, learningPaths.id))
      .innerJoin(learningGoals, eq(learningPaths.goalId, learningGoals.id))
      .where(and(eq(learningGoals.userId, userId), isNull(topics.domain)))
      .limit(50);

    if (topicsNeedingDomain.length > 0) {
      const inferred = await inferTopicDomains(topicsNeedingDomain);
      await Promise.all(
        inferred.map((r) =>
          db.update(topics).set({ domain: r.domain }).where(eq(topics.id, r.id))
        )
      );
    }
  } catch {
    // silent — domain inference failure must not block analytics
  }

  // ── Build base topic filter ────────────────────────────────────────────────
  const pathFilter = goalId
    ? and(eq(learningGoals.userId, userId), eq(learningGoals.id, goalId))
    : eq(learningGoals.userId, userId);

  // ── 4 aggregation queries in parallel ─────────────────────────────────────
  const [weeklyRows, domainRows, confidenceRows, completionRows, nullDomainCount] =
    await Promise.all([
      // 1. Weekly velocity — last 8 weeks
      db
        .select({
          weekStart: sql<string>`to_char(date_trunc('week', ${studySessions.studiedAt}::date), 'YYYY-MM-DD')`,
          weekLabel: sql<string>`to_char(date_trunc('week', ${studySessions.studiedAt}::date), 'DD/MM')`,
          topicsCompleted: sql<number>`count(distinct case when ${topics.status} in ('complete','known') then ${topics.id} end)`.mapWith(Number),
          studyHours: sql<number>`round(sum(${studySessions.durationMinutes})::numeric / 60, 1)`.mapWith(Number),
        })
        .from(studySessions)
        .innerJoin(topics, eq(studySessions.topicId, topics.id))
        .innerJoin(learningPaths, eq(topics.pathId, learningPaths.id))
        .innerJoin(learningGoals, eq(learningPaths.goalId, learningGoals.id))
        .where(
          and(
            eq(studySessions.userId, userId),
            sql`${studySessions.studiedAt}::date >= current_date - interval '56 days'`,
            ...(goalId ? [eq(learningGoals.id, goalId)] : [])
          )
        )
        .groupBy(
          sql`date_trunc('week', ${studySessions.studiedAt}::date)`
        )
        .orderBy(sql`date_trunc('week', ${studySessions.studiedAt}::date)`),

      // 2. Domain coverage
      db
        .select({
          domain: sql<string>`coalesce(${topics.domain}, 'Outros')`,
          completedTopics: sql<number>`count(*) filter (where ${topics.status} in ('complete','known'))`.mapWith(Number),
          totalTopics: sql<number>`count(*)`.mapWith(Number),
          avgConfidence: sql<number>`round(avg(${studySessions.confidenceRating}), 1)`.mapWith(Number),
        })
        .from(topics)
        .innerJoin(learningPaths, eq(topics.pathId, learningPaths.id))
        .innerJoin(learningGoals, eq(learningPaths.goalId, learningGoals.id))
        .leftJoin(studySessions, eq(studySessions.topicId, topics.id))
        .where(pathFilter)
        .groupBy(sql`coalesce(${topics.domain}, 'Outros')`),

      // 3. Confidence trends per goal — last 8 weeks
      db
        .select({
          goalId: learningGoals.id,
          goalTitle: learningGoals.title,
          weekLabel: sql<string>`to_char(date_trunc('week', ${studySessions.studiedAt}::date), 'DD/MM')`,
          avgConfidence: sql<number>`round(avg(${studySessions.confidenceRating}), 1)`.mapWith(Number),
        })
        .from(studySessions)
        .innerJoin(topics, eq(studySessions.topicId, topics.id))
        .innerJoin(learningPaths, eq(topics.pathId, learningPaths.id))
        .innerJoin(learningGoals, eq(learningPaths.goalId, learningGoals.id))
        .where(
          and(
            eq(studySessions.userId, userId),
            sql`${studySessions.studiedAt}::date >= current_date - interval '56 days'`,
            ...(goalId ? [eq(learningGoals.id, goalId)] : [])
          )
        )
        .groupBy(
          learningGoals.id,
          learningGoals.title,
          sql`date_trunc('week', ${studySessions.studiedAt}::date)`
        )
        .orderBy(
          learningGoals.id,
          sql`date_trunc('week', ${studySessions.studiedAt}::date)`
        ),

      // 4. Projected completion dates per active goal
      db
        .select({
          goalId: learningGoals.id,
          goalTitle: learningGoals.title,
          targetDate: learningGoals.targetDate,
          totalTopics: sql<number>`count(${topics.id})`.mapWith(Number),
          completedTopics: sql<number>`count(*) filter (where ${topics.status} in ('complete','known'))`.mapWith(Number),
          remainingMinutes: sql<number>`coalesce(sum(${topics.estimatedMinutes}) filter (where ${topics.status} not in ('complete','known','skipped')), 0)`.mapWith(Number),
        })
        .from(learningGoals)
        .innerJoin(learningPaths, and(eq(learningPaths.goalId, learningGoals.id), eq(learningPaths.status, "active")))
        .innerJoin(topics, eq(topics.pathId, learningPaths.id))
        .where(
          and(
            eq(learningGoals.userId, userId),
            eq(learningGoals.status, "active"),
            ...(goalId ? [eq(learningGoals.id, goalId)] : [])
          )
        )
        .groupBy(learningGoals.id, learningGoals.title, learningGoals.targetDate),

      // 5. Count topics still lacking domain (for domainInferenceInProgress flag)
      db
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(topics)
        .innerJoin(learningPaths, eq(topics.pathId, learningPaths.id))
        .innerJoin(learningGoals, eq(learningPaths.goalId, learningGoals.id))
        .where(and(eq(learningGoals.userId, userId), isNull(topics.domain))),
    ]);

  // ── Retention health ───────────────────────────────────────────────────────
  const allConfidenceRows = await db
    .select({ confidence: studySessions.confidenceRating })
    .from(studySessions)
    .innerJoin(topics, eq(studySessions.topicId, topics.id))
    .innerJoin(learningPaths, eq(topics.pathId, learningPaths.id))
    .innerJoin(learningGoals, eq(learningPaths.goalId, learningGoals.id))
    .where(and(eq(studySessions.userId, userId), ...(goalId ? [eq(learningGoals.id, goalId)] : [])));

  const total = allConfidenceRows.length;
  const strong = allConfidenceRows.filter((r) => r.confidence >= 4).length;
  const weak = allConfidenceRows.filter((r) => r.confidence <= 2).length;
  const retentionHealth = {
    strong,
    weak,
    total,
    strongPercent: total > 0 ? Math.round((strong / total) * 100) : 0,
  };

  // ── Domain isGap: domain covered by < 2 completed topics ──────────────────
  const domainCoverage = domainRows.map((d) => ({
    ...d,
    isGap: d.completedTopics < 2,
  }));

  return NextResponse.json({
    weeklyVelocity: weeklyRows,
    domainCoverage,
    confidenceTrends: confidenceRows,
    projectedCompletion: completionRows,
    retentionHealth,
    domainInferenceInProgress: (nullDomainCount[0]?.count ?? 0) > 0,
  });
}
