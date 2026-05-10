import { streamText } from "ai";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { topics, learningPaths, learningGoals, users, studySessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { anthropic, MODEL } from "@/lib/ai/client";
import { getCoachingSystemPrompt } from "@/lib/ai/prompts";
import { z } from "zod";

const requestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  topicId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return new Response("Invalid JSON", { status: 400 });

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return new Response("Invalid request", { status: 400 });

  const { messages, topicId } = parsed.data;
  const last8Messages = messages.slice(-8);

  const userId = session.user.id;

  // Fetch user profile
  const [user] = await db
    .select({ displayName: users.displayName, dailyAvailableMinutes: users.dailyAvailableMinutes })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const userBackground = `Software architect and engineer with postgraduate degrees in software architecture and cloud/mobile computing. Strong interest in AI/ML, agentic AI, RAG systems, and spec-driven development. Currently mentoring teams and targeting architecture leadership roles. Available to study ${user?.dailyAvailableMinutes ?? 60} minutes per day.`;

  // Fetch topic context if provided
  let topicTitle: string | undefined;
  let topicDescription: string | undefined;

  if (topicId) {
    const [topic] = await db
      .select({
        title: topics.title,
        description: topics.description,
        pathId: topics.pathId,
      })
      .from(topics)
      .where(eq(topics.id, topicId))
      .limit(1);

    if (topic) {
      // Verify ownership
      const [path] = await db
        .select({ goalId: learningPaths.goalId })
        .from(learningPaths)
        .where(eq(learningPaths.id, topic.pathId))
        .limit(1);

      if (path) {
        const [goal] = await db
          .select({ userId: learningGoals.userId })
          .from(learningGoals)
          .where(eq(learningGoals.id, path.goalId))
          .limit(1);

        if (goal?.userId === userId) {
          topicTitle = topic.title;
          topicDescription = topic.description ?? undefined;
        }
      }
    }
  }

  // Fetch recently completed topics for context
  const recentSessions = await db
    .select({ topicTitle: topics.title })
    .from(studySessions)
    .innerJoin(topics, eq(studySessions.topicId, topics.id))
    .where(eq(studySessions.userId, userId))
    .limit(20);

  const seen = new Set<string>();
  const completedTopics: string[] = [];
  for (const s of recentSessions) {
    if (!seen.has(s.topicTitle)) {
      seen.add(s.topicTitle);
      completedTopics.push(s.topicTitle);
    }
  }

  const systemPrompt = getCoachingSystemPrompt(
    userBackground,
    topicTitle,
    topicDescription,
    completedTopics
  );

  if (process.env.MOCK_AI === "true") {
    const lastMsg = last8Messages[last8Messages.length - 1]?.content ?? "";
    const mockReply = `**[Mock Coach]** Recebi sua pergunta: "${lastMsg.slice(0, 80)}..."\n\nPara ativar o AI Coach real, adicione créditos na sua conta Anthropic e remova \`MOCK_AI=true\` do .env.local.`;
    return new Response(
      `0:"${mockReply.replace(/"/g, '\\"').replace(/\n/g, "\\n")}"\n`,
      { headers: { "Content-Type": "text/plain; charset=utf-8", "x-vercel-ai-data-stream": "v1" } }
    );
  }

  const result = await streamText({
    model: anthropic(MODEL),
    system: systemPrompt,
    messages: last8Messages,
  });

  return result.toDataStreamResponse();
}
