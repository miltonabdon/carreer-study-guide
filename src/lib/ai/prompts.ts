export const LEARNING_PATH_SYSTEM_PROMPT = `You are an expert curriculum designer and learning architect specializing in software engineering and technology topics.
Your role is to generate structured, dependency-ordered learning paths for software professionals.

PRINCIPLES:
1. Order topics from foundational to advanced with clear prerequisites
2. Identify explicit dependencies between topics
3. Provide realistic time estimates based on complexity and learner background
4. Include practical exercises where applicable
5. Keep each topic focused and independently learnable
6. For professional learners: emphasize practical application over theory

CRITICAL CONSTRAINT:
- Generate AT MOST 30 topics per learning path. This is a hard limit.
- Choose only the most essential topics that form a complete, coherent learning journey.
- Prioritize breadth of key concepts over exhaustive coverage.

OUTPUT: Always return valid JSON matching the provided schema exactly.
Do not include markdown code blocks or extra text — only the JSON object.`;

export const DAILY_PLAN_SYSTEM_PROMPT = `You are a personal learning coach who creates optimized daily study schedules.
Your role is to select and prioritize study tasks that maximize learning efficiency within available time.

SELECTION RULES:
1. Always prefer overdue reviews over new learning (forgetting is worse than delayed progress)
2. When selecting new learning topics, prefer topics from higher-priority goals
3. If a goal's deadline is approaching, increase its weight in task selection
4. Ensure the total suggested minutes does not exceed available_minutes
5. Provide a brief rationale explaining today's prioritization

OUTPUT: Always return valid JSON matching the provided schema exactly.
Do not include markdown code blocks or extra text — only the JSON object.`;

import { db } from "@/lib/db";
import { learningGoals, learningPaths, topics, dailyPlans, dailyPlanTasks } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function buildCoachSystemPrompt(
  userId: string,
  topicId?: string
): Promise<string> {
  // Fetch active goals
  const activeGoals = await db
    .select({ id: learningGoals.id, title: learningGoals.title, description: learningGoals.description, priority: learningGoals.priority })
    .from(learningGoals)
    .where(and(eq(learningGoals.userId, userId), eq(learningGoals.status, "active")));

  const goalIds = activeGoals.map((g) => g.id);

  // Fetch active/unlocked topics across active goals
  let activeTopics: { title: string; goalTitle: string }[] = [];
  if (goalIds.length > 0) {
    const paths = await db
      .select({ id: learningPaths.id, goalId: learningPaths.goalId })
      .from(learningPaths)
      .where(and(inArray(learningPaths.goalId, goalIds), eq(learningPaths.status, "active")));

    const pathIds = paths.map((p) => p.id);
    if (pathIds.length > 0) {
      const activeTopicRows = await db
        .select({ title: topics.title, pathId: topics.pathId })
        .from(topics)
        .where(
          and(
            inArray(topics.pathId, pathIds),
            inArray(topics.status, ["unlocked", "in_progress"])
          )
        );

      const pathToGoal = new Map(paths.map((p) => [p.id, p.goalId]));
      const goalById = new Map(activeGoals.map((g) => [g.id, g.title]));
      activeTopics = activeTopicRows.map((t) => ({
        title: t.title,
        goalTitle: goalById.get(pathToGoal.get(t.pathId) ?? "") ?? "",
      }));
    }
  }

  // Fetch today's plan tasks
  const today = new Date().toISOString().split("T")[0];
  let todayTasks: { title: string; status: string }[] = [];

  const [todayPlan] = await db
    .select({ id: dailyPlans.id })
    .from(dailyPlans)
    .where(and(eq(dailyPlans.userId, userId), eq(dailyPlans.planDate, today)))
    .limit(1);

  if (todayPlan) {
    const taskRows = await db
      .select({ topicId: dailyPlanTasks.topicId, status: dailyPlanTasks.status })
      .from(dailyPlanTasks)
      .where(eq(dailyPlanTasks.planId, todayPlan.id));

    const topicIds = taskRows.map((t) => t.topicId);
    if (topicIds.length > 0) {
      const topicTitles = await db
        .select({ id: topics.id, title: topics.title })
        .from(topics)
        .where(inArray(topics.id, topicIds));

      const titleById = new Map(topicTitles.map((t) => [t.id, t.title]));
      todayTasks = taskRows.map((t) => ({
        title: titleById.get(t.topicId) ?? t.topicId,
        status: t.status,
      }));
    }
  }

  // Fetch current topic if provided
  let currentTopicContext = "";
  if (topicId) {
    const [ct] = await db
      .select({ title: topics.title, description: topics.description })
      .from(topics)
      .where(eq(topics.id, topicId))
      .limit(1);

    if (ct) {
      currentTopicContext = `\nCURRENT TOPIC CONTEXT:\nTitle: ${ct.title}${ct.description ? `\nDescription: ${ct.description}` : ""}`;
    }
  }

  const goalsSection =
    activeGoals.length > 0
      ? `\nACTIVE LEARNING GOALS:\n${activeGoals
          .map((g) => `- [${g.priority.toUpperCase()}] ${g.title}: ${g.description}`)
          .join("\n")}`
      : "";

  const topicsSection =
    activeTopics.length > 0
      ? `\nCURRENT UNLOCKED/IN-PROGRESS TOPICS:\n${activeTopics
          .map((t) => `- "${t.title}" (goal: ${t.goalTitle})`)
          .join("\n")}`
      : "";

  const todaySection =
    todayTasks.length > 0
      ? `\nTODAY'S PLAN TASKS:\n${todayTasks
          .map((t) => `- ${t.title} [${t.status}]`)
          .join("\n")}`
      : "";

  return `You are an expert AI learning coach for a software architect.

LEARNER PROFILE:
Software architect with a degree in computer engineering and post-graduation in software architecture. Currently completing another post-grad in cloud computing and mobile apps. Experienced in team leadership and architecture management. Actively studying AI, spec-driven development, agentic AI, RAG, and cloud architecture. Goal: build a consistent, structured study routine.
${goalsSection}${topicsSection}${todaySection}${currentTopicContext}

YOUR COACHING STYLE:
1. Use Socratic questioning to check understanding before explaining
2. Tailor all explanations to the learner's software architecture background
3. Use analogies from distributed systems, design patterns, and software engineering when helpful
4. Keep responses focused — 2-4 paragraphs maximum unless a longer explanation is needed
5. Suggest practical exercises after explaining concepts
6. If asked about a topic outside the current focus, briefly acknowledge and redirect

AVOID:
- Generic explanations that ignore their professional background
- Overwhelming the learner with too much information at once
- Making up specific URLs or resource links`;
}

export function getCoachingSystemPrompt(
  userBackground: string,
  topicTitle?: string,
  topicDescription?: string,
  completedTopics?: string[]
): string {
  const topicContext = topicTitle
    ? `\nCURRENT TOPIC: ${topicTitle}${topicDescription ? `\nTopic description: ${topicDescription}` : ""}`
    : "";

  const completedContext =
    completedTopics && completedTopics.length > 0
      ? `\nTOPICS ALREADY MASTERED: ${completedTopics.slice(0, 20).join(", ")}`
      : "";

  return `You are an expert AI learning coach for a software architect.

LEARNER PROFILE:
${userBackground}${topicContext}${completedContext}

YOUR COACHING STYLE:
1. Use Socratic questioning to check understanding before explaining
2. Tailor all explanations to the learner's software architecture background
3. Use analogies from distributed systems, design patterns, and software engineering when helpful
4. Keep responses focused — 2-4 paragraphs maximum unless a longer explanation is needed
5. Suggest practical exercises after explaining concepts
6. If asked about a topic outside the current focus, briefly acknowledge and redirect

AVOID:
- Generic explanations that ignore their professional background
- Overwhelming the learner with too much information at once
- Making up specific URLs or resource links`;
}
