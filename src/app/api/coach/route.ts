import { streamText } from "ai";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { coachMessages } from "@/lib/db/schema";
import { anthropic, MODEL } from "@/lib/ai/client";
import { buildCoachSystemPrompt } from "@/lib/ai/prompts";
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

  const systemPrompt = await buildCoachSystemPrompt(userId, topicId);

  // Persist the user message
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");

  if (process.env.MOCK_AI === "true") {
    const lastMsg = last8Messages[last8Messages.length - 1]?.content ?? "";
    const mockReply = `**[Mock Coach]** Recebi sua pergunta: "${lastMsg.slice(0, 80)}..."\n\nPara ativar o AI Coach real, adicione créditos na sua conta Anthropic e remova \`MOCK_AI=true\` do .env.local.`;

    // Persist both turns
    if (lastUserMsg) {
      await db.insert(coachMessages).values({ userId, role: "user", content: lastUserMsg.content }).catch(() => {});
    }
    await db.insert(coachMessages).values({ userId, role: "assistant", content: mockReply }).catch(() => {});

    return new Response(
      `0:"${mockReply.replace(/"/g, '\\"').replace(/\n/g, "\\n")}"\n`,
      { headers: { "Content-Type": "text/plain; charset=utf-8", "x-vercel-ai-data-stream": "v1" } }
    );
  }

  if (lastUserMsg) {
    await db.insert(coachMessages).values({ userId, role: "user", content: lastUserMsg.content }).catch(() => {});
  }

  const result = await streamText({
    model: anthropic(MODEL),
    system: systemPrompt,
    messages: last8Messages,
    onFinish: async ({ text }) => {
      if (text) {
        await db
          .insert(coachMessages)
          .values({ userId, role: "assistant", content: text })
          .catch(() => {});
      }
    },
  });

  return result.toDataStreamResponse();
}
