import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  careerTargets,
  skillGapReports,
  topics,
  learningPaths,
  learningGoals,
} from "@/lib/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { generateGapAnalysis } from "@/lib/ai/generate";

const STALE_THRESHOLD = 10;

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const reports = await db
    .select()
    .from(skillGapReports)
    .where(eq(skillGapReports.userId, userId))
    .orderBy(desc(skillGapReports.generatedAt));

  const completedTopics = await db
    .select({ id: topics.id })
    .from(topics)
    .innerJoin(learningPaths, eq(topics.pathId, learningPaths.id))
    .innerJoin(learningGoals, eq(learningPaths.goalId, learningGoals.id))
    .where(
      and(
        eq(learningGoals.userId, userId),
        inArray(topics.status, ["complete", "known"])
      )
    );

  const currentTopicsCount = completedTopics.length;
  const stalePrompt =
    reports.length > 0 &&
    currentTopicsCount - reports[0].topicsCountAtGeneration >= STALE_THRESHOLD;

  return NextResponse.json({ reports, stalePrompt, currentTopicsCount });
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const [latestTarget] = await db
    .select()
    .from(careerTargets)
    .where(eq(careerTargets.userId, userId))
    .orderBy(desc(careerTargets.createdAt))
    .limit(1);

  if (!latestTarget) {
    return NextResponse.json(
      { error: "Defina seu objetivo de carreira antes de solicitar análise" },
      { status: 422 }
    );
  }

  const completedTopicRows = await db
    .select({ title: topics.title, description: topics.description })
    .from(topics)
    .innerJoin(learningPaths, eq(topics.pathId, learningPaths.id))
    .innerJoin(learningGoals, eq(learningPaths.goalId, learningGoals.id))
    .where(
      and(
        eq(learningGoals.userId, userId),
        inArray(topics.status, ["complete", "known"])
      )
    );

  let analysisResult;
  try {
    analysisResult = await generateGapAnalysis(latestTarget.description, completedTopicRows);
  } catch {
    return NextResponse.json(
      { error: "Análise temporariamente indisponível — tente novamente em breve" },
      { status: 503 }
    );
  }

  const [inserted] = await db
    .insert(skillGapReports)
    .values({
      userId,
      careerTargetId: latestTarget.id,
      careerTargetSnapshot: latestTarget.description,
      coveredSkills: analysisResult.coveredSkills,
      missingSkills: analysisResult.missingSkills,
      suggestedGoals: analysisResult.suggestedGoals,
      topicsCountAtGeneration: completedTopicRows.length,
    })
    .returning();

  return NextResponse.json(inserted, { status: 201 });
}
