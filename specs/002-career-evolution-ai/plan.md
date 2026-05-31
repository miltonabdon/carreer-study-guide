# Implementation Plan: AI-Powered Career Evolution Features

**Branch**: `main` | **Date**: 2026-05-30 | **Spec**: [spec.md](spec.md)

---

## Summary

Extends the existing AI-Powered Personal Study Guide with four new capability areas:
(1) AI-generated knowledge assessments that validate understanding of completed topics
and adjust the FSRS schedule based on score; (2) career target definition and AI-powered
skill gap analysis that compares the user's learning portfolio against their stated career
goal and suggests new learning goals; (3) a learning analytics dashboard with weekly velocity
charts, domain coverage maps, and confidence trends; (4) automated Monday weekly reports
with AI-generated insights delivered both in-app and via email. Built on top of the existing
Next.js 14 / Drizzle ORM / Neon / Anthropic SDK stack with no new infrastructure required.

---

## Technical Context

**Language/Version**: TypeScript 5.x + Node.js 18 (inherits from 001)
**Primary Dependencies**: Next.js 14.2, Drizzle ORM 0.30, NextAuth.js 4, Anthropic AI SDK
(via `ai` package), ioredis 5, Resend, Zod 3, Tailwind CSS 3, shadcn/ui
**Storage**: PostgreSQL via Neon (serverless) + Redis via ioredis (optional graceful degradation)
**Testing**: Vitest (unit tests for assessment score modifier logic)
**Target Platform**: Web browser, deployed on Vercel (serverless functions)
**Project Type**: Full-stack web application (Next.js App Router, API Routes)
**Performance Goals**: Assessment generated within 15s (SC-001); gap analysis within 60s (SC-002);
analytics dashboard loads within 3s (SC-003)
**Constraints**: Serverless (no long-lived processes); MOCK_AI=true available for dev;
single-user per account; free-tier infrastructure
**Scale/Scope**: Same as 001 — personal productivity tool; single user

---

## Constitution Check

*Constitution v1.0.0 — see `.specify/memory/constitution.md` for full principles.*

**Gates** (Principles I–VI):
- ✓ **I. Direct Data Access** — All new DB interactions use Drizzle ORM directly in route handlers; no repository classes or service abstractions
- ✓ **II. Environment-Level Feature Control** — `MOCK_AI=true` covers all new AI calls (assessment gen, gap analysis, weekly insight, domain inference); no runtime flags
- ✓ **III. Graceful Degradation** — Assessment failure: 503 + topic untouched; gap analysis failure: 503 + no partial save; weekly report AI failure: fallback phrase used, report still saved/delivered; domain inference failure: "Outros" displayed
- ✓ **IV. Security Baseline** — All new `/api/*` endpoints require session auth; `/api/cron/weekly-report` uses CRON_SECRET bearer token (same pattern as existing digest)
- ✓ **V. Spec-Driven Development** — All features traced to FR-xxx entries in spec.md; all tasks will trace to FRs in tasks.md
- ✓ **VI. Lean Architecture** — 4 new DB tables, 9 new endpoints, no new infrastructure; no repository layer; MOCK_AI path returns identical types

---

## Project Structure

### Documentation (this feature)

```text
specs/002-career-evolution-ai/
├── plan.md              ← This file
├── spec.md              ← Feature specification
├── research.md          ← Technology decisions (Phase 0)
├── data-model.md        ← New entities + schema changes (Phase 1)
├── quickstart.md        ← Integration test scenarios (Phase 1)
├── contracts/
│   └── api-endpoints.md ← 9 new API endpoints (Phase 1)
├── checklists/
│   └── requirements.md  ← Spec quality checklist
└── tasks.md             ← Task breakdown (created by /speckit-tasks)
```

### Source Code — New Files

```text
src/
├── app/
│   ├── analytics/               # New: Learning analytics dashboard page
│   │   └── page.tsx
│   ├── career/                  # New: Career target + gap analysis pages
│   │   ├── page.tsx             # Career target form + gap analysis trigger + report view
│   │   └── history/             # Career target version history
│   │       └── page.tsx
│   ├── reports/                 # New: Weekly reports list page
│   │   └── page.tsx
│   └── api/
│       ├── topics/[topicId]/
│       │   └── assessment/
│       │       └── route.ts     # POST — generate or return same-day assessment
│       ├── assessments/[assessmentId]/
│       │   └── submit/
│       │       └── route.ts     # POST — submit answers, score, FSRS adjust
│       ├── career/
│       │   ├── target/
│       │   │   └── route.ts     # GET (list history), POST (new version)
│       │   └── gap-analysis/
│       │       ├── route.ts     # GET (list reports + stale flag), POST (trigger)
│       │       └── [reportId]/
│       │           └── create-goal/
│       │               └── route.ts  # POST — create goal from suggestion
│       ├── analytics/
│       │   └── route.ts         # GET — all analytics data
│       ├── reports/
│       │   └── weekly/
│       │       └── route.ts     # GET — list weekly reports
│       └── cron/
│           └── weekly-report/
│               └── route.ts     # POST — Monday cron (CRON_SECRET protected)
└── components/
    ├── analytics/               # New UI components
    │   ├── WeeklyVelocityChart.tsx
    │   ├── DomainCoverageMap.tsx
    │   └── ConfidenceTrendChart.tsx
    ├── career/                  # New UI components
    │   ├── CareerTargetForm.tsx
    │   ├── GapReportCard.tsx
    │   └── SuggestedGoalItem.tsx
    ├── assessments/             # New UI components
    │   ├── AssessmentModal.tsx
    │   └── QuestionCard.tsx
    └── reports/                 # New UI components
        └── WeeklyReportCard.tsx
```

### Source Code — Modified Files

```text
src/
├── lib/
│   ├── db/
│   │   └── schema.ts            # Add 4 new tables + topics.domain column
│   ├── ai/
│   │   └── generate.ts          # Add generateAssessment(), generateGapAnalysis(),
│   │                            # generateWeeklyInsight(), inferTopicDomain()
│   ├── spaced-repetition/
│   │   └── assessment-modifier.ts  # New: applyAssessmentModifier(fsrsInterval, score)
│   └── email/
│       └── templates.ts         # Add weeklyReportEmail() template
├── app/
│   ├── api/
│   │   └── account/
│   │       ├── export/route.ts  # Extend: add 4 new entities to JSON export
│   │       └── delete/route.ts  # Extend: cascade delete 4 new tables
│   └── goals/
│       └── [goalId]/
│           └── [topicId]/       # Extend: add "Request Assessment" button to topic view
└── vercel.json                  # Add weekly-report cron entry
```

---

## Key Architectural Decisions

See [research.md](research.md) for full rationale. Summary:

1. **FSRS Score Modifier** — Post-computation scaling: FSRS runs first, then score multiplier
   applied to `next_review_at`. No changes to the FSRS algorithm itself. New helper
   `applyAssessmentModifier()` in `src/lib/spaced-repetition/assessment-modifier.ts`

2. **Domain Inference Caching** — Lazy-cache in `topics.domain` column. First analytics
   load batch-infers up to 50 NULL-domain topics via `generateObject`. Subsequent loads
   read directly from DB. Failure returns "Outros" silently

3. **MCQ Storage as JSONB** — `knowledge_assessments.questions` is JSONB. `correct` field
   withheld from GET response until submission; revealed in submit response

4. **Career Target Append-Only** — No `is_current` flag. Most-recent = highest `created_at`

5. **Weekly Report Cron** — Separate `POST /api/cron/weekly-report` endpoint, `0 8 * * 1`
   in `vercel.json`. Idempotent via `ON CONFLICT (user_id, week_id) DO NOTHING`

6. **Gap Analysis Fail-Safe** — Any AI error returns HTTP 503; zero rows written. Previous
   reports are always unaffected. User retries immediately with no cooldown

---

## Implementation Phases

### Phase A — Database Schema (blocker for all other work)

**Tasks**:
1. Add `domain TEXT NULLABLE` to `topics` table in `schema.ts`
2. Add `career_targets` table to `schema.ts`
3. Add `knowledge_assessments` table with JSONB questions to `schema.ts`
4. Add `skill_gap_reports` table with JSONB fields to `schema.ts`
5. Add `weekly_reports` table to `schema.ts`
6. Run `drizzle-kit push` to apply schema to Neon database
7. Add unit tests for `applyAssessmentModifier()` (3 score ranges)

**Files**: `src/lib/db/schema.ts`, `src/lib/spaced-repetition/assessment-modifier.ts`

---

### Phase B — AI Generation Functions

**Tasks**:
1. Add `generateAssessment(topicTitle, topicDescription, notes?)` to `generate.ts`
   — Returns `{ questions: AssessmentQuestion[] }` (3–5 questions, 4 options each)
   — MOCK_AI returns canned questions for testing
2. Add `generateGapAnalysis(careerTarget, completedTopics[])` to `generate.ts`
   — Returns `{ coveredSkills, missingSkills, suggestedGoals }` (Zod schema)
   — MOCK_AI returns canned report for testing
3. Add `generateWeeklyInsight(careerTarget?, weekMetrics)` to `generate.ts`
   — Returns `string` (single insight sentence)
   — On failure: caller catches and uses fallback phrase (not thrown)
4. Add `inferTopicDomains(topics[{ id, title, description }])` to `generate.ts`
   — Returns `Array<{ id, domain }>` (batch up to 50)
   — MOCK_AI returns predictable domains for testing

**Files**: `src/lib/ai/generate.ts`

---

### Phase C — Assessment API Endpoints

**Tasks**:
1. `POST /api/topics/[topicId]/assessment` route
   — Same-day check query; if exists, return with `alreadyGeneratedToday: true`
   — Else: call `generateAssessment()`, insert row, return 201 (correct withheld)
   — 503 on AI failure; topic untouched
2. `POST /api/assessments/[assessmentId]/submit` route
   — Validate answers array; compute score
   — Call `applyAssessmentModifier()`; update topic FSRS fields
   — If score < 50: insert extra review DailyPlanTask within 3 days
   — Return 200 with full questions (correct revealed); 409 if already submitted

**Files**: `src/app/api/topics/[topicId]/assessment/route.ts`,
`src/app/api/assessments/[assessmentId]/submit/route.ts`

---

### Phase D — Career Target & Gap Analysis API Endpoints

**Tasks**:
1. `GET /api/career/target` — list all versions + current
2. `POST /api/career/target` — insert new version row; Zod validation
3. `POST /api/career/gap-analysis` — check career target exists; call `generateGapAnalysis()`;
   insert row; 422 if no target; 503 on AI failure (no row written)
4. `GET /api/career/gap-analysis` — list all reports + compute stale flag (FR-005)
5. `POST /api/career/gap-analysis/[reportId]/create-goal` — extract suggestion by index;
   call existing goal creation logic; return goal shape

**Files**: `src/app/api/career/target/route.ts`,
`src/app/api/career/gap-analysis/route.ts`,
`src/app/api/career/gap-analysis/[reportId]/create-goal/route.ts`

---

### Phase E — Analytics API Endpoint

**Tasks**:
1. `GET /api/analytics` route — execute 4 aggregation queries in parallel (weekly velocity,
   domain coverage, confidence trends, projected completion)
2. Lazy domain inference: before responding, query NULL-domain topics (up to 50), call
   `inferTopicDomains()`, `UPDATE topics SET domain = $domain WHERE id = $id` for results
3. Handle `goalId` query param filter (scope all queries to that goal)
4. Retention health calculation: % topics with avg confidence ≥ 4 vs ≤ 2

**Files**: `src/app/api/analytics/route.ts`

---

### Phase F — Weekly Report Cron

**Tasks**:
1. Add `weeklyReportEmail(metrics, insight)` template to `templates.ts`
2. `POST /api/cron/weekly-report` route:
   - Validate CRON_SECRET; return 401 if invalid
   - Compute ISO week_id for previous Monday
   - Query all users with sessions in last 7 days
   - For each user: aggregate metrics, call `generateWeeklyInsight()` (fallback on failure),
     INSERT into weekly_reports (ON CONFLICT DO NOTHING), send email if opted-in
   - Return summary counts
3. Add cron entry to `vercel.json`: `{ "path": "/api/cron/weekly-report", "schedule": "0 8 * * 1" }`
4. `GET /api/reports/weekly` route — list user's weekly reports most-recent first

**Files**: `src/lib/email/templates.ts`, `src/app/api/cron/weekly-report/route.ts`,
`src/app/api/reports/weekly/route.ts`, `vercel.json`

---

### Phase G — UI Pages and Components

**Tasks**:
1. `AssessmentModal` component — triggered from topic node; shows questions one at a time;
   submits via `POST /api/assessments/:id/submit`; shows score + reinforcement indicator
2. "Request Assessment" trigger on topic detail view (topic must be complete/known)
3. `src/app/career/page.tsx` — career target input form + gap analysis trigger + most-recent
   report display with suggested goals; stale prompt banner
4. `src/app/career/history/page.tsx` — all career target versions in timeline
5. `GapReportCard` + `SuggestedGoalItem` (with "Add goal" action)
6. `src/app/analytics/page.tsx` — 3-panel layout: velocity chart, domain map, confidence trends
7. `WeeklyVelocityChart`, `DomainCoverageMap`, `ConfidenceTrendChart` components
   (using Recharts or similar — already available in shadcn/ui ecosystem)
8. `src/app/reports/page.tsx` — expandable list of weekly reports
9. `WeeklyReportCard` component — shows metrics + AI insight + fallback badge if used
10. NavBar update: add links for Analytics, Career, Reports

---

### Phase H — Data Export & Account Deletion Extensions

**Tasks**:
1. Extend `GET /api/account/export` to include `careerTargets`, `skillGapReports`,
   `knowledgeAssessments`, `weeklyReports` arrays in the JSON export
2. Extend `DELETE /api/account` cascade deletion to cover the 4 new tables

**Files**: `src/app/api/account/export/route.ts`, `src/app/api/account/delete/route.ts`

---

## Integration Dependencies (from `001-ai-study-guide-app`)

| 001 Artifact | How 002 Uses It |
|-------------|-----------------|
| `src/lib/spaced-repetition/fsrs.ts` | Read-only; `applyAssessmentModifier` wraps its output |
| `src/lib/ai/generate.ts` | Extended with 4 new generation functions |
| `src/lib/db/schema.ts` | Extended with 4 new tables + 1 column |
| `src/lib/email/templates.ts` | Extended with weekly report template |
| `src/app/api/goals/route.ts` | Called internally by create-goal-from-suggestion endpoint |
| `src/app/api/account/export/route.ts` | Extended with new entities |
| `src/app/api/account/delete/route.ts` | Extended with new cascade deletions |
| `vercel.json` | Extended with new cron entry |

---

## Environment Variables

No new environment variables required. All 002 features use:

| Variable | From | Notes |
|----------|------|-------|
| `DATABASE_URL` | 001 | Neon PostgreSQL — new tables added via migration |
| `ANTHROPIC_API_KEY` | 001 | Required for assessment gen, gap analysis, weekly insights |
| `MOCK_AI` | 001 | Set to "true" to bypass all AI calls (canned responses) |
| `CRON_SECRET` | 001 | Reused for new weekly-report cron endpoint |
| `RESEND_API_KEY` | 001 | Reused for weekly report emails |
| `RESEND_FROM_EMAIL` | 001 | Reused for weekly report sender |

---

## Open Questions / Deferred Items

- **Chart library**: shadcn/ui doesn't bundle a chart lib; Recharts is the standard
  companion. Add as `pnpm add recharts` in Phase G — confirm it's not already installed
- **Domain coverage "gap" threshold**: FR-006 says < 3 topics = gap domain; this is
  hardcoded in the analytics query. Could be made configurable in future versions
- **Assessment history view**: Not in v1 UI scope; assessments are accessible via export
  (FR-010) and visible on the topic node after generation. A dedicated assessment history
  page is deferred
- **Multi-language AI outputs**: All AI prompts produce output in Portuguese (pt-BR)
  matching the user's app language. Prompts should specify language in the system message
