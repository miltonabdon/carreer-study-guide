# Developer Quickstart: AI-Powered Personal Study Guide

**Branch**: `001-ai-study-guide-app` | **Date**: 2026-05-09
**Audience**: Developer starting implementation of this feature

---

## What You're Building

A full-stack Next.js 14 web application with three core subsystems:

1. **FSRS Spaced Repetition Engine** (`src/lib/spaced-repetition/`) — Pure TypeScript, no AI calls. Calculates review intervals and updates topic scheduling state after each study session. This is the most testable component; write unit tests first.

2. **Daily Plan Generator** (`src/lib/planner/`) — Queries due reviews from PostgreSQL, queries next unlocked topics, calls Claude AI to select new-learning priorities, assembles and caches the daily task list in Redis.

3. **AI Coach Chat** (`src/app/api/coach/`) — Streaming Next.js API route using Vercel AI SDK `streamText()`. Injects topic context and user profile into the system prompt on each request.

---

## Key Files to Create First

Follow this order — later files depend on earlier ones:

```
1. src/lib/db/schema.ts          ← Drizzle schema (source of truth for all types)
2. src/lib/spaced-repetition/    ← FSRS algorithm (no dependencies)
3. src/lib/ai/prompts.ts         ← All system prompts (strings, easy to iterate)
4. src/lib/ai/generate.ts        ← Claude API wrappers (generateObject, streamText)
5. src/lib/planner/index.ts      ← Daily plan logic (depends on 2 + 4)
6. src/app/api/**/route.ts       ← API handlers (depend on 3-5)
7. src/app/**/page.tsx           ← UI pages (depend on API routes)
```

---

## FSRS Implementation Guide

The spaced repetition algorithm is the heart of the scheduling system. Implement it as pure functions:

```typescript
// src/lib/spaced-repetition/types.ts
export type Rating = 1 | 2 | 3 | 4 | 5;
export type FsrsState = 'New' | 'Learning' | 'Review' | 'Relearning';

export interface FsrsCard {
  state: FsrsState;
  stability: number;       // S: days
  difficulty: number;      // D: 0-10
  retrievability: number;  // R: 0-1
  lapses: number;
  nextReviewAt: Date;
  lastReviewedAt: Date | null;
}

export interface ReviewResult {
  newCard: FsrsCard;
  intervalDays: number;
}
```

```typescript
// src/lib/spaced-repetition/fsrs.ts
const TARGET_RETRIEVABILITY = 0.9;
const LEARNING_INTERVALS_DAYS = [0.01, 1, 3]; // 15min, 1day, 3days

export function reviewCard(card: FsrsCard, rating: Rating, reviewedAt: Date): ReviewResult {
  const newDifficulty = updateDifficulty(card.difficulty, rating);
  const newStability = updateStability(card.stability, card.difficulty, rating, card.state);
  const newState = getNextState(card.state, rating);
  const intervalDays = getNextInterval(newStability, newState, card.lapses);

  const nextReviewAt = new Date(reviewedAt);
  nextReviewAt.setDate(nextReviewAt.getDate() + Math.round(intervalDays));

  return {
    newCard: {
      state: newState,
      stability: newStability,
      difficulty: newDifficulty,
      retrievability: getRetrievability(newStability, 0),
      lapses: rating === 1 ? card.lapses + 1 : card.lapses,
      nextReviewAt,
      lastReviewedAt: reviewedAt,
    },
    intervalDays,
  };
}

function updateDifficulty(d: number, rating: Rating): number {
  const delta = (8 - 9 * rating) * (rating - 3) * 0.02;
  return Math.max(1, Math.min(10, d + delta));
}

function updateStability(s: number, d: number, rating: Rating, state: FsrsState): number {
  const hardnessFactor = (13 - d) / 13;
  const ratingFactor = 0.8 + 0.2 * (rating / 5);
  if (state === 'Learning') return Math.max(0.5, s * 0.5 * ratingFactor);
  return Math.max(0.5, s * Math.pow(hardnessFactor, 0.3) * ratingFactor);
}

function getNextState(state: FsrsState, rating: Rating): FsrsState {
  if (rating === 1) return 'Relearning';
  if (state === 'New') return 'Learning';
  if (state === 'Learning' && rating >= 4) return 'Review';
  if (state === 'Relearning' && rating >= 3) return 'Review';
  return state;
}

function getNextInterval(stability: number, state: FsrsState, lapses: number): number {
  if (state === 'Learning') return LEARNING_INTERVALS_DAYS[Math.min(lapses, 2)];
  if (state === 'Relearning') return 3;
  return Math.max(1, Math.round(stability * (4 / (1 - TARGET_RETRIEVABILITY))));
}

export function getRetrievability(stability: number, daysSinceReview: number): number {
  if (stability <= 0) return 0;
  return Math.pow(1 + 0.4 * stability * daysSinceReview, -1);
}
```

**Test this thoroughly before moving on** — the entire review scheduling depends on it being correct.

---

## AI Integration Patterns

### Learning Path Generation (one-shot JSON)

```typescript
// src/lib/ai/generate.ts
import { generateObject } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { LEARNING_PATH_SYSTEM_PROMPT } from './prompts';

const topicSchema = z.object({
  title: z.string(),
  description: z.string(),
  orderIndex: z.number(),
  complexity: z.number().min(1).max(5),
  estimatedMinutes: z.number().min(15).max(240),
  dependencies: z.array(z.number()), // orderIndex values of prerequisites
});

const learningPathSchema = z.object({
  topics: z.array(topicSchema),
  totalEstimatedMinutes: z.number(),
  completionWeeksEstimate: z.number(),
  paceWarning: z.string().nullable(),
});

export async function generateLearningPath(
  goalTitle: string,
  goalDescription: string,
  userBackground: string,
  dailyAvailableMinutes: number
) {
  const { object } = await generateObject({
    model: anthropic('claude-sonnet-4-6'),
    schema: learningPathSchema,
    system: LEARNING_PATH_SYSTEM_PROMPT,
    prompt: `
      Generate a learning path for the following goal:
      Title: ${goalTitle}
      Description: ${goalDescription}
      
      Learner background: ${userBackground}
      Available study time: ${dailyAvailableMinutes} minutes per day
      
      Create 8-20 ordered topics that build from foundational to advanced.
    `,
  });
  return object;
}
```

### AI Coaching Chat (streaming)

```typescript
// src/app/api/coach/route.ts
import { streamText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { auth } from '@/lib/auth';
import { getCoachingSystemPrompt } from '@/lib/ai/prompts';

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { messages, topicId } = await req.json();

  const topic = topicId ? await getTopic(topicId, session.userId) : null;
  const userProfile = await getUserProfile(session.userId);

  const result = await streamText({
    model: anthropic('claude-sonnet-4-6'),
    system: getCoachingSystemPrompt(userProfile, topic),
    messages: messages.slice(-8), // last 8 messages only
    maxTokens: 1024,
  });

  return result.toDataStreamResponse();
}
```

### Daily Plan Generation (structured output)

```typescript
// src/lib/planner/index.ts
export async function generateDailyPlan(userId: string): Promise<DailyPlan> {
  const user = await getUser(userId);

  // 1. Query due reviews (FSRS algorithm, no AI)
  const dueReviews = await getDueReviews(userId);

  // 2. Query next unlocked topics per goal
  const newLearningCandidates = await getNextUnlockedTopics(userId);

  // 3. If no candidates for new learning, use AI to select; otherwise order by goal priority
  const plan = await generateObject({
    model: anthropic('claude-sonnet-4-6'),
    schema: dailyPlanSchema,
    system: DAILY_PLAN_SYSTEM_PROMPT,
    prompt: buildDailyPlanPrompt(user, dueReviews, newLearningCandidates),
  });

  // 4. Persist and cache
  const saved = await saveDailyPlan(userId, plan.object);
  await cacheDailyPlan(userId, saved);
  return saved;
}
```

---

## Database Setup

```bash
# .env.local
DATABASE_URL="postgresql://postgres:password@localhost:5432/study_guide"
REDIS_URL="redis://localhost:6379"
ANTHROPIC_API_KEY="sk-ant-..."
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
```

```bash
# Start services
docker compose up -d postgres redis

# Create and run migrations
npx drizzle-kit generate
npx drizzle-kit migrate

# Seed with test user
npx tsx scripts/seed.ts
```

---

## Testing Strategy

**Unit tests** (`tests/unit/`) — Test in isolation, no DB or network:
- `fsrs.test.ts` — Every rating combination, state transitions, interval calculations
- `planner.test.ts` — Plan assembly logic with mocked DB results and mocked AI responses
- `prompts.test.ts` — System prompt builders don't throw, output expected tokens

**Integration tests** (`tests/integration/`) — Real PostgreSQL (test DB), mocked AI:
- `sessions.test.ts` — POST /api/sessions updates FSRS fields atomically
- `plans.test.ts` — GET /api/plans/today generates and caches the plan

**E2E tests** (`tests/e2e/`) — Playwright, real browser, mocked Anthropic API:
- `daily-flow.spec.ts` — Login → view plan → complete task → verify progress updates
- `goal-creation.spec.ts` — Create goal → see learning path → unlock first topic

---

## Key Decisions to Remember

| Area | Decision | Why |
|------|----------|-----|
| FSRS algorithm | Simplified hardness-factor formula (not full matrix) | Sufficient accuracy for v1; easier to debug |
| AI model | `claude-sonnet-4-6` | Best structured output + coaching quality |
| Daily plan cache | Redis, TTL to midnight | Avoid re-generating on every page load |
| Context window | Last 8 messages per coaching session | Balance cost vs. conversation quality |
| Session write | Single DB transaction for session + FSRS fields + cache invalidation | Consistency requirement |
| Confidence scale | 1-5 (maps directly to FSRS ratings 1-5) | Simpler UX than Anki's 4-button model |
| Timezone | Store UTC, convert for display only | Avoid midnight boundary bugs |
