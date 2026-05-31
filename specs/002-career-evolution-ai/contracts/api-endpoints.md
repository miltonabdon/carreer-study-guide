# API Contracts: AI-Powered Career Evolution Features

**Branch**: `002-career-evolution-ai` | **Date**: 2026-05-30
**Phase**: 1 — New API endpoints (additions to existing 001 endpoints)

All endpoints are under `/api/` prefix (Next.js App Router). Authentication required on all
endpoints except `/api/cron/*` (protected by `CRON_SECRET` instead). Responses use
`application/json`. Errors follow `{ error: string, code?: string }`.

---

## Knowledge Assessments

### POST /api/topics/:topicId/assessment

Generate a new knowledge assessment for a completed topic, or return the existing
same-day assessment if one was already generated today.

**Auth**: Session required. Topic must belong to the authenticated user.

**Path params**: `topicId` — UUID of the topic

**Preconditions**:
- Topic status must be `complete` or `known` (FR-001). Returns HTTP 422 if not.

**Same-day behavior**: If an assessment already exists for `(userId, topicId, today)`,
returns it immediately (with `correct` fields omitted if not yet submitted) — no AI call.

**Response 200** (existing same-day assessment):
```ts
{
  assessmentId: string;
  topicId: string;
  topicTitle: string;
  submittedAt: string | null;         // ISO timestamp or null
  score: number | null;               // null if not yet submitted
  alreadyGeneratedToday: true;
  generatedAt: string;               // "Avaliação de hoje — feita às HH:MM"
  questions: Array<{
    id: string;
    text: string;
    options: { a: string; b: string; c: string; d: string };
    correct?: 'a' | 'b' | 'c' | 'd'; // Included only after submission
    userAnswer: 'a' | 'b' | 'c' | 'd' | null;
    dimension: 'recall' | 'application' | 'analysis';
  }>;
}
```

**Response 201** (new assessment generated):
```ts
{
  assessmentId: string;
  topicId: string;
  topicTitle: string;
  submittedAt: null;
  score: null;
  alreadyGeneratedToday: false;
  generatedAt: string;
  questions: Array<{
    id: string;
    text: string;
    options: { a: string; b: string; c: string; d: string };
    // NOTE: 'correct' is NOT returned until submission
    userAnswer: null;
    dimension: 'recall' | 'application' | 'analysis';
  }>;
}
```

**Response 422**: Topic not in `complete` or `known` status.

**Response 503**: AI service unavailable. Body: `{ error: "Avaliação temporariamente indisponível — tente novamente em breve" }`.

---

### POST /api/assessments/:assessmentId/submit

Submit user answers for an assessment, compute score, and apply FSRS modifier.

**Auth**: Session required. Assessment must belong to authenticated user.

**Path params**: `assessmentId` — UUID

**Request**:
```ts
{
  answers: Array<{
    questionId: string;
    answer: 'a' | 'b' | 'c' | 'd';
  }>;
}
```

**Validation**: `answers` array must have same length as `questions` array; each `questionId` must match a question in the assessment; each `answer` must be one of `a|b|c|d`.

**Response 200**:
```ts
{
  assessmentId: string;
  score: number;            // 0–100
  submittedAt: string;      // ISO timestamp
  fsrsModified: boolean;
  fsrsAction: 'extended' | 'unchanged' | 'shortened';  // score ≥80 / 50-79 / <50
  questions: Array<{
    id: string;
    text: string;
    options: { a: string; b: string; c: string; d: string };
    correct: 'a' | 'b' | 'c' | 'd';   // NOW revealed
    userAnswer: 'a' | 'b' | 'c' | 'd';
    isCorrect: boolean;
    dimension: 'recall' | 'application' | 'analysis';
  }>;
  reinforcementNeeded: boolean;   // true if score < 50 (show indicator on topic card)
}
```

**Response 409**: Assessment already submitted. Returns same 200-shape result (idempotent read).

**Response 404**: Assessment not found or does not belong to user.

---

## Career Target

### GET /api/career/target

Get all career target versions for the authenticated user, most-recent first.

**Response 200**:
```ts
{
  current: {
    id: string;
    description: string;
    createdAt: string;
  } | null;
  history: Array<{
    id: string;
    description: string;
    createdAt: string;
  }>;              // All versions including current, sorted newest first
}
```

---

### POST /api/career/target

Save a new career target version. Creates a new row (append-only).

**Request**:
```ts
{
  description: string;   // min 10 chars, max 1000 chars
}
```

**Response 201**:
```ts
{
  id: string;
  description: string;
  createdAt: string;
}
```

**Response 422**: Validation error (description too short/long).

---

## Skill Gap Analysis

### GET /api/career/gap-analysis

List all skill gap reports for the authenticated user, most-recent first.

**Response 200**:
```ts
{
  reports: Array<{
    id: string;
    generatedAt: string;
    careerTargetSnapshot: string;   // Target text at generation time
    coveredSkills: string[];
    missingSkills: string[];
    suggestedGoals: Array<{ title: string; rationale: string }>;
    topicsCountAtGeneration: number;
  }>;
  stalePrompt: boolean;    // true if ≥10 new topics since last report (FR-005)
  currentTopicsCount: number;
}
```

---

### POST /api/career/gap-analysis

Trigger a new skill gap analysis using the user's current career target.

**Auth**: Session required. Requires at least one career target to exist.

**Response 201** (analysis complete):
```ts
{
  id: string;
  generatedAt: string;
  careerTargetSnapshot: string;
  coveredSkills: string[];
  missingSkills: string[];
  suggestedGoals: Array<{ title: string; rationale: string }>;
  topicsCountAtGeneration: number;
}
```

**Response 422**: No career target defined. Body: `{ error: "Defina seu objetivo de carreira antes de solicitar análise" }`.

**Response 503**: AI service unavailable. Body: `{ error: "Análise indisponível — tente novamente" }`. No partial result saved.

---

### POST /api/career/gap-analysis/:reportId/create-goal

Create a new learning goal pre-filled from a suggested goal in a gap report (FR-009).

**Path params**: `reportId` — UUID of the gap report

**Request**:
```ts
{
  goalIndex: number;   // 0-based index into suggestedGoals array
}
```

**Response 201**: Standard goal creation response (same shape as `POST /api/goals` from 001):
```ts
{
  goalId: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  pathGenerating: boolean;   // true — path generation starts immediately
}
```

**Response 404**: Report not found or `goalIndex` out of bounds.

---

## Analytics

### GET /api/analytics

Retrieve all analytics data for the authenticated user's dashboard (FR-006).

**Query params** (optional):
- `goalId` — UUID — filter all metrics to a specific goal

**Response 200**:
```ts
{
  weeklyVelocity: Array<{
    weekStart: string;        // ISO date (Monday)
    topicsCompleted: number;
    hoursStudied: number;
  }>;                         // Last 8 weeks, ascending

  domainCoverage: Array<{
    domain: string;           // "Outros" for unclassified
    completedTopics: number;
    avgConfidence: number | null;
    dueForReview: number;
    isGap: boolean;           // true if completedTopics < 3 AND career target exists
  }>;

  confidenceTrends: Array<{
    goalId: string;
    goalTitle: string;
    weeks: Array<{
      weekStart: string;
      avgConfidence: number;
    }>;
  }>;

  projectedCompletions: Array<{
    goalId: string;
    goalTitle: string;
    remainingTopics: number;
    avgMinutesPerTopic: number;
    projectedCompletionDate: string | null;  // null if no study history
  }>;

  retentionHealth: {
    strongPercent: number;    // % topics with avg confidence ≥ 4
    weakPercent: number;      // % topics with avg confidence ≤ 2
    totalReviewed: number;
  };

  domainInferenceInProgress: boolean;  // true if any topics still have domain = null
}
```

**Performance**: This endpoint triggers lazy domain inference for up to 50 NULL-domain topics
before responding. Domain inference failure does not block the response.

---

## Weekly Reports

### GET /api/reports/weekly

List all weekly reports for the authenticated user, most-recent first.

**Response 200**:
```ts
{
  reports: Array<{
    id: string;
    weekId: string;           // "YYYY-Www"
    periodStart: string;      // ISO date
    periodEnd: string;        // ISO date
    topicsCompleted: number;
    studyHours: number;
    streakAtGeneration: number;
    topDomain: string | null;
    weakestDomain: string | null;
    aiInsight: string;
    fallbackUsed: boolean;
    emailSentAt: string | null;
    generatedAt: string;
  }>;
}
```

---

## Cron Endpoints

### POST /api/cron/weekly-report

Monday 08:00 UTC cron — generates weekly reports for all active users and sends emails.
Protected by `Authorization: Bearer {CRON_SECRET}` header (same pattern as daily digest).

**Auth**: CRON_SECRET bearer token, NOT a user session.

**Request**: No body (Vercel cron calls with no body).

**Response 200**:
```ts
{
  usersProcessed: number;
  emailsSent: number;
  emailsSkipped: number;   // opt-out users
  aiFailures: number;      // users where AI call failed (fallback used)
  errors: string[];        // non-fatal per-user error messages
}
```

**Idempotency**: Uses `INSERT ... ON CONFLICT (user_id, week_id) DO NOTHING`. Safe to call multiple times for the same week.

---

## Existing Endpoint Extensions (001 → 002)

### GET /api/account/export (extended)

The existing export endpoint is extended to include the 4 new entities (FR-010):

```ts
// Added to existing export shape:
{
  // ... existing 001 fields ...
  careerTargets: CareerTarget[];
  skillGapReports: SkillGapReport[];
  knowledgeAssessments: KnowledgeAssessment[];
  weeklyReports: WeeklyReport[];
}
```

### DELETE /api/account (extended)

Cascade deletion is extended to cover the 4 new tables (FR-010). Order:
1. `knowledge_assessments` WHERE user_id = $userId
2. `skill_gap_reports` WHERE user_id = $userId
3. `career_targets` WHERE user_id = $userId
4. `weekly_reports` WHERE user_id = $userId
5. (existing 001 cascade continues unchanged)
