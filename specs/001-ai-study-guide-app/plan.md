# Implementation Plan: AI-Powered Personal Study Guide

**Branch**: `main` | **Date**: 2026-05-10 | **Spec**: [spec.md](spec.md)

---

## Summary

A full-stack web application that acts as an intelligent personal learning companion for a software architect studying AI, cloud computing, and architecture leadership. The system generates personalized daily study plans using spaced repetition (FSRS algorithm), tracks progress across multiple learning goals, and provides an AI coaching chat interface. Built with Next.js 14, PostgreSQL (Neon), and the Anthropic SDK with a mock fallback mode.

**Current status**: MVP + Etapa 3 features fully implemented and deployed to production at https://carreer-study-guide.vercel.app.

---

## Technical Context

**Language/Version**: TypeScript 5.x + Node.js 18  
**Primary Dependencies**: Next.js 14.2, Drizzle ORM 0.30, NextAuth.js 4, Anthropic AI SDK (via `ai` package), ioredis 5, Resend, Zod 3, Tailwind CSS 3, shadcn/ui  
**Storage**: PostgreSQL via Neon (serverless) + Redis via ioredis (optional, graceful degradation — no Redis = no caching, app still works)  
**Testing**: Vitest (unit tests for FSRS algorithm)  
**Target Platform**: Web browser, deployed on Vercel (serverless functions)  
**Project Type**: Full-stack web application (Next.js App Router, API Routes as serverless functions)  
**Performance Goals**: Daily plan visible within 3s (SC-002); learning path generated within 60s (SC-001)  
**Constraints**: Serverless (no long-lived processes); `ioredis` needs `REDIS_URL` env var — graceful null fallback implemented; AI needs `ANTHROPIC_API_KEY` or `MOCK_AI=true`  
**Scale/Scope**: Single user per account; personal productivity tool; free-tier infrastructure (Neon 500MB, Upstash 10k/day, Vercel free)

---

## Constitution Check

*Constitution v1.0.0 — see `.specify/memory/constitution.md` for full principles.*

**Gates** (Principles I–VI):
- ✓ **I. Direct Data Access** — Drizzle ORM used directly in route handlers; no repository classes
- ✓ **II. Environment-Level Feature Control** — `MOCK_AI=true` env-var toggle; no runtime feature flags
- ✓ **III. Graceful Degradation** — Redis null fallback, AI rule-based fallback, Resend silent-fail
- ✓ **IV. Security Baseline** — bcrypt passwords, JWT sessions, middleware route protection, SHA-256 reset tokens
- ✓ **V. Spec-Driven Development** — all features traced to `FR-xxx` entries and `tasks.md` tasks
- ✓ **VI. Lean Architecture** — no backwards-compat shims; schema is fresh; MOCK_AI path returns identical types

---

## Project Structure

### Documentation (this feature)

```text
specs/001-ai-study-guide-app/
├── plan.md         ← This file
├── spec.md         ← Feature specification (with clarifications)
├── research.md     ← Tech decisions (FSRS, stack, AI, auth, caching)
├── data-model.md   ← Entity definitions and DB schema
├── contracts/      ← API endpoint contracts
├── quickstart.md   ← Integration scenarios and test flows
└── tasks.md        ← Task breakdown (managed by /speckit-tasks)
```

### Source Code

```text
src/
├── app/
│   ├── (auth)/                  # login, register pages
│   ├── dashboard/               # daily plan view
│   ├── goals/                   # goal list + path timeline
│   ├── progress/                # heatmap, streaks, per-goal stats
│   ├── coach/                   # AI chat interface
│   └── api/
│       ├── auth/                # NextAuth + register endpoint
│       ├── goals/               # CRUD goals, path generation, path regen
│       ├── plans/today/         # daily plan GET, task PATCH, time regen
│       ├── progress/            # stats aggregation
│       ├── sessions/            # study session log
│       ├── topics/              # topic PATCH (resourceUrl, notes, status)
│       ├── coach/               # AI chat POST
│       └── email/daily-digest/  # Vercel cron endpoint
├── components/
│   ├── dashboard/               # DailyPlanCard, TaskItem, StreakBadge
│   ├── goals/                   # GoalCard, GoalCreateForm, TopicNode, PathTimeline
│   ├── progress/                # GoalProgressCard, StudyHeatmap, StreaksSection
│   ├── coach/                   # ChatWindow, MessageBubble, InputBar
│   └── layout/                  # AppShell, NavBar
└── lib/
    ├── ai/                      # Anthropic client, generate.ts (mock + real), prompts
    ├── auth.ts                  # NextAuth config
    ├── db/                      # Drizzle client + schema.ts
    ├── email/templates.ts       # Resend HTML email template
    ├── hooks/                   # useCoachChat
    ├── planner/                 # generateDailyPlan, risk.ts (atRisk calc)
    ├── redis.ts                 # Optional ioredis client (null if no REDIS_URL)
    ├── spaced-repetition/       # FSRS algorithm (fsrs.ts, types.ts)
    ├── utils.ts                 # cn(), getYouTubeVideoId()
    └── validations/             # Zod schemas for all endpoints
```

---

## Implemented Features (Etapas 1–3)

### Etapa 1 — Core MVP
- User registration and login (NextAuth credentials + bcrypt)
- Learning goal creation with AI-generated learning path (FSRS topics)
- Daily plan generation (FSRS-based, respects daily time budget)
- Task completion with confidence rating (1–5) → FSRS card update
- Topic unlock progression (first topic unlocked, rest locked in order)
- Dashboard with plan and streak counter
- Goals page with progress per goal and atRisk detection
- Path timeline page with topic nodes (resource URL, notes, YouTube embed)
- Progress page with heatmap, streaks, per-goal progress cards
- AI coach chat (mock mode: returns canned responses; real mode: Anthropic claude-3-haiku)

### Etapa 2 — Bug Fixes & Stability
- Fixed Anthropic zero-credits crash → MOCK_AI=true mode
- Fixed Next.js 14/15 params.use() pattern
- Fixed Redis stale cache on plan invalidation
- Fixed progress page crash on empty data

### Etapa 3 — UX Improvements
- **Flexible daily time**: inline edit in DailyPlanCard → POST /api/plans/today/regenerate
- **YouTube embed**: getYouTubeVideoId() utility + TopicNode thumbnail/player toggle
- **At-risk UX**: GoalCard + GoalProgressCard show days late, estimated completion date, contextual suggestion
- **Email digest**: Resend integration + Vercel cron (daily at 10h UTC) + HTML template

---

## Next Features (Etapa 4+)

These features emerge from the `/speckit-clarify` session (2026-05-10) and updated spec (FR-014, FR-018, FR-019, FR-002 cap, topic limit):

### FR-015 — Onboarding Wizard
New users see a 2–3 step wizard before the dashboard: goal creation → priority/date → daily time.  
**Files to create/modify**: `src/app/onboarding/page.tsx`, `src/middleware.ts` (redirect if no goals), `src/app/api/auth/register/route.ts` (set onboarding flag).

### FR-016 — AI Graceful Degradation  
When AI is unavailable, fall back to rule-based plan (overdue reviews + next unlocked topics). Currently `MOCK_AI=true` serves this purpose in development. For production: wrap all `generateObject()` calls in try/catch with rule-based fallback + banner state in API response.  
**Files to modify**: `src/lib/ai/generate.ts`, `src/app/api/goals/route.ts`, `src/app/api/plans/today/route.ts`.

### FR-017 — Data Export + Account Deletion
Export all user data as JSON + permanent account deletion from account settings.  
**Files to create**: `src/app/api/account/export/route.ts`, `src/app/api/account/delete/route.ts`, `src/app/settings/page.tsx`.

### FR-014 (updated) — Coach Conversation Persistence
Coaching messages must be persisted to the DB (CoachMessage entity) so conversations survive page reloads and are resumable across sessions.
- **New DB table**: `coach_messages` (id, user_id, role, content, created_at) — add to `src/lib/db/schema.ts` + migration
- **New endpoint**: `GET /api/coach/history` — returns all messages ordered by `created_at`
- **Update**: `POST /api/coach` — after stream completes, persist both the user message and assistant reply to DB
- **Update**: `src/app/coach/page.tsx` — load history on mount via `GET /api/coach/history`, pass as `initialMessages` to `useChat()`
- **Update**: `src/app/api/account/delete/route.ts` — include `coach_messages` in cascade delete
- **Update**: `src/app/api/account/export/route.ts` — include `coach_messages` in JSON export

### FR-014 (updated) — Coach Context Injection
The AI coach must automatically receive user context per request so guidance is personalized without the user re-describing their situation.
- **Update**: `POST /api/coach` system prompt — inject: active goal titles/descriptions, current unlocked/in-progress topic titles, today's plan task titles
- **Update**: `src/lib/ai/prompts.ts` (or equivalent) — `buildCoachSystemPrompt(user, goals, activeTopics, todayPlan)` function
- **DB queries needed at request time**: goals (status='active'), topics (status IN ['unlocked','in_progress'] + goal JOIN), today's plan tasks

### FR-018 — Email Notifications Opt-Out
Daily email digest is default-on; users can disable from account settings.
- **DB migration**: Add `email_notifications_enabled BOOLEAN NOT NULL DEFAULT true` to `users` table
- **Update**: `src/lib/db/schema.ts` — add field to users schema
- **Update**: `src/app/api/email/daily-digest/route.ts` — filter users by `emailNotificationsEnabled = true` before sending
- **New endpoint**: `PATCH /api/account/settings` (or extend existing settings PATCH) — accept `emailNotificationsEnabled` boolean
- **Update**: `src/app/settings/page.tsx` — add toggle UI for email notifications

### FR-019 — Password Reset (Email-Based)
Self-service password reset via time-limited, single-use token.
- **New DB table**: `password_reset_tokens` (id, user_id, token_hash, expires_at, used_at, created_at) — add to schema + migration
- **New endpoint**: `POST /api/auth/forgot-password` — generate token, hash with SHA-256, store, send Resend email with link
- **New endpoint**: `POST /api/auth/reset-password` — validate token (not used, not expired), atomically mark used, update password_hash
- **New page**: `src/app/reset-password/page.tsx` — form to enter new password (reads `?token=` from URL)
- **New page**: `src/app/forgot-password/page.tsx` — email input form
- **Update**: login page — add "Forgot password?" link
- **Resend template**: `src/lib/email/templates.ts` — add `passwordResetEmail(resetLink)` template

### FR-002 (updated) — 30-Topic Cap on Learning Paths
AI path generation must not produce more than 30 topics per goal.
- **Update**: `src/lib/ai/prompts.ts` — add explicit constraint to the path generation prompt: "Generate at most 30 topics, ordered from foundational to advanced"
- **Update**: `src/app/api/goals/route.ts` — validate that AI response contains ≤ 30 topics before persisting; truncate if exceeded
- **Update**: `src/lib/ai/generate.ts` — add `maxTopics: 30` guard in the Zod schema for path generation output

### Cross-goal Topic Sharing (Clarification Q3)
Topics with identical titles across goals should share a single entity and unified progress/review schedule. Currently each path has independent topics. Requires data model change + migration.  
**Complexity**: Medium (schema migration + deduplication logic).

### Missed-day Recovery Choice (Clarification Q4)
When ≥2 consecutive missed days detected, show modal: "Recover missed content" vs "Resume normal". Store choice, distribute or discard backlog accordingly.  
**Files to modify**: `src/app/api/plans/today/route.ts` (detect gap), `src/components/dashboard/DailyPlanCard.tsx` (modal).

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✓ | Neon PostgreSQL connection string |
| `NEXTAUTH_SECRET` | ✓ | JWT signing secret |
| `NEXTAUTH_URL` | ✓ | App base URL (for callbacks) |
| `NEXT_PUBLIC_APP_URL` | ✓ | Public URL for email links |
| `CRON_SECRET` | ✓ | Bearer token for Vercel cron calls |
| `ANTHROPIC_API_KEY` | Production | Required when MOCK_AI is not true |
| `MOCK_AI` | Dev/staging | Set to "true" to bypass Anthropic API |
| `REDIS_URL` | Optional | Redis connection; no caching if omitted |
| `RESEND_API_KEY` | Optional | Email digest; silent-fail if omitted |
| `RESEND_FROM_EMAIL` | Optional | Sender address for digest emails |

---

## Key Architectural Decisions

See [research.md](research.md) for full rationale. Summary:

1. **FSRS v5** (simplified) over SM-2 — better retrievability modeling for daily planner
2. **Next.js 14 App Router** — unified SSR + API routes, single deployment
3. **Drizzle ORM** — type-safe SQL, thin layer, easy migrations via `drizzle-kit push`
4. **NextAuth credentials** — simple email/password for v1, no OAuth dependency
5. **Redis optional** — graceful null fallback; `ioredis` can't use persistent connections on Vercel serverless with Upstash (needs HTTP client swap for production Redis)
6. **MOCK_AI flag** — environment-level toggle, not feature-flagged code paths
