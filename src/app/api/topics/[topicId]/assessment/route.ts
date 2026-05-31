import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { topics, learningPaths, learningGoals, knowledgeAssessments } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { generateAssessment } from "@/lib/ai/generate";
import type { AssessmentQuestion } from "@/lib/ai/generate";

type RouteContext = { params: Promise<{ topicId: string }> };

async function getTopicWithOwnership(topicId: string, userId: string) {
  const [topic] = await db
    .select({
      id: topics.id,
      title: topics.title,
      description: topics.description,
      notes: topics.notes,
      status: topics.status,
    })
    .from(topics)
    .innerJoin(learningPaths, eq(topics.pathId, learningPaths.id))
    .innerJoin(learningGoals, eq(learningPaths.goalId, learningGoals.id))
    .where(and(eq(topics.id, topicId), eq(learningGoals.userId, userId)))
    .limit(1);
  return topic ?? null;
}

function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function sanitizeForClient(
  questions: AssessmentQuestion[],
  submitted: boolean
): Array<Omit<AssessmentQuestion, "correct"> & { correct?: string }> {
  return questions.map((q) => ({
    id: q.id,
    text: q.text,
    options: q.options,
    userAnswer: q.userAnswer,
    dimension: q.dimension,
    ...(submitted ? { correct: q.correct } : {}),
  }));
}

export async function POST(_req: Request, { params }: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { topicId } = await params;
  const userId = session.user.id;

  const topic = await getTopicWithOwnership(topicId, userId);
  if (!topic) {
    return NextResponse.json({ error: "Topic not found" }, { status: 404 });
  }

  if (topic.status !== "complete" && topic.status !== "known") {
    return NextResponse.json(
      { error: "Apenas tópicos concluídos ou conhecidos podem ser avaliados" },
      { status: 422 }
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  const [existing] = await db
    .select()
    .from(knowledgeAssessments)
    .where(
      and(
        eq(knowledgeAssessments.userId, userId),
        eq(knowledgeAssessments.topicId, topicId),
        eq(knowledgeAssessments.assessedDate, today)
      )
    )
    .limit(1);

  if (existing) {
    const questions = existing.questions as AssessmentQuestion[];
    const submitted = existing.submittedAt !== null;
    return NextResponse.json({
      assessmentId: existing.id,
      topicId,
      topicTitle: topic.title,
      submittedAt: existing.submittedAt,
      score: existing.score,
      alreadyGeneratedToday: true,
      generatedAt: `Avaliação de hoje — feita às ${formatTimeLabel(existing.createdAt)}`,
      questions: sanitizeForClient(questions, submitted),
    });
  }

  let questions: AssessmentQuestion[];
  try {
    questions = await generateAssessment(topic.title, topic.description ?? "", topic.notes);
  } catch {
    return NextResponse.json(
      { error: "Avaliação temporariamente indisponível — tente novamente em breve" },
      { status: 503 }
    );
  }

  const [inserted] = await db
    .insert(knowledgeAssessments)
    .values({
      userId,
      topicId,
      questions: questions as unknown as Record<string, unknown>[],
      assessedDate: today,
    })
    .returning();

  return NextResponse.json(
    {
      assessmentId: inserted.id,
      topicId,
      topicTitle: topic.title,
      submittedAt: null,
      score: null,
      alreadyGeneratedToday: false,
      generatedAt: inserted.createdAt.toISOString(),
      questions: sanitizeForClient(questions, false),
    },
    { status: 201 }
  );
}
