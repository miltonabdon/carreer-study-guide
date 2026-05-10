# Tasks: AI-Powered Personal Study Guide

**Input**: Design documents from `specs/001-ai-study-guide-app/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

**Tech Stack**: TypeScript 5, Next.js 14 (App Router), PostgreSQL 16 + Drizzle ORM, Redis, Anthropic `claude-sonnet-4-6` via Vercel AI SDK, NextAuth.js v5, Tailwind CSS, shadcn/ui, Zod, Vitest, Playwright

**Tests**: No test tasks generated unless marked. Unit tests for FSRS algorithm and E2E for core flows are included (critical correctness requirement).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story from spec.md (US1–US5) or FR label for cross-cutting features
- No story label = setup / foundational / polish

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Create the Next.js project, tooling, and local dev environment.

- [X] T001 Initialize Next.js 14 project with TypeScript strict mode and App Router at repository root (`npx create-next-app@latest . --typescript --tailwind --app --src-dir`)
- [X] T002 Install and configure shadcn/ui component library (`npx shadcn-ui@latest init`); set theme, radius, and CSS variables in `src/app/globals.css`
- [X] T003 [P] Configure ESLint and Prettier with shared config in `.eslintrc.json` and `.prettierrc`
- [X] T004 [P] Create `docker-compose.yml` at project root with PostgreSQL 16 and Redis 7 services (named volumes, health checks)
- [X] T005 Create `.env.local.example` listing all required keys: `DATABASE_URL`, `REDIS_URL`, `ANTHROPIC_API_KEY`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before any user story can be implemented.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T006 Define Drizzle ORM schema for all seven entities (users, learning_goals, learning_paths, topics with FSRS fields, study_sessions, daily_plans, daily_plan_tasks) in `src/lib/db/schema.ts` per `data-model.md`
- [X] T007 Configure Drizzle client and run initial migration (`npx drizzle-kit generate && npx drizzle-kit migrate`); create `src/lib/db/index.ts` exporting the db client
- [X] T008 Configure NextAuth.js v5 with credentials provider (email + bcrypt password), Drizzle session adapter, and session strategy in `src/lib/auth.ts`
- [X] T009 [P] Create authentication API routes (register POST, login POST, logout POST) in `src/app/api/auth/[...nextauth]/route.ts` and `src/app/api/auth/register/route.ts`
- [X] T010 [P] Create login page (`src/app/(auth)/login/page.tsx`) and register page (`src/app/(auth)/register/page.tsx`) using shadcn/ui Form, Input, and Button components
- [X] T011 Create Next.js middleware to protect all routes except `/(auth)/*` and `/api/auth/*` in `src/middleware.ts` using NextAuth session check
- [X] T012 Implement FSRS v5 spaced repetition algorithm as pure functions in `src/lib/spaced-repetition/fsrs.ts` with types in `src/lib/spaced-repetition/types.ts` (see implementation guide in `quickstart.md`)
- [X] T013 Write unit tests for FSRS algorithm covering all rating×state combinations and interval calculations in `tests/unit/spaced-repetition/fsrs.test.ts` using Vitest
- [X] T014 [P] Create Anthropic Claude client wrapper in `src/lib/ai/client.ts` (exports configured `anthropic` instance); create all system prompts as exported constants in `src/lib/ai/prompts.ts`
- [X] T015 [P] Implement `generateLearningPath()` using Vercel AI SDK `generateObject` with Zod schema in `src/lib/ai/generate.ts` (see `quickstart.md` for schema and prompt)
- [X] T016 [P] Create base Zod request validation schemas for all API endpoints in `src/lib/validations/` (one file per resource: `goals.ts`, `sessions.ts`, `plans.ts`)

**Checkpoint**: Auth works (register + login + protected routes), FSRS tests pass, AI path generator runs without errors.

---

## Phase 3: User Story 2 — Structured Learning Path per Goal (Priority: P2)

**Goal**: User can create a learning goal, receive an AI-generated ordered learning path, and navigate topics with their statuses.

> **Dependency note**: US2 must be implemented before US1 because US1 requires at least one goal and path to exist to be testable end-to-end.

**Independent Test**: Create a goal titled "Master RAG" → verify the system returns 8–15 ordered topics with dependencies and estimated durations within 60 seconds.

- [X] T017 [P] [US2] Implement Goals list + create API: `GET /api/goals` (returns goals with progress) and `POST /api/goals` (creates goal, calls `generateLearningPath()`, persists topics) in `src/app/api/goals/route.ts`
- [X] T018 [P] [US2] Implement Goal detail API: `PATCH /api/goals/[goalId]/route.ts` (update fields + status transitions) and `DELETE /api/goals/[goalId]/route.ts` (archive)
- [X] T019 [US2] Implement Learning Path API: `GET /api/goals/[goalId]/path/route.ts` returning path + all topics with FSRS state and status
- [X] T020 [US2] Implement path regeneration endpoint: `POST /api/goals/[goalId]/path/regenerate/route.ts` (archives old path, generates new one, preserves completed topic titles)
- [X] T021 [P] [US2] Implement Topic update API: `PATCH /api/topics/[topicId]/route.ts` supporting status change to `skipped`/`unlocked`, and update of `resourceUrl` and `notes`
- [X] T022 [P] [US2] Create Goals list page at `src/app/goals/page.tsx` showing all goals with progress bars and a "New Goal" button
- [X] T023 [P] [US2] Create `GoalCard` component (`src/components/goals/GoalCard.tsx`) showing title, priority badge, completion %, target date, at-risk warning; and `GoalCreateForm` dialog (`src/components/goals/GoalCreateForm.tsx`) with title, description, priority, optional target date fields
- [X] T024 [US2] Create Learning Path page at `src/app/goals/[goalId]/path/page.tsx` showing the ordered topic list with phase grouping, estimated total duration, and completion percentage
- [X] T025 [US2] Create `PathTimeline` component (`src/components/goals/PathTimeline.tsx`) rendering topics as a vertical list with locked/unlocked/complete/skipped states; and `TopicNode` component (`src/components/goals/TopicNode.tsx`) with resource URL link, notes editor, and skip/unskip toggle

**Checkpoint**: User can create a goal, see an AI-generated learning path with ordered topics, and mark topics as skipped or add resource URLs.

---

## Phase 4: User Story 1 — Daily Guided Study Plan (Priority: P1) 🎯 MVP

**Goal**: User opens the app each day and immediately sees a prioritized list of 2–5 study tasks generated from active goals, overdue reviews, and available time.

**Independent Test**: With at least one active goal and learning path (from Phase 3), log in → open dashboard → verify today's plan appears within 3 seconds with named topics, types (new_learning/review), and estimated durations.

- [X] T026 [US1] Implement daily plan generator in `src/lib/planner/index.ts`: (1) query due FSRS reviews, (2) query next unlocked topics per active goal, (3) call `generateObject` to select and prioritize tasks within `daily_available_minutes`, (4) persist DailyPlan + DailyPlanTasks to DB
- [X] T027 [US1] Implement Daily Plan API: `GET /api/plans/today/route.ts` — returns today's plan (generates via `generateDailyPlan()` if not cached), caches result in Redis with TTL set to midnight in user's timezone
- [X] T028 [US1] Implement task completion API: `PATCH /api/plans/today/tasks/[taskId]/route.ts` — accepts `status`, `durationMinutes`, `confidenceRating`, `notes`; writes StudySession, updates Topic FSRS fields and status, unlocks next topic if applicable, invalidates Redis plan cache — all in a single DB transaction
- [X] T029 [US1] Create Dashboard page at `src/app/dashboard/page.tsx` as the app's home route; fetches today's plan on load and re-fetches after any task completion
- [X] T030 [P] [US1] Create `DailyPlanCard` component (`src/components/dashboard/DailyPlanCard.tsx`) showing plan header (date, total available time, completion progress bar) and the ordered task list
- [X] T031 [P] [US1] Create `TaskItem` component (`src/components/dashboard/TaskItem.tsx`) showing topic name, goal name, task type badge (new/review), suggested duration, and action buttons; when "Complete" is clicked, opens inline confidence rating (1–5 stars/buttons) and optional notes before submitting
- [X] T032 [US1] Create `StreakBadge` component (`src/components/dashboard/StreakBadge.tsx`) showing current study streak count with fire icon; place in Dashboard header

**Checkpoint (MVP)**: User can register, create a goal, see an AI-generated plan, complete a task with confidence rating, and see the daily progress indicator update. This is the complete MVP.

---

## Phase 5: User Story 3 — Spaced Repetition and Review Scheduling (Priority: P2)

**Goal**: Topics studied previously resurface automatically at the right time for review; confidence ratings after each session adjust the next review interval.

**Independent Test**: Study 3 topics on day 1 with confidence ratings of 3, 4, 5 → verify that `next_review_at` values are different for each topic and that low-confidence topics appear sooner in subsequent daily plans.

- [X] T033 [US3] Implement Sessions list API: `GET /api/sessions/route.ts` with query params `topicId`, `from`, `to`, `limit`, `offset`
- [X] T034 [US3] Verify that the FSRS update in T028 (`PATCH /api/plans/today/tasks/[taskId]`) correctly sets `topic.fsrs_state`, `topic.fsrs_stability`, `topic.fsrs_difficulty`, `topic.next_review_at`, and `topic.lapses` using the algorithm from T012; write integration test in `tests/integration/sessions.test.ts`
- [X] T035 [US3] Update daily plan generator (`src/lib/planner/index.ts`): enforce FR-006 — overdue reviews (topics where `next_review_at <= NOW()`) always fill the plan before new-learning tasks; cap total daily minutes at `user.daily_available_minutes`
- [X] T036 [P] [US3] Add `isOverdueReview` visual indicator (orange badge) to `TaskItem` component for review tasks that are past their scheduled date (`src/components/dashboard/TaskItem.tsx`)
- [X] T037 [P] [US3] Add review-due dot indicator to `TopicNode` on the learning path page when `topic.next_review_at` is in the past (`src/components/goals/TopicNode.tsx`)
- [X] T038 [US3] Add overdue review count to `StreakBadge` area on Dashboard: show "X reviews overdue" warning if count > 0 (`src/components/dashboard/StreakBadge.tsx`)

**Checkpoint**: Topics scheduled for review appear in the daily plan at the right time; the confidence rating correctly adjusts the next review interval.

---

## Phase 6: User Story 5 — Goal Definition and Career Alignment (Priority: P3)

**Goal**: User can define goals linked to career outcomes with priorities and target dates; the system aligns daily plan time allocation to goal priority and warns when deadlines are at risk.

**Independent Test**: Create two goals — one high priority (target 60 days) and one low priority — verify that the high-priority goal receives more daily plan time and that a warning appears when the goal is behind pace.

- [X] T039 [US5] Implement deadline risk detection logic in `src/lib/planner/risk.ts`: given completed topics, total topics, target date, and `daily_available_minutes`, calculate whether completion is on track; return `atRisk: true` if estimated completion date exceeds target date
- [X] T040 [US5] Wire risk detection into `GET /api/goals` response: each goal item includes `atRisk: boolean` and `estimatedCompletionDate`; call `risk.ts` function for each active goal with target date
- [X] T041 [P] [US5] Add `atRisk` warning banner to `GoalCard` component: show amber warning with message "Behind pace — adjust scope or increase daily time" when `goal.atRisk === true` (`src/components/goals/GoalCard.tsx`)
- [X] T042 [US5] Update daily plan generator to allocate new-learning task slots proportionally to goal priority (`high=3, medium=2, low=1` weight) when multiple goals have available topics (`src/lib/planner/index.ts`)

**Checkpoint**: High-priority goal topics appear more frequently in the daily plan; at-risk warning is visible on the goal card.

---

## Phase 7: User Story 4 — Progress Visibility and Evolution Dashboard (Priority: P3)

**Goal**: User can view a visual history of study activity, evolution across goals, and current/longest streaks — making progress visible and motivating.

**Independent Test**: After logging study sessions on 5 different days, verify the progress page shows: a calendar heatmap with those 5 days highlighted, per-goal completion percentage, current streak count, and an "overdue reviews" count.

- [X] T043 [US4] Implement Progress API: `GET /api/progress/route.ts` returning streaks (current, longest, lastStudyDate), 90-day weekly activity array (date + session count + total minutes), per-goal progress (completionPercent, atRisk, estimatedCompletionDate), overdueReviews count, totalTopicsStudied, totalStudyMinutes
- [X] T044 [US4] Create Progress page at `src/app/progress/page.tsx` with a header section (streaks + total stats) and a goals section (per-goal progress cards)
- [X] T045 [P] [US4] Create `StudyHeatmap` component (`src/components/progress/StudyHeatmap.tsx`): 90-day calendar grid where each day cell is colored by session count (0=gray, 1=light-green, 3+=dark-green); uses `weeklyActivity` data from Progress API
- [X] T046 [P] [US4] Create `GoalProgressCard` (`src/components/progress/GoalProgressCard.tsx`) showing goal title, priority badge, completion progress bar, topics completed/total, at-risk warning if applicable, estimated completion date
- [X] T047 [P] [US4] Create `StreaksSection` (`src/components/progress/StreaksSection.tsx`) showing current streak with fire icon, longest streak record, and last study date

**Checkpoint**: Progress page shows accurate heatmap, per-goal completion bars, and streak count after one week of use.

---

## Phase 8: FR-014 — Interactive AI Coaching Chat

**Goal**: User can open the AI coach panel and ask questions about any topic, receiving streaming personalized explanations adapted to their software architecture background.

**Independent Test**: Open coach page, select a topic from an active learning path (e.g., "RAG pipeline"), ask "explain how chunking works" → verify a streamed response appears within 1 second of submission, the response references the topic context, and the conversation persists for the session.

- [X] T048 Implement AI Coach streaming API: `POST /api/coach/route.ts` — extracts last 8 messages from request, fetches topic context if `topicId` provided, fetches user profile, builds system prompt via `getCoachingSystemPrompt()` from `src/lib/ai/prompts.ts`, calls `streamText()`, returns `toDataStreamResponse()`
- [X] T049 [P] Create Coach page layout at `src/app/coach/page.tsx` with a topic selector dropdown (lists active topics from all goals) and the chat window below
- [X] T050 [P] Create `ChatWindow` component (`src/components/coach/ChatWindow.tsx`): renders message list, scrolls to bottom on new message, shows typing indicator while streaming
- [X] T051 [P] Create `MessageBubble` component (`src/components/coach/MessageBubble.tsx`): distinct styling for user (right-aligned, primary color) and assistant (left-aligned, muted) messages; renders markdown in assistant messages
- [X] T052 Create `InputBar` component (`src/components/coach/InputBar.tsx`): auto-resizing textarea, submit on Enter (shift+Enter for newline), disabled state while streaming
- [X] T053 Create `useCoachChat` hook in `src/lib/hooks/useCoachChat.ts` wrapping Vercel AI SDK `useChat({ api: '/api/coach', body: { topicId } })` with error handling
- [X] T054 Wire topic context: when user selects a topic from the dropdown in `src/app/coach/page.tsx`, update the `topicId` in the `useCoachChat` hook body so subsequent messages include topic context in the server-side system prompt

**Checkpoint**: AI coaching chat streams responses, references the selected topic, and maintains conversation history for the session.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Navigation, error states, performance, and final validation.

- [X] T055 [P] Create persistent navigation layout (`src/components/ui/Navigation.tsx`) with links to Dashboard, Goals, Progress, and Coach; add to `src/app/layout.tsx` (only shown when authenticated)
- [X] T056 [P] Add global error boundary (`src/app/error.tsx`) and not-found page (`src/app/not-found.tsx`) with navigation back to dashboard
- [X] T057 [P] Add loading skeleton components for Dashboard plan loading and PathPage topic loading using shadcn/ui `Skeleton`; add to `src/app/dashboard/loading.tsx` and `src/app/goals/[goalId]/path/loading.tsx`
- [X] T058 Audit Redis cache invalidation paths: verify that every write to StudySession, Topic status change, or Goal status change clears the correct Redis keys in `src/lib/cache/invalidate.ts`
- [X] T059 [P] Write E2E test: register → create goal → complete first daily plan task → verify confidence updated on topic in `tests/e2e/daily-flow.spec.ts` using Playwright
- [X] T060 [P] Write E2E test: open coach → select topic → send message → verify streaming response appears in `tests/e2e/coach-chat.spec.ts`
- [X] T061 Run `quickstart.md` validation checklist: verify all key decisions and patterns are correctly implemented; update `quickstart.md` with any deviations discovered during implementation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **blocks all user story phases**
- **Phase 3 (US2)**: Depends on Phase 2 — **must complete before Phase 4 (US1)**
- **Phase 4 (US1)**: Depends on Phases 2 + 3 — this is the MVP endpoint
- **Phase 5 (US3)**: Depends on Phase 2 (FSRS algorithm from T012 and T013) + Phase 4 (T028)
- **Phase 6 (US5)**: Depends on Phase 2 (schema) + Phase 3 (goal creation); independent of Phases 4/5
- **Phase 7 (US4)**: Depends on Phase 4 (sessions exist) and Phase 5 (review data); can start partially after Phase 4
- **Phase 8 (Coach)**: Depends on Phase 2 (AI client from T014); independent of Phases 3–7
- **Phase 9 (Polish)**: Depends on all previous phases being substantially complete

### User Story Dependencies

```
Phase 1 → Phase 2 → Phase 3 (US2) → Phase 4 (US1) ← MVP ✓
                  ↘ Phase 5 (US3) ─────────────────┘
                  ↘ Phase 6 (US5) (independent of US1/US3)
                  ↘ Phase 8 (Coach) (independent of US1–US5)
Phase 4 + Phase 5 → Phase 7 (US4)
```

### Within Each Phase

- Models/schema → services/lib → API routes → UI components
- API routes before UI (or mock API for parallel development)
- FSRS algorithm (T012) must pass unit tests (T013) before being used in T028/T035

---

## Parallel Example: Phase 2 (Foundational)

```
# These can run in parallel after T007 (schema + migration):
Task T009: Auth API routes
Task T010: Auth UI pages
Task T014: AI client wrapper
Task T015: generateLearningPath function
Task T016: Zod validation schemas
```

## Parallel Example: Phase 4 (US1)

```
# These can run in parallel after T026 (planner logic):
Task T030: DailyPlanCard component
Task T031: TaskItem component
```

---

## Implementation Strategy

### MVP First (Phases 1–4 only, ~32 tasks)

1. Complete Phase 1: Setup (5 tasks)
2. Complete Phase 2: Foundational — CRITICAL, blocks everything (11 tasks)
3. Complete Phase 3: US2 — goal creation + learning paths (9 tasks)
4. Complete Phase 4: US1 — daily plan dashboard (7 tasks)
5. **STOP and VALIDATE**: User can register, create a goal, see an AI-generated plan, and complete tasks with confidence ratings
6. Demo or deploy MVP

### Incremental Delivery

- **After Phase 4**: Working daily study dashboard → deploy
- **After Phase 5**: Reviews appear automatically at the right time → deploy
- **After Phase 6**: Deadline warnings and priority-based time allocation → deploy
- **After Phase 7**: Visual progress dashboard → deploy
- **After Phase 8**: AI coaching chat active → deploy
- **After Phase 9**: Production-ready app

---

## Notes

- `[P]` tasks operate on different files — safe to parallelize
- `[US#]` maps every task to its user story for traceability
- Tasks in Phases 3–8 without `[P]` have sequential dependencies within their phase
- FSRS unit tests (T013) are mandatory — the entire scheduling system depends on algorithm correctness
- Commit after each phase checkpoint at minimum
- Redis cache invalidation (T058) is easy to miss — audit it explicitly before marking Phase 9 complete
- The coaching chat (Phase 8) can be developed concurrently with Phases 5–7 since it only depends on Phase 2
