import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  knowledgeAssessments,
  topics,
  learningPaths,
  learningGoals,
  dailyPlans,
  dailyPlanTasks,
} from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { applyAssessmentModifier } from "@/lib/spaced-repetition/assessment-modifier";
import type { AssessmentQuestion } from "@/lib/ai/generate";

type RouteContext = { params: Promise<{ assessmentId: string }> };

interface SubmitBody {
  answers: Array<{ questionId: string; answer: "a" | "b" | "c" | "d" }>;
}

export async function POST(req: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { assessmentId } = await params;
  const userId = session.user.id;

  const [assessment] = await db
    .select()
    .from(knowledgeAssessments)
    .where(
      and(eq(knowledgeAssessments.id, assessmentId), eq(knowledgeAssessments.userId, userId))
    )
    .limit(1);

  if (!assessment) {
    return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
  }

  // Idempotent: return existing result if already submitted
  if (assessment.submittedAt !== null) {
    const questions = assessment.questions as AssessmentQuestion[];
    return NextResponse.json(
      {
        assessmentId: assessment.id,
        score: assessment.score,
        submittedAt: assessment.submittedAt,
        alreadySubmitted: true,
        questions: questions.map((q) => ({
          id: q.id,
          text: q.text,
          options: q.options,
          correct: q.correct,
          userAnswer: q.userAnswer,
          dimension: q.dimension,
          isCorrect: q.userAnswer === q.correct,
        })),
      },
      { status: 409 }
    );
  }

  let body: SubmitBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { answers } = body;
  const questions = assessment.questions as AssessmentQuestion[];

  if (!Array.isArray(answers) || answers.length === 0) {
    return NextResponse.json({ error: "answers array is required" }, { status: 400 });
  }

  const questionIds = new Set(questions.map((q) => q.id));
  for (const a of answers) {
    if (!questionIds.has(a.questionId)) {
      return NextResponse.json(
        { error: `Unknown question id: ${a.questionId}` },
        { status: 400 }
      );
    }
    if (!["a", "b", "c", "d"].includes(a.answer)) {
      return NextResponse.json({ error: "Invalid answer value" }, { status: 400 });
    }
  }

  const answerMap = new Map(answers.map((a) => [a.questionId, a.answer]));

  const scoredQuestions = questions.map((q) => ({
    ...q,
    userAnswer: (answerMap.get(q.id) ?? null) as "a" | "b" | "c" | "d" | null,
  }));

  const correctCount = scoredQuestions.filter((q) => q.userAnswer === q.correct).length;
  const score = Math.round((correctCount / questions.length) * 100);

  // Fetch topic to apply FSRS modifier
  const [topic] = await db
    .select({
      id: topics.id,
      nextReviewAt: topics.nextReviewAt,
    })
    .from(topics)
    .innerJoin(learningPaths, eq(topics.pathId, learningPaths.id))
    .innerJoin(learningGoals, eq(learningPaths.goalId, learningGoals.id))
    .where(
      and(eq(topics.id, assessment.topicId), eq(learningGoals.userId, userId))
    )
    .limit(1);

  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  const now = new Date();
  const currentNextReview = topic.nextReviewAt ?? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const { nextReviewAt, action } = applyAssessmentModifier(currentNextReview, score, now);

  // Update topic next review date
  await db
    .update(topics)
    .set({ nextReviewAt, updatedAt: now })
    .where(eq(topics.id, assessment.topicId));

  // Schedule reinforcement review task if score < 50
  if (score < 50) {
    const reviewDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const reviewDateStr = reviewDate.toISOString().slice(0, 10);

    const [existingPlan] = await db
      .select({ id: dailyPlans.id })
      .from(dailyPlans)
      .where(
        and(
          eq(dailyPlans.userId, userId),
          eq(dailyPlans.planDate, reviewDateStr),
          eq(dailyPlans.status, "active")
        )
      )
      .limit(1);

    if (existingPlan) {
      const [taskCount] = await db
        .select({ id: dailyPlanTasks.id })
        .from(dailyPlanTasks)
        .where(
          and(
            eq(dailyPlanTasks.planId, existingPlan.id),
            eq(dailyPlanTasks.topicId, assessment.topicId)
          )
        )
        .limit(1);

      if (!taskCount) {
        const existingTasks = await db
          .select({ orderIndex: dailyPlanTasks.orderIndex })
          .from(dailyPlanTasks)
          .where(eq(dailyPlanTasks.planId, existingPlan.id));

        const maxOrder = existingTasks.reduce((m, t) => Math.max(m, t.orderIndex), -1);

        await db.insert(dailyPlanTasks).values({
          planId: existingPlan.id,
          topicId: assessment.topicId,
          taskType: "review",
          suggestedMinutes: 30,
          orderIndex: maxOrder + 1,
        });
      }
    }
  }

  // Persist user answers and mark assessment as submitted
  const submittedAt = now;
  await db
    .update(knowledgeAssessments)
    .set({
      questions: scoredQuestions as unknown as Record<string, unknown>[],
      score,
      submittedAt,
      fsrsModified: true,
    })
    .where(eq(knowledgeAssessments.id, assessmentId));

  return NextResponse.json({
    assessmentId: assessment.id,
    score,
    submittedAt,
    fsrsAction: action,
    reinforcementNeeded: score < 50,
    questions: scoredQuestions.map((q) => ({
      id: q.id,
      text: q.text,
      options: q.options,
      correct: q.correct,
      userAnswer: q.userAnswer,
      dimension: q.dimension,
      isCorrect: q.userAnswer === q.correct,
    })),
  });
}
