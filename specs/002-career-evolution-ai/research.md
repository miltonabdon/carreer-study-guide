# Research: AI-Powered Career Evolution Features

**Branch**: `002-career-evolution-ai` | **Date**: 2026-05-30
**Phase**: 0 — Technology decisions before data model & contracts

All decisions below are constrained by the existing tech stack from `001-ai-study-guide-app`:
TypeScript 5.x, Next.js 14 App Router, Drizzle ORM, PostgreSQL (Neon), Anthropic SDK,
Resend, Vercel cron, ioredis optional.

---

## Decision 1: FSRS Score Modifier Strategy (FR-002)

**Question**: How should a knowledge assessment score modify the FSRS-computed interval without
breaking the existing algorithm?

**Decision**: Post-computation interval scaling — FSRS runs normally after a review session;
the assessment score is then applied as a multiplier to the computed `next_review_at` offset.

| Score | Action |
|-------|--------|
| ≥ 80% | Multiply computed interval by 1.25 (≥20% extension per FR-002) |
| 50–79% | No change — use standard FSRS-computed interval unchanged |
| < 50% | Override `next_review_at` to `NOW() + 3 days`; schedule an extra review task |

**Implementation**: New helper `applyAssessmentModifier(fsrsInterval, score)` in
`src/lib/spaced-repetition/assessment-modifier.ts`. Called after the normal FSRS update
in the assessment submit handler — NOT in the study session handler (assessments and
study sessions are separate flows).

**Alternatives considered**:
- Modifying FSRS input parameters (D, S) directly — rejected: opaque side effects on future
  review calculations; complex to reverse
- Replacing FSRS entirely with a score-only interval — rejected: loses all retrievability
  modeling and breaks existing sessions

---

## Decision 2: Domain Inference Caching (FR-006 analytics map)

**Question**: Should topic domains be inferred from AI on every analytics load, or cached?

**Decision**: Lazy-cache in `topics.domain` column (nullable TEXT). On first analytics
dashboard load, any topic with `domain = NULL` is batched into a single AI call
(`generateObject` with an array schema) that returns `topicId → domain` pairs. Results
are immediately persisted to `topics.domain`. Subsequent loads read directly from the
column (no AI call).

**Batch size**: Up to 50 `NULL`-domain topics per analytics load; if more exist, the first
50 are inferred and the rest are returned as "Outros" until a subsequent load resolves them.

**Fallback**: If the batch AI call fails, topics remain `domain = NULL` and are displayed
as "Outros" in the analytics map without error; the UI shows a subtle "Domain inference in
progress" note.

**Rationale**: SC-003 requires analytics to load in <3s. Re-inferring domains on every
request would add 3–10s of AI latency per user. Caching in the DB column is free and
persists across sessions.

**Alternatives considered**:
- Infer domain at topic creation time — rejected: path generation already takes ~10s;
  adding domain inference would increase it further; domain is only needed for analytics
- Separate domain_cache table — rejected: over-engineering; a nullable column is simpler

---

## Decision 3: MCQ Assessment Storage Format (FR-001)

**Question**: How should the MCQ questions, options, correct answer, and user answers be stored?

**Decision**: JSONB column `questions` on the `knowledge_assessments` table. Schema:

```ts
type AssessmentQuestion = {
  id: string;           // UUID v4 generated server-side
  text: string;         // Question text
  options: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  correct: 'a' | 'b' | 'c' | 'd';   // Populated on generation
  userAnswer: 'a' | 'b' | 'c' | 'd' | null;  // Populated on submission
  dimension: 'recall' | 'application' | 'analysis';
};
```

The `correct` field is stored server-side and never returned to the client until the user
submits their answers (enforced in the GET response for an active assessment).

**Rationale**: MCQ questions are self-contained per assessment; no relational benefit to
normalizing them into separate rows. JSONB allows schema evolution without migrations.
Consistent with how the existing app stores `suggestedGoals` arrays in gap reports.

**Alternatives considered**:
- Separate `assessment_questions` table — rejected: premature normalization; assessments
  are never queried individually by question
- JSON string column (TEXT) — rejected: JSONB enables indexed queries and type safety
  via Drizzle's `jsonb()` type

---

## Decision 4: Career Target Versioning (FR-003)

**Question**: Should the career target use a `current_id` pointer, a `is_active` flag,
or pure append-only ordering?

**Decision**: Append-only table — each `POST /api/career/target` inserts a new row.
Most-recent version is derived at query time with `ORDER BY created_at DESC LIMIT 1`.
No `is_active` flag needed. All versions always retained.

**Rationale**: Simplest possible versioning; zero risk of double-active bugs; consistent
with how study sessions accumulate. "Most recent = active" is a Drizzle query, not a
maintained invariant.

**Alternatives considered**:
- `is_current BOOLEAN` flag — rejected: requires updating old row on every insert;
  introduces a transactional invariant to maintain
- Separate `active_career_target_id` on User — rejected: denormalization; added FK
  complexity with no query performance benefit at this scale

---

## Decision 5: Weekly Report Cron Architecture (FR-007, FR-008)

**Question**: Should the weekly report use a separate Vercel cron job or be combined
with the daily digest cron?

**Decision**: Separate endpoint `POST /api/cron/weekly-report`, scheduled
`0 8 * * 1` (Monday 08:00 UTC) in `vercel.json`. Protected by the existing
`CRON_SECRET` bearer token. Email delivery via Resend using a new weekly report template
alongside the existing daily digest template.

**Report generation logic**:
1. Query all users with at least 1 study session in the last 7 days
2. For each user: aggregate metrics (topics, hours, streak, top domain, weakest domain)
3. Call Anthropic with `generateText` for AI insight sentence
4. If AI call fails: use fallback phrase; log error to Vercel; proceed
5. Insert `weekly_reports` row (always) and send email if `emailNotificationsEnabled = true`
6. If cron fires multiple times on the same Monday (retry or manual): use `ON CONFLICT (user_id, week_id) DO NOTHING`

**Rationale**: Separate cron = separate schedule + separate logs; easy to identify failures.
Same CRON_SECRET pattern as daily digest avoids new infrastructure. `week_id` deduplication
ensures idempotent generation (spec: at most one report per ISO week per user).

**Alternatives considered**:
- Extending daily digest cron with a Monday check — rejected: couples two unrelated features;
  harder to debug; harder to reschedule independently
- Background queue — rejected: no queue infrastructure in this project; Vercel cron is sufficient

---

## Decision 6: Skill Gap Report AI Prompt Design (FR-004)

**Question**: What is the AI call structure for skill gap analysis, and how is failure handled?

**Decision**: Single `generateObject` call (Anthropic via `ai` package) with a Zod schema.

**Input to AI**:
```
Career target: "{careerTarget.description}"

Completed topics (across all goals):
- {topic1.title}: {topic1.description}
- {topic2.title}: ...
```

**Output schema** (Zod):
```ts
z.object({
  coveredSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  suggestedGoals: z.array(z.object({
    title: z.string(),
    rationale: z.string().max(200),
  })).min(3).max(5),
})
```

**Failure handling** (per FR-004 and spec edge cases):
- Any error (timeout, API error, credits exhausted, invalid JSON) → throw from handler
- Endpoint returns HTTP 503 with `{ error: "Análise indisponível — tente novamente" }`
- No partial row saved; any existing previous report is completely unaffected
- No cooldown; user can retry immediately

**Rationale**: Same `generateObject` pattern as learning path generation; consistent codebase.
Explicit failure-is-no-save behavior is simpler than saving a partial and marking it failed.

---

## Decision 7: Analytics Query Strategy (FR-006)

**Question**: Should analytics metrics be computed on-the-fly or cached?

**Decision**: Compute on-the-fly with a single aggregation query per analytics page load.
No dedicated caching layer for analytics (Redis optional-null fallback already in place —
analytics can use it opportunistically if Redis is available, but won't block if absent).

**Key queries**:
- Weekly velocity: GROUP BY calendar week over `study_sessions.studied_at` (last 8 weeks)
- Confidence trend: AVG `confidence_rating` per goal per week
- Projected completion: (remaining topics × avg minutes per topic) ÷ user's `daily_available_minutes`
- Domain coverage: JOIN `topics` WHERE `domain IS NOT NULL` GROUP BY `domain`

**Rationale**: SC-003 requires <3s load. With domain caching (Decision 2) in place, all
remaining queries are straightforward SQL aggregations over indexed columns. At single-user
scale, no caching layer is needed for correctness or performance.

---

## Integration Dependencies

The following existing artifacts from `001-ai-study-guide-app` are directly extended
(not replaced):

| Artifact | What Changes |
|----------|-------------|
| `src/lib/db/schema.ts` | Add 4 new tables; add `domain` column to `topics` |
| `src/lib/spaced-repetition/fsrs.ts` | No changes; new modifier wraps output |
| `src/lib/ai/generate.ts` | Add 3 new `generateObject` functions |
| `src/lib/email/templates.ts` | Add weekly report template |
| `vercel.json` | Add `weekly-report` cron entry |
| `src/app/api/account/export/route.ts` | Include 4 new entities in JSON export |
| `src/app/api/account/delete/route.ts` | Cascade delete 4 new tables |
