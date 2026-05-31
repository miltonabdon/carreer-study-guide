# Tasks: AI-Powered Career Evolution Features

**Input**: Design documents from `specs/002-career-evolution-ai/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/api-endpoints.md ✓, quickstart.md ✓

**Organization**: Tasks grouped by user story (US1 P1, US2 P2, US3 P2, US4 P3) to enable
independent implementation, testing, and delivery of each feature area.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task in the same phase)
- **[Story]**: User story this task belongs to (US1–US4); absent in Setup and Foundational phases

---

## Phase 1: Setup

**Purpose**: Install new dependency needed for analytics charts.

- [ ] T001 Install recharts — run `pnpm add recharts` and verify no peer-dependency conflicts in package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database schema additions that MUST be live before any user story work begins.

**⚠️ CRITICAL**: No user story work can begin until this phase is fully complete.

- [ ] T002 Add `domain TEXT NULLABLE` column to the `topics` table definition in `src/lib/db/schema.ts`
- [ ] T003 Add `career_targets`, `knowledge_assessments`, `skill_gap_reports`, and `weekly_reports` table definitions to `src/lib/db/schema.ts` — use data-model.md for all fields, types, constraints, indexes, and unique constraints (including `(user_id, week_id)` on weekly_reports and `(user_id, topic_id, DATE(created_at))` on knowledge_assessments)
- [ ] T004 Run `npx drizzle-kit push` to apply all schema changes to the Neon database; confirm all 4 new tables and the `topics.domain` column exist in the database
- [ ] T005 Create `src/lib/spaced-repetition/assessment-modifier.ts` exporting `applyAssessmentModifier(topic, score)`: score ≥ 80 → multiply computed `next_review_at` offset by 1.25; score 50–79 → leave FSRS unchanged; score < 50 → set `next_review_at = NOW() + 3 days` and return `{ action: 'extended' | 'unchanged' | 'shortened' }`. Add Vitest unit tests in `src/lib/spaced-repetition/assessment-modifier.test.ts` covering all 3 score branches.

**Checkpoint**: All 4 tables exist in the DB; modifier passes all unit tests — user story phases can now begin.

---

## Phase 3: User Story 1 — AI Knowledge Validation Assessments (Priority: P1) 🎯 MVP

**Goal**: Users can request an AI-generated MCQ assessment for any completed topic, submit answers, and see the score automatically adjust the FSRS review schedule.

**Independent Test** (quickstart.md Scenarios 1–2):
1. `POST /api/topics/:topicId/assessment` (complete topic) → 201 with 3–5 questions, `correct` field absent
2. Submit all-correct answers → score 100, `fsrsAction: "extended"`, topic `next_review_at` extended
3. Re-request same topic same day → 200, `alreadyGeneratedToday: true`, no new AI call
4. Submit all-wrong answers → score 0, `reinforcementNeeded: true`, `next_review_at ≤ NOW()+3d`

- [ ] T006 [P] [US1] Add `generateAssessment(topicTitle, description, notes?)` to `src/lib/ai/generate.ts`: uses `generateObject` with Zod schema for `AssessmentQuestion[]` (3–5 items; each has `id`, `text`, `options: {a,b,c,d}`, `correct`, `dimension: 'recall'|'application'|'analysis'`); add MOCK_AI canned response returning exactly 3 predictable questions with known correct answers
- [ ] T007 [P] [US1] Create `src/app/api/topics/[topicId]/assessment/route.ts`: POST handler — verify topic belongs to authenticated user and status is `complete` or `known` (422 otherwise); query for same-day assessment row (`DATE(created_at) = today`) and return 200 with `alreadyGeneratedToday: true` if found (omit `correct` unless already submitted); otherwise call `generateAssessment()`, insert `knowledge_assessments` row, return 201 (omit `correct` field in all questions); return 503 on AI failure with message "Avaliação temporariamente indisponível — tente novamente em breve" (no row saved)
- [ ] T008 [US1] Create `src/app/api/assessments/[assessmentId]/submit/route.ts`: POST handler — validate `answers[]` array length and `questionId` values match the stored assessment; compute `score = (correct / total) × 100`; call `applyAssessmentModifier()` to update `topic.next_review_at` and related FSRS fields; if score < 50 insert an extra `DailyPlanTask` (type `review`) scheduled within the next 3 days; set `submitted_at = NOW()`, `fsrs_modified = true`; return 200 with all questions including revealed `correct` and `isCorrect` per question; return 409 if already submitted (idempotent: return existing result)
- [ ] T009 [US1] Create `src/components/assessments/QuestionCard.tsx`: displays a single MCQ question text and 4 radio-style option buttons (a/b/c/d); after reveal (post-submit), highlights the correct option in green and the user's wrong answer in red; accepts props `question`, `selectedAnswer`, `onSelect`, `revealed`
- [ ] T010 [US1] Create `src/components/assessments/AssessmentModal.tsx`: full-screen modal wrapping `QuestionCard` for each question in sequence (one at a time); tracks selected answers in local state; "Confirmar Resposta" advances to next question; "Enviar" on last question calls `POST /api/assessments/:id/submit`; on result shows score as percentage, `reinforcementNeeded` badge if score < 50, and all questions with revealed answers; dismiss closes the modal
- [ ] T011 [US1] Add assessment trigger to topic detail in `src/app/goals/[goalId]/[topicId]/page.tsx` (or `src/components/goals/TopicNode.tsx` if no separate topic page exists): show "Solicitar Avaliação" button only when topic status is `complete` or `known`; on click call `POST /api/topics/:id/assessment` then open `AssessmentModal` with the returned assessment data; if `alreadyGeneratedToday: true` open modal directly showing the existing result with timestamp note "Avaliação de hoje — feita às HH:MM"

**Checkpoint**: User Story 1 fully functional — complete a topic, request assessment, answer questions, verify FSRS change on topic card.

---

## Phase 4: User Story 2 — Career Target & Skill Gap Analysis (Priority: P2)

**Goal**: Users can define a free-text career target, request an AI gap analysis, view covered and missing skills with suggested goals, and create a new learning goal from a suggestion with one click.

**Independent Test** (quickstart.md Scenarios 3–5):
1. `POST /api/career/target` → 201 with id/description/createdAt
2. `POST /api/career/gap-analysis` → 201 with coveredSkills[], missingSkills[], suggestedGoals[3–5]
3. After 10+ new completed topics → `GET /api/career/gap-analysis` returns `stalePrompt: true`
4. `POST /api/career/gap-analysis/:id/create-goal { goalIndex: 0 }` → new goal in `GET /api/goals`
5. No career target → `POST /api/career/gap-analysis` returns 422

- [ ] T012 [P] [US2] Add `generateGapAnalysis(careerTarget, completedTopics[])` to `src/lib/ai/generate.ts`: uses `generateObject` with Zod schema `{ coveredSkills: string[], missingSkills: string[], suggestedGoals: z.array(z.object({ title: z.string(), rationale: z.string().max(200) })).min(3).max(5) }`; system prompt specifies output in pt-BR; add MOCK_AI canned report
- [ ] T013 [P] [US2] Create `src/app/api/career/target/route.ts`: GET handler returns `{ current: CareerTarget | null, history: CareerTarget[] }` ordered by `created_at DESC`; POST handler validates description (min 10 chars, max 1000), inserts new row (append-only), returns 201
- [ ] T014 [US2] Create `src/app/api/career/gap-analysis/route.ts`: POST handler checks most-recent career target exists (422 with "Defina seu objetivo de carreira antes de solicitar análise" if not); fetches all completed/known topic titles and descriptions for the user; calls `generateGapAnalysis()`; on AI error returns 503 (no row saved, existing reports unaffected); on success inserts `skill_gap_reports` row (with `career_target_snapshot`, `topics_count_at_generation`), returns 201. GET handler returns `{ reports[], stalePrompt: boolean, currentTopicsCount: number }` — stalePrompt is true when `currentTopicsCount − reports[0].topics_count_at_generation ≥ 10`
- [ ] T015 [US2] Create `src/app/api/career/gap-analysis/[reportId]/create-goal/route.ts`: POST handler validates `goalIndex` against `suggestedGoals` array length; pre-fills goal with `title = suggestedGoals[goalIndex].title` and `description = suggestedGoals[goalIndex].rationale`; calls existing goal creation logic (same path generation flow as `POST /api/goals`); returns standard goal response shape
- [ ] T016 [P] [US2] Create `src/components/career/CareerTargetForm.tsx`: textarea (min 10 / max 1000 chars) with char count; "Salvar objetivo" submit button; shows current target description if one exists with "Atualizar" label; client-side validation before POST
- [ ] T017 [P] [US2] Create `src/components/career/GapReportCard.tsx` and `src/components/career/SuggestedGoalItem.tsx`: `GapReportCard` shows generation timestamp, covered skills list, missing skills list, and a list of `SuggestedGoalItem`s; `SuggestedGoalItem` shows title, rationale, and "Adicionar Meta" button that calls `POST /api/career/gap-analysis/:reportId/create-goal` and displays success confirmation
- [ ] T018 [US2] Create `src/app/career/page.tsx`: career page layout — `CareerTargetForm` at top; "Analisar Gaps de Carreira" button (with loading state while analysis runs); stale prompt banner ("Seu perfil evoluiu — considere atualizar a análise") shown when `stalePrompt: true`; most-recent `GapReportCard` below; empty state when no career target is defined (show prompt and 3 example career targets per spec edge case)
- [ ] T019 [US2] Create `src/app/career/history/page.tsx`: chronological list of all career target versions from `GET /api/career/target → history[]`, each showing description and `createdAt` timestamp; "Versão atual" badge on the first entry

**Checkpoint**: User Story 2 fully functional — define target, run analysis, create goal from suggestion, view history, verify stale prompt after 10 topics.

---

## Phase 5: User Story 3 — Learning Analytics Dashboard (Priority: P2)

**Goal**: Users see a visual dashboard with weekly learning velocity, domain coverage map, per-goal confidence trends, and projected completion dates; filterable by goal.

**Independent Test** (quickstart.md Scenario 6):
1. `GET /api/analytics` → 200 with all 4 metric arrays and `retentionHealth`
2. `GET /api/analytics?goalId=:id` → all metrics scoped to that goal
3. First load triggers domain inference; second load returns `domainInferenceInProgress: false`
4. Domain coverage tooltip shows correct topic count per domain

- [ ] T020 [P] [US3] Add `inferTopicDomains(topics[{ id, title, description }][])` to `src/lib/ai/generate.ts`: uses `generateObject` with array Zod schema returning `{ id: string, domain: string }[]` (max 50 per call); add MOCK_AI canned domains returning predictable tech categories (e.g., "Inteligência Artificial", "Arquitetura de Software", "Cloud Computing")
- [ ] T021 [US3] Create `src/app/api/analytics/route.ts`: GET handler with optional `goalId` query param; lazy domain inference (query `topics WHERE domain IS NULL AND lg.user_id = $userId LIMIT 50`; if any found call `inferTopicDomains()` and batch UPDATE `topics.domain`; catch inference failure silently); run 4 aggregation queries in parallel (weekly velocity last 8 weeks, domain coverage with isGap flag, confidence trends per goal, projected completion dates); compute `retentionHealth` (% topics avg confidence ≥ 4 vs ≤ 2); set `domainInferenceInProgress` flag if any topics still have `domain IS NULL`
- [ ] T022 [P] [US3] Create `src/components/analytics/WeeklyVelocityChart.tsx`: Recharts `BarChart` with two grouped bars per week (topics completed in one color, hours studied in another); x-axis shows abbreviated week label (e.g., "19/05"); legend; empty-state message when no data
- [ ] T023 [P] [US3] Create `src/components/analytics/DomainCoverageMap.tsx`: grid of domain cards sorted by `completedTopics` descending; each card shows domain name, topic count, average confidence stars; `isGap` domains shown with lighter styling and "gap" badge; tooltip on hover/click shows list of topics in that domain with `dueForReview` count
- [ ] T024 [P] [US3] Create `src/components/analytics/ConfidenceTrendChart.tsx`: Recharts `LineChart` with one line per goal showing average confidence rating per week; goal names in legend; handles up to 5 goals before collapsing to a single combined average
- [ ] T025 [US3] Create `src/app/analytics/page.tsx`: analytics page with goal filter dropdown at top; `WeeklyVelocityChart` spanning full width; `DomainCoverageMap` and `ConfidenceTrendChart` side by side below; `retentionHealth` summary bar (strong / weak / total); "domain inference in progress" notice when `domainInferenceInProgress: true`; projected completion dates per active goal in a table below charts

**Checkpoint**: User Story 3 fully functional — view velocity chart, hover domain tooltip, filter by goal, see projected completion dates.

---

## Phase 6: User Story 4 — Weekly Learning Insights Report (Priority: P3)

**Goal**: A Monday cron generates and stores a weekly report with metrics and an AI insight sentence; email is delivered to opted-in users; all reports are viewable in-app in "Relatórios Semanais".

**Independent Test** (quickstart.md Scenarios 7–8):
1. `POST /api/cron/weekly-report` (CRON_SECRET header) → 200 with usersProcessed counts
2. `GET /api/reports/weekly` → `reports[0]` with correct `weekId` and non-empty `aiInsight`
3. Repeat `POST` same week → no duplicate row (idempotent)
4. AI call fails during cron → `fallbackUsed: true`; report still saved and delivered

- [ ] T026 [P] [US4] Add `generateWeeklyInsight(careerTarget: string | null, weekMetrics)` to `src/lib/ai/generate.ts`: uses `generateText` to produce a single insight sentence in pt-BR connecting the week's metrics to the career target (or general encouragement if no target); add MOCK_AI canned string; export `WEEKLY_INSIGHT_FALLBACK = "Continue estudando — cada semana conta!"` constant used by the cron handler when AI call fails
- [ ] T027 [P] [US4] Add `weeklyReportEmail(user, metrics, insight, appUrl)` template to `src/lib/email/templates.ts`: HTML email with header, weekly metrics table (topics, hours, streak, top domain, weakest domain), AI insight section, link back to `/reports`; styled consistently with the existing daily digest template
- [ ] T028 [US4] Create `src/app/api/cron/weekly-report/route.ts`: POST handler — validate `Authorization: Bearer {CRON_SECRET}` header (401 if invalid); compute `week_id` for the current ISO week (`YYYY-Www`); query all users who have at least 1 study session in the last 7 days; for each user: aggregate metrics (topics, hours, streak, top domain, weakest domain), fetch most-recent career target, call `generateWeeklyInsight()` (catch any error → use `WEEKLY_INSIGHT_FALLBACK`, set `fallbackUsed = true`); `INSERT INTO weekly_reports ... ON CONFLICT (user_id, week_id) DO NOTHING`; if `emailNotificationsEnabled = true` send email via Resend using `weeklyReportEmail()` template (catch email errors silently); return `{ usersProcessed, emailsSent, emailsSkipped, aiFailures, errors[] }`
- [ ] T029 [US4] Add weekly-report cron entry to `vercel.json`: `{ "path": "/api/cron/weekly-report", "schedule": "0 8 * * 1" }` in the `crons` array alongside the existing daily digest entry
- [ ] T030 [US4] Create `src/app/api/reports/weekly/route.ts`: GET handler — returns `{ reports[] }` for the authenticated user ordered by `period_start DESC`
- [ ] T031 [P] [US4] Create `src/components/reports/WeeklyReportCard.tsx`: expandable card (collapsed = week label + topics count + insight preview; expanded = full metrics table, complete insight text, fallback badge if `fallbackUsed: true`, email delivery timestamp if sent)
- [ ] T032 [US4] Create `src/app/reports/page.tsx`: "Relatórios Semanais" page; renders list of `WeeklyReportCard`s from `GET /api/reports/weekly`; empty state: "Seu primeiro relatório semanal será gerado na próxima segunda-feira"

**Checkpoint**: User Story 4 fully functional — trigger cron, verify report stored, confirm idempotency, view report in-app.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Data export and account deletion extensions, navigation additions, and final integration validation.

- [ ] T033 [P] Extend `src/app/api/account/export/route.ts`: add `careerTargets`, `skillGapReports`, `knowledgeAssessments`, and `weeklyReports` arrays to the exported JSON object (FR-010); include all fields per data-model.md; maintain existing format and ordering
- [ ] T034 [P] Extend `src/app/api/account/delete/route.ts` cascade: add DELETE statements for `knowledge_assessments`, `skill_gap_reports`, `career_targets`, `weekly_reports` WHERE `user_id = $userId` before the existing 001 cascade deletions (FR-010)
- [ ] T035 Update `src/components/layout/NavBar.tsx`: add navigation links for Analytics (`/analytics`), Career (`/career`), and Reports (`/reports`); maintain consistent styling with existing nav items
- [ ] T036 Run quickstart.md integration scenarios 1–10 end-to-end (manually or via curl); document any failures and verify all acceptance scenarios from spec.md pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all user story phases**
- **Phase 3 (US1)**: Requires Phase 2 (schema + modifier)
- **Phase 4 (US2)**: Requires Phase 2 (schema); independent of US1, US3, US4
- **Phase 5 (US3)**: Requires Phase 2 (`topics.domain`); independent of US1, US2, US4
- **Phase 6 (US4)**: Requires Phase 2 (`weekly_reports` table); independent of US1, US2, US3
- **Phase 7 (Polish)**: Requires all desired user story phases to be complete

### User Story Dependencies

- **US1 (P1)**: Blocked only by Phase 2 — no dependency on US2/US3/US4
- **US2 (P2)**: Blocked only by Phase 2 — no dependency on US1/US3/US4
- **US3 (P2)**: Blocked only by Phase 2 — no dependency on US1/US2/US4
- **US4 (P3)**: Blocked only by Phase 2 — no dependency on US1/US2/US3

### Within Each User Story

- AI generation function (generate.ts addition) → API endpoint → UI component → page integration
- [P]-marked tasks within a phase target different files and can run simultaneously

---

## Parallel Examples

### Phase 3 (US1) — launch T006 and T007 together:
```
T006: Add generateAssessment() to src/lib/ai/generate.ts
T007: Create POST /api/topics/[topicId]/assessment route
```

### Phase 4 (US2) — launch T012, T013, T016, T017 together:
```
T012: Add generateGapAnalysis() to src/lib/ai/generate.ts
T013: Create GET/POST /api/career/target route
T016: Create CareerTargetForm component
T017: Create GapReportCard + SuggestedGoalItem components
```

### Phase 5 (US3) — launch T020, T022, T023, T024 together:
```
T020: Add inferTopicDomains() to src/lib/ai/generate.ts
T022: Create WeeklyVelocityChart component
T023: Create DomainCoverageMap component
T024: Create ConfidenceTrendChart component
```

### Phase 6 (US4) — launch T026, T027, T031 together:
```
T026: Add generateWeeklyInsight() + fallback constant to src/lib/ai/generate.ts
T027: Add weeklyReportEmail() to src/lib/email/templates.ts
T031: Create WeeklyReportCard component
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) + Phase 2 (Foundational) — schema live, modifier tested
2. Complete Phase 3 (US1 — assessments)
3. **STOP and VALIDATE** — run quickstart.md Scenarios 1–2 end-to-end
4. Deploy to Vercel; verify assessment flow in production

### Incremental Delivery

1. Phase 1 + 2 → Foundation ready
2. Phase 3 (US1) → Assessment feature deployed (MVP)
3. Phase 4 (US2) → Career target + gap analysis deployed
4. Phase 5 (US3) → Analytics dashboard deployed
5. Phase 6 (US4) → Weekly reports deployed
6. Phase 7 → Export, deletion, navigation finalized

---

## Notes

- `MOCK_AI=true` (`.env.local`) enables development of all AI-dependent tasks without Anthropic credits
- `drizzle-kit push` (T004) must complete before any route that reads or writes the new tables
- `vercel.json` cron (T029) only fires in Vercel deployment — test locally via direct `POST /api/cron/weekly-report` with `Authorization: Bearer {CRON_SECRET}` header
- Recharts (T001): if already in `package.json`, skip the install step and proceed
- Each quickstart.md scenario maps to exactly one phase checkpoint for traceability
