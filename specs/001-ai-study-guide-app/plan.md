# Implementation Plan: AI-Powered Personal Study Guide

**Branch**: `001-ai-study-guide-app` | **Date**: 2026-05-09 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/001-ai-study-guide-app/spec.md`

## Summary

A web application that transforms daily ad-hoc study into structured, goal-aligned, compounding knowledge retention. The system has two modes working in tandem: a **passive intelligent planner** that generates daily study plans using spaced repetition (FSRS v5 algorithm) and AI-driven learning path sequencing; and an **interactive AI coaching chat** where the user can ask questions about any topic and receive personalized explanations adapted to their background. Core tech stack: TypeScript + Next.js 14 (App Router), PostgreSQL + Drizzle ORM, Anthropic Claude API (`claude-sonnet-4-6`) via Vercel AI SDK.

## Technical Context

**Language/Version**: TypeScript 5.x
**Primary Dependencies**: Next.js 14 (App Router), Drizzle ORM, Anthropic SDK (`@anthropic-ai/sdk`), Vercel AI SDK (`ai`, `@ai-sdk/anthropic`), NextAuth.js v5, Tailwind CSS, shadcn/ui, Zod
**Storage**: PostgreSQL 16 (primary relational store), Redis (daily plan cache + API rate limiting)
**Testing**: Vitest (unit + integration), Playwright (E2E)
**Target Platform**: Web browser (desktop-first, mobile-responsive)
**Project Type**: Full-stack web application — Next.js monolith with App Router API routes as backend
**Performance Goals**: Daily plan visible in <3s (SC-002), session logging in <30s (SC-003), learning path generated in <60s (SC-001), AI coach first streaming token in <1s
**Constraints**: Single user v1; no offline mode; no external platform API integrations; AI coaching context window = last 8 messages + current topic + user profile; `ANTHROPIC_API_KEY` required at runtime
**Scale/Scope**: Single-user SaaS v1; ~10 active goals, ~100 topics per goal, ~365 sessions/year per user; no multi-tenancy in v1

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution file is a placeholder template — no specific architectural gates or constraints are currently defined. Proceeding without gate violations.

**Post-design check**: Architecture is a standard full-stack Next.js monolith. No unusual patterns, no unnecessary abstractions, no premature complexity introduced. No violations to document.

## Project Structure

### Documentation (this feature)

```text
specs/001-ai-study-guide-app/
├── plan.md                  # This file
├── research.md              # Phase 0 output
├── data-model.md            # Phase 1 output
├── quickstart.md            # Phase 1 output
├── contracts/               # Phase 1 output
│   └── api-endpoints.md
└── tasks.md                 # Phase 2 output (/speckit-tasks — not yet created)
```

### Source Code (repository root)

```text
src/
├── app/                              # Next.js App Router
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── dashboard/                    # Daily plan + overview (P1 — US1)
│   ├── goals/                        # Goal list + creation (P3 — US5)
│   │   └── [goalId]/
│   │       └── path/                 # Learning path view (P2 — US2)
│   ├── progress/                     # Progress dashboard (P3 — US4)
│   ├── coach/                        # AI coaching chat (P2 — FR-014)
│   └── api/                          # REST API handlers
│       ├── auth/
│       ├── goals/
│       │   └── [goalId]/
│       │       └── path/
│       ├── topics/
│       │   └── [topicId]/
│       ├── sessions/
│       ├── plans/
│       │   └── today/
│       ├── progress/
│       └── coach/
├── components/
│   ├── dashboard/                    # DailyPlanCard, TaskItem, StreakBadge
│   ├── goals/                        # GoalCard, PathTimeline, TopicNode
│   ├── coach/                        # ChatWindow, MessageBubble, InputBar
│   └── ui/                           # shadcn/ui base components
├── lib/
│   ├── ai/                           # Claude API wrapper, system prompts, structured generation
│   ├── spaced-repetition/            # FSRS v5 algorithm (pure TypeScript, no deps)
│   ├── planner/                      # Daily plan generation logic
│   └── db/                           # Drizzle schema, client, migrations
└── types/                            # Shared TypeScript domain types

tests/
├── unit/                             # FSRS algorithm, planner logic, AI prompt builders
├── integration/                      # API route tests with real DB
└── e2e/                              # Playwright: full user flows
```

**Structure Decision**: Full-stack Next.js monolith (App Router). Frontend pages and backend API routes co-located in the same project. `lib/` holds all business logic independently testable from API routes. Optimal for single-developer v1 with no requirement for separate deployment units.

## Complexity Tracking

> No constitution violations. Section intentionally blank.
