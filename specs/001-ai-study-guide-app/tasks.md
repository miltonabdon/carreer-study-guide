# Tasks: AI-Powered Personal Study Guide — Etapa 4

**Input**: Design documents from `specs/001-ai-study-guide-app/`  
**Prerequisites**: plan.md ✓, spec.md ✓ (with clarifications), research.md ✓, data-model.md ✓, contracts/ ✓  
**Status**: MVP + Etapa 1–3 already implemented and deployed. This task list covers Etapa 4 features derived from `/speckit-clarify` session (2026-05-10).

**Stack**: Next.js 14, TypeScript, Drizzle ORM, NextAuth, Tailwind CSS  
**Deploy**: Vercel + Neon PostgreSQL + optional Redis

---

## Already Implemented (Etapas 1–3) — Do Not Re-Implement

- [x] User authentication (register, login, NextAuth)
- [x] Learning goal creation + AI learning path generation (MOCK_AI mode)
- [x] Daily plan generation (FSRS-based)
- [x] Task completion with confidence rating + FSRS card update
- [x] Dashboard, Goals, Progress, Coach pages
- [x] Flexible daily time (inline edit + regenerate)
- [x] YouTube embed in TopicNode
- [x] At-risk goal UX with estimated completion date
- [x] Daily email digest via Resend (Vercel cron)

---

## Phase 1: Setup

**Purpose**: Schema additions required before any Etapa 4 story can proceed

- [x] T001 Add `onboardingCompleted` boolean (default false) to users table in `src/lib/db/schema.ts` and run `npx drizzle-kit push`
- [x] T002 Add `gapDays` INT nullable and `gapResolved` boolean (default true) columns to `dailyPlans` table in `src/lib/db/schema.ts` and run `npx drizzle-kit push`
- [x] T003 [P] Create directory `src/app/onboarding/` and `src/app/settings/` with empty placeholder files

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Middleware logic that US1 (onboarding redirect) depends on

**⚠️ CRITICAL**: Must complete before US1 story work begins

- [x] T004 Update `src/middleware.ts` to redirect authenticated users with `onboardingCompleted = false` (read from JWT session) to `/onboarding` instead of `/dashboard`; add `/onboarding` to the list of public-accessible paths
- [x] T005 [P] Update `src/lib/auth.ts` to include `onboardingCompleted: boolean` in the session user object (read from DB on session creation) so middleware can check it without an extra DB round-trip

**Checkpoint**: Middleware updated — onboarding redirect active, US1 implementation can begin

---

## Phase 3: User Story 1 — Onboarding Wizard (FR-015) 🎯 MVP

**Goal**: First-time users complete a 2-step guided wizard before reaching the dashboard, eliminating the cold-start blank-dashboard problem.

**Independent Test**: Register new account → redirected to `/onboarding` → complete Step 1 (goal name + description) + Step 2 (priority, optional date, daily minutes) → land on `/dashboard` with generated plan → re-login never shows wizard again.

### Implementation

- [x] T006 [US1] Create `src/app/onboarding/layout.tsx` — minimal layout without NavBar (same pattern as `src/app/(auth)/layout.tsx`)
- [x] T007 [US1] Create `src/app/onboarding/page.tsx` — 2-step wizard: Step 1 = goal title input + description textarea; Step 2 = priority select (high/medium/low) + optional target date input + daily minutes slider (15–180, default 60); local state tracks current step; "Back" / "Next" / "Start Learning" buttons
- [x] T008 [US1] Create `src/app/api/account/onboarding/route.ts` — POST endpoint: validates body with Zod (title, description, priority, targetDate?, dailyMinutes), updates `users.dailyAvailableMinutes`, calls `POST /api/goals` internally with goal data, sets `users.onboardingCompleted = true`, returns `{ goalId }`
- [x] T009 [US1] Update `src/app/api/auth/register/route.ts` to set `onboardingCompleted: false` in the INSERT values for new users
- [x] T010 [US1] Wire `src/app/onboarding/page.tsx` to POST to `/api/account/onboarding` on final step submit; show spinner during the request (AI path generation can take up to 10s); on success redirect to `/dashboard`; on error show inline error message with retry

**Checkpoint**: New user registration → wizard → dashboard. Existing users bypass wizard.

---

## Phase 4: User Story 2 — AI Graceful Degradation (FR-016)

**Goal**: When the Anthropic API fails (no credits, timeout, 5xx), the app silently falls back to rule-based generation and shows a subtle amber banner — never a blocking error page.

**Independent Test**: Set `ANTHROPIC_API_KEY=invalid` with `MOCK_AI` unset → create a goal → 8-topic generic path is generated → banner "IA indisponível — usando plano padrão" appears → no 500 errors in network tab.

### Implementation

- [x] T011 [US2] Update `generateLearningPath()` in `src/lib/ai/generate.ts` — wrap `generateObject()` in try/catch; on any error fall back to `mockLearningPath()` and append `fallbackUsed: true` to the return value; update the return type to include `fallbackUsed: boolean`
- [x] T012 [US2] Update `generateDailyPlanWithAI()` in `src/lib/ai/generate.ts` — same pattern: wrap `generateObject()` in try/catch, fall back to mock logic, return `fallbackUsed: boolean`
- [x] T013 [US2] Update `src/app/api/goals/route.ts` POST to forward `fallbackUsed` from `generateLearningPath()` in the response body
- [x] T014 [US2] Update `src/app/api/plans/today/route.ts` GET to include `fallbackUsed: boolean` in the plan response object
- [x] T015 [P] [US2] Update `src/components/dashboard/DailyPlanCard.tsx` to render an amber info banner when `plan.fallbackUsed === true`: "IA indisponível — plano gerado por regras internas"
- [x] T016 [P] [US2] Update `src/components/goals/GoalCreateForm.tsx` to show amber banner when `response.path?.fallbackUsed === true` after goal creation: "IA indisponível — caminho de aprendizado padrão gerado"

**Checkpoint**: App works end-to-end with invalid API key. Amber banners appear. Zero 500 errors.

---

## Phase 5: User Story 3 — Data Export + Account Deletion (FR-017)

**Goal**: Users can download all their learning data as JSON and permanently delete their account, both accessible from a new Settings page.

**Independent Test**: (1) `GET /api/account/export` returns JSON with all user data; (2) `DELETE /api/account/delete` returns 204 and subsequent login returns 401.

### Implementation

- [x] T017 [US3] Verify `src/lib/db/schema.ts` has `onDelete: "cascade"` on all FK relations from `users.id` (learningGoals, dailyPlans, studySessions); add missing cascades and run `npx drizzle-kit push`
- [x] T018 [US3] Create `src/app/api/account/export/route.ts` — GET endpoint (authenticated): queries all data for `session.user.id` (goals → paths → topics, studySessions, dailyPlans with tasks); returns JSON response with header `Content-Disposition: attachment; filename="studyguide-export-YYYY-MM-DD.json"`
- [x] T019 [US3] Create `src/app/api/account/delete/route.ts` — DELETE endpoint (authenticated): deletes the `users` row (cascade handles children), returns 204; client should then call `signOut()` from NextAuth
- [x] T020 [US3] Create `src/app/settings/page.tsx` — settings page with two sections: "Exportar meus dados" button (triggers download via anchor with `href=/api/account/export`) and "Excluir conta" section with confirmation dialog (`window.confirm` or inline toggle) that calls `DELETE /api/account/delete` then `signOut({ callbackUrl: '/login' })`
- [x] T021 [US3] Add "Configurações" nav link to `src/components/layout/NavBar.tsx` pointing to `/settings`

**Checkpoint**: Settings accessible from nav. Export downloads valid JSON. Delete removes account.

---

## Phase 6: User Story 4 — Missed-Day Recovery Choice

**Goal**: When ≥2 consecutive missed study days are detected, a modal appears before the plan asking the user whether to recover missed content or resume normally.

**Independent Test**: Set most recent `plan_date` to 3 days ago in DB → open dashboard → `GapRecoveryModal` appears with gap info → choose "Retomar" → modal closes → normal plan shown → modal never reappears for same gap.

### Implementation

- [x] T022 [US4] Update `src/lib/planner/index.ts` `generateDailyPlan()`: after generating the plan, query the most recent `dailyPlans.planDate` for the user; if gap ≥ 2 days, set `gapDays = <number of missed days>` and `gapResolved = false` on the inserted plan row
- [x] T023 [US4] Create `src/app/api/plans/today/gap-resolve/route.ts` — POST endpoint accepting `{ choice: "recover" | "resume" }`: if "resume" sets `gapResolved = true` on today's plan; if "recover" sets `gapResolved = true` and creates placeholder `dailyPlans` for the next `gapDays` days each with a proportional subset of today's pending tasks; returns updated plan
- [x] T024 [US4] Update `src/app/api/plans/today/route.ts` GET response to include `gapDays: number | null` and `gapResolved: boolean` fields from the plan row
- [x] T025 [US4] Create `src/components/dashboard/GapRecoveryModal.tsx` — modal rendered when `plan.gapDays >= 2 && !plan.gapResolved`; shows "Você ficou X dias sem estudar" + two buttons: "Recuperar conteúdo perdido (próximos X dias)" and "Retomar com carga normal hoje"; on button click calls `POST /api/plans/today/gap-resolve`, updates local plan state, closes modal
- [x] T026 [US4] Update `src/app/dashboard/page.tsx` to import and render `<GapRecoveryModal>` when `plan?.gapDays >= 2 && !plan?.gapResolved`, overlaying the DailyPlanCard until choice is made

**Checkpoint**: Gap detected → modal shown → choice recorded → plan reflects recovery strategy.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T027 [P] Update `src/app/api/goals/[goalId]/path/regenerate/route.ts` to wrap AI call in try/catch with fallback (same pattern as T011) for consistency
- [x] T028 [P] Add error boundary around `src/app/onboarding/page.tsx` wizard: if API call fails show inline retry button, not a broken page
- [ ] T029 [P] Update `specs/001-ai-study-guide-app/data-model.md` to document new fields: `users.onboardingCompleted`, `dailyPlans.gapDays`, `dailyPlans.gapResolved`
- [ ] T030 Run full production smoke test after all stories: register → onboarding → dashboard → complete task → settings export → verify JSON contains all data; commit and push to trigger Vercel deploy

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Requires Phase 1 (T001 must exist for T005 session type)
- **Phase 3 (US1)**: Requires Phase 2 (T004 middleware redirect)
- **Phase 4 (US2)**: Can run in parallel with Phase 3 (only touches `src/lib/ai/` and components)
- **Phase 5 (US3)**: Requires T017 (cascade verification); otherwise parallel with Phase 3/4
- **Phase 6 (US4)**: Requires T002 (schema columns); otherwise parallel with Phase 3/4/5
- **Phase 7 (Polish)**: Requires all stories complete

### Parallel Opportunities

```
Phase 1 (T001, T002, T003) — all [P], run together
    ↓
Phase 2 (T004, T005) — run together
    ↓
Phase 3 (US1) ──────────────────────────────────────────┐
Phase 4 (US2) ← starts immediately, no Phase 2 needed   │
Phase 5 (US3) ← starts after T017                       │
Phase 6 (US4) ← starts after T002 from Phase 1         │
                                                         ↓
                                               Phase 7 (Polish)
```

---

## Implementation Strategy

### MVP First (US1 — Onboarding Wizard)

1. Complete Phase 1: T001–T003 (schema + directories)
2. Complete Phase 2: T004–T005 (middleware)
3. Complete Phase 3: T006–T010 (wizard UI + API)
4. **VALIDATE**: New user registration → wizard → dashboard
5. Deploy to Vercel → confirm works in production

### Incremental Delivery

1. Phase 1 + 2 → Foundation ready
2. US1 (onboarding) → Deploy — fixes cold-start problem immediately
3. US2 (AI fallback) in parallel → Makes app resilient for production
4. US3 (export/delete) → User data rights fulfilled
5. US4 (gap recovery) → Behavioral completeness
6. Phase 7 → Smoke test → Final deploy

---

## Summary

| Phase | Story | Tasks | Priority |
|-------|-------|-------|----------|
| 1 — Setup | — | T001–T003 | Blocking |
| 2 — Foundation | — | T004–T005 | Blocking |
| 3 — Onboarding Wizard | US1 | T006–T010 | P1 🎯 |
| 4 — AI Fallback | US2 | T011–T016 | P2 |
| 5 — Export/Delete | US3 | T017–T021 | P2 |
| 6 — Gap Recovery | US4 | T022–T026 | P3 |
| 7 — Polish | — | T027–T030 | Final |

**Total**: 30 tasks | **Parallel opportunities**: T001–T003 (Phase 1), T015–T016 (US2 banners), T027–T029 (Polish)  
**Suggested MVP scope**: Phases 1–3 (US1 Onboarding Wizard only — 10 tasks)
