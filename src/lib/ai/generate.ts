import { generateObject } from "ai";
import { z } from "zod";
import { anthropic, MODEL } from "./client";
import { LEARNING_PATH_SYSTEM_PROMPT, DAILY_PLAN_SYSTEM_PROMPT } from "./prompts";

const MOCK_AI = process.env.MOCK_AI === "true";

// ─── Learning Path Generation ─────────────────────────────────────────────────

const topicSchema = z.object({
  title: z.string(),
  description: z.string(),
  orderIndex: z.number().int().min(0),
  complexity: z.number().int().min(1).max(5),
  estimatedMinutes: z.number().int().min(15).max(360),
});

const learningPathSchema = z.object({
  topics: z.array(topicSchema).min(4).max(30),
  totalEstimatedMinutes: z.number().int().positive(),
  completionWeeksEstimate: z.number().int().positive(),
  paceWarning: z.string().nullable(),
});

export type GeneratedLearningPath = z.infer<typeof learningPathSchema> & { fallbackUsed: boolean };

function mockLearningPath(goalTitle: string, dailyAvailableMinutes: number): GeneratedLearningPath {
  const topics = [
    { title: "Fundamentos e Conceitos Base", description: `Conceitos fundamentais de ${goalTitle}`, orderIndex: 0, complexity: 1, estimatedMinutes: 60 },
    { title: "Configuração do Ambiente", description: "Setup e ferramentas necessárias", orderIndex: 1, complexity: 2, estimatedMinutes: 45 },
    { title: "Primeiros Passos Práticos", description: "Exercícios introdutórios guiados", orderIndex: 2, complexity: 2, estimatedMinutes: 90 },
    { title: "Conceitos Intermediários", description: "Aprofundamento nos conceitos principais", orderIndex: 3, complexity: 3, estimatedMinutes: 90 },
    { title: "Integração e Pipelines", description: "Conectando componentes em fluxos reais", orderIndex: 4, complexity: 3, estimatedMinutes: 120 },
    { title: "Técnicas Avançadas", description: "Otimização e boas práticas", orderIndex: 5, complexity: 4, estimatedMinutes: 120 },
    { title: "Projeto Prático", description: "Aplicação dos conceitos em projeto real", orderIndex: 6, complexity: 4, estimatedMinutes: 180 },
    { title: "Produção e Deploy", description: "Colocando em produção com qualidade", orderIndex: 7, complexity: 5, estimatedMinutes: 120 },
  ];
  const total = topics.reduce((s, t) => s + t.estimatedMinutes, 0);
  const weeks = Math.ceil(total / (dailyAvailableMinutes * 5));
  return { topics, totalEstimatedMinutes: total, completionWeeksEstimate: weeks, paceWarning: null, fallbackUsed: true };
}

export async function generateLearningPath(
  goalTitle: string,
  goalDescription: string,
  userBackground: string,
  dailyAvailableMinutes: number
): Promise<GeneratedLearningPath> {
  if (MOCK_AI) return mockLearningPath(goalTitle, dailyAvailableMinutes);

  try {
    const { object } = await generateObject({
      model: anthropic(MODEL),
      schema: learningPathSchema,
      system: LEARNING_PATH_SYSTEM_PROMPT,
      prompt: `Generate a complete learning path for the following goal.

Goal Title: ${goalTitle}
Goal Description: ${goalDescription}

Learner Background: ${userBackground}
Available study time: ${dailyAvailableMinutes} minutes per day (weekdays)

Requirements:
- Create 8-20 ordered topics progressing from foundational to advanced
- Order topics so each builds on previous knowledge
- Provide realistic time estimates (15-360 minutes per topic)
- Complexity scale: 1=beginner concept, 5=expert/advanced concept
- Calculate totalEstimatedMinutes as the sum of all topic durations
- Calculate completionWeeksEstimate based on ${dailyAvailableMinutes} min/day, 5 days/week
- Include a paceWarning if the goal seems unrealistic for the timeline, or null if it's reasonable`,
    });
    return { ...object, fallbackUsed: false };
  } catch (err) {
    console.error("[generateLearningPath] AI error, using fallback:", err);
    return mockLearningPath(goalTitle, dailyAvailableMinutes);
  }
}

// ─── Daily Plan Generation ────────────────────────────────────────────────────

const dailyTaskSchema = z.object({
  topicId: z.string(),
  taskType: z.enum(["new_learning", "review"]),
  suggestedMinutes: z.number().int().min(15).max(120),
  rationale: z.string(),
});

const dailyPlanSchema = z.object({
  tasks: z.array(dailyTaskSchema),
  aiRationale: z.string(),
});

export type GeneratedDailyPlan = z.infer<typeof dailyPlanSchema> & { fallbackUsed: boolean };

interface DueReview {
  topicId: string;
  topicTitle: string;
  goalTitle: string;
  goalPriority: "high" | "medium" | "low";
  daysOverdue: number;
  estimatedMinutes: number;
}

interface NewLearningCandidate {
  topicId: string;
  topicTitle: string;
  goalTitle: string;
  goalPriority: "high" | "medium" | "low";
  estimatedMinutes: number;
  targetDateDaysLeft?: number;
}

export async function generateDailyPlanWithAI(
  availableMinutes: number,
  dueReviews: DueReview[],
  newLearningCandidates: NewLearningCandidate[]
): Promise<GeneratedDailyPlan> {
  function buildFallbackPlan(): GeneratedDailyPlan {
    const tasks: GeneratedDailyPlan["tasks"] = [];
    let remaining = availableMinutes;
    for (const r of dueReviews) {
      if (remaining <= 0) break;
      const mins = Math.min(r.estimatedMinutes, remaining);
      tasks.push({ topicId: r.topicId, taskType: "review", suggestedMinutes: mins, rationale: "Due for review" });
      remaining -= mins;
    }
    for (const c of newLearningCandidates) {
      if (remaining <= 0) break;
      const mins = Math.min(c.estimatedMinutes, remaining);
      tasks.push({ topicId: c.topicId, taskType: "new_learning", suggestedMinutes: mins, rationale: "Next topic in path" });
      remaining -= mins;
    }
    return { tasks, aiRationale: "Plano gerado por regras internas.", fallbackUsed: true };
  }

  if (MOCK_AI) return buildFallbackPlan();

  try {
    const { object } = await generateObject({
      model: anthropic(MODEL),
      schema: dailyPlanSchema,
      system: DAILY_PLAN_SYSTEM_PROMPT,
      prompt: `Generate an optimized daily study plan.

Available time today: ${availableMinutes} minutes

DUE REVIEWS (prioritize these):
${
  dueReviews.length > 0
    ? dueReviews
        .map(
          (r) =>
            `- Topic: "${r.topicTitle}" (Goal: ${r.goalTitle}, Priority: ${r.goalPriority}, ${r.daysOverdue} days overdue, ~${r.estimatedMinutes} min)`
        )
        .join("\n")
    : "None"
}

AVAILABLE NEW TOPICS (fill remaining time):
${
  newLearningCandidates.length > 0
    ? newLearningCandidates
        .map(
          (c) =>
            `- Topic: "${c.topicTitle}" (Goal: ${c.goalTitle}, Priority: ${c.goalPriority}${c.targetDateDaysLeft !== undefined ? `, ${c.targetDateDaysLeft} days to deadline` : ""}, ~${c.estimatedMinutes} min)`
        )
        .join("\n")
    : "None available yet"
}

Select tasks that fit within ${availableMinutes} minutes total. Include all overdue reviews first, then fill remaining time with new learning.`,
    });
    return { ...object, fallbackUsed: false };
  } catch (err) {
    console.error("[generateDailyPlanWithAI] AI error, using fallback:", err);
    return buildFallbackPlan();
  }
}
