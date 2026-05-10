# Research: AI-Powered Personal Study Guide

**Branch**: `001-ai-study-guide-app` | **Date**: 2026-05-09
**Phase**: 0 — Resolves all NEEDS CLARIFICATION items from Technical Context

---

## Decision 1: Spaced Repetition Algorithm

**Decision**: FSRS v5 (Free Spaced Repetition Scheduler) with simplified stability update formula for v1.

**Rationale**: FSRS v5 is significantly more accurate than SM-2 (~95% vs ~80-85% correct interval predictions). It models retrievability as an explicit parameter — which is essential for our daily planner to reason about which topics to surface. The simplified version (hardness-factor stability update instead of the full 17×9 weight matrix) is acceptable for v1 and reduces implementation complexity while retaining the core accuracy advantage over SM-2.

**Alternatives considered**:
- **SM-2** (classic Anki algorithm): Simpler to implement (3-4 lines of math) but less accurate. The ease-factor model drifts over time and has no explicit retrievability concept. Rejected because FSRS better serves the daily plan generator's need to rank review urgency.
- **Leitner box system**: Too coarse for a professional learner with long-term goal tracking. No probability model.

**Key implementation notes**:
- Four core FSRS parameters per topic: Stability (S, in days), Difficulty (D, 0-10), Retrievability (R, 0-1), State (New/Learning/Review/Relearning)
- Confidence ratings map: 1=Again, 2=Hard, 3=Good, 4=Easy, 5=Very Easy
- Difficulty update after each review: `D' = D + (8 - 9r)(r - 3) × 0.02`, clamped to [1, 10]
- Next interval for Review state: `interval = S × (4 / (1 - targetR))` where targetR = 0.9
- Learning state uses fixed short intervals: [15 min, 1 day, 3 days]
- Store all timestamps in UTC; convert to user's local timezone only for display
- DB query for due reviews: `WHERE next_review_at <= NOW() ORDER BY state DESC, next_review_at ASC`

---

## Decision 2: Full-Stack Framework

**Decision**: Next.js 14 with App Router.

**Rationale**: Next.js App Router is the best choice for a web application that needs:
- Server-side rendering for the daily plan (fast first load)
- API routes co-located with the frontend (no separate backend service)
- Native streaming support for the AI coaching chat (React Server Components + streaming)
- First-class TypeScript support
- Vercel AI SDK tight integration (same ecosystem)

**Alternatives considered**:
- **Remix**: Excellent but smaller ecosystem for AI integration tooling
- **SvelteKit**: Smaller team familiarity risk; less AI SDK tooling
- **React + Express (separate)**: More deployment complexity without proportional benefit for v1 single-user scope

---

## Decision 3: AI Provider and SDK

**Decision**: Anthropic Claude API (`claude-sonnet-4-6`) via Vercel AI SDK for all AI features.

**Rationale**:
- Claude has excellent instruction-following for structured JSON generation of learning paths
- Strong 200k context window — preserves full conversation history when needed
- Vercel AI SDK provides `streamText()` for coaching chat and `generateObject()` with Zod schema validation for structured plan generation
- `generateObject()` eliminates JSON parsing errors — the SDK validates the output schema before returning

**AI features breakdown**:
1. **Learning path generation** (`generateObject`): Takes goal description + user background → outputs JSON learning path with phases, ordered topics, dependencies, estimated durations. Uses JSON mode (one-shot, no multi-turn needed).
2. **Daily plan generation** (`generateObject`): Takes active goals + FSRS due reviews + available minutes → outputs ordered task list with rationale. Uses JSON mode.
3. **Coaching chat** (`streamText`): Takes last 8 messages + current topic context + user profile → streams conversational coaching response.

**Context window management for coaching**:
- System prompt: cached (ephemeral, reused for 5 minutes) — contains user background + coaching persona
- Messages: last 8 messages (configurable, start conservative)
- Per-message topic context: injected as first user message
- Pattern: `system(cached) + [topic_context, ...last8messages]`

**Prompt caching**: Use `cache_control: { type: "ephemeral" }` on the coaching system prompt to reduce cost on repeated sessions.

**Alternatives considered**:
- **OpenAI GPT-4o**: Good structured output support; slightly less accurate instruction-following for long-form curriculum generation in testing
- **Gemini 2.5 Pro**: Longer context but weaker TypeScript SDK ecosystem at time of writing

---

## Decision 4: Database and ORM

**Decision**: PostgreSQL 16 + Drizzle ORM.

**Rationale**: The data model is relational with well-defined foreign key relationships (goal → path → topic → session/review_schedule). PostgreSQL handles the time-series nature of review scheduling (indexed queries on `next_review_at`) efficiently. Drizzle ORM is chosen over Prisma for:
- Lighter runtime (no query engine binary)
- TypeScript-first schema definition (schema is the type source of truth)
- SQL-like query builder (more predictable for complex scheduling queries)
- Better performance on serverless / edge environments

**Redis role**: Cache the generated daily plan per user (TTL: until midnight in user's timezone) to avoid regenerating on every page load while staying within the <3s performance goal.

**Alternatives considered**:
- **SQLite (Turso)**: Good for single-user but edge-case risks with concurrent write patterns and migration tooling maturity
- **MongoDB**: Document model is a worse fit for the relational topic → session → review_schedule chain
- **Prisma**: Good migrations but heavier runtime; Drizzle wins on performance for serverless

---

## Decision 5: Authentication

**Decision**: NextAuth.js v5 (Auth.js) with email/password credentials provider.

**Rationale**: Standard solution for Next.js authentication. Email/password covers the v1 requirement. Social login (Google OAuth) can be added later as a second provider with minimal code changes — NextAuth supports it natively. Session stored in database (Drizzle adapter).

**Alternatives considered**:
- **Clerk**: Good DX but vendor lock-in and cost at scale; overkill for single-user v1
- **Lucia Auth**: Good but smaller community; less maintained than NextAuth v5
- **Custom JWT**: More control but reinventing solved problems

---

## Decision 6: UI Component Strategy

**Decision**: Tailwind CSS + shadcn/ui.

**Rationale**: shadcn/ui provides copy-paste, unstyled-but-styled components (not a dependency — you own the code). Tailwind handles all utility styling. This combination is the fastest path to a polished, accessible UI without design debt.

**Key UI components needed**:
- Progress heatmap (calendar-style): `react-calendar-heatmap` or custom SVG
- Confidence rating (1-5): Custom radio group component
- Chat message bubbles: Custom using shadcn/ui Card
- Learning path timeline: Custom SVG/CSS with shadcn/ui Badge for topic nodes
- Daily plan tasks: Checklist with drag-reorder (dnd-kit)

---

## Decision 7: Daily Plan Generation Logic

**Decision**: Hybrid — FSRS algorithm determines review urgency; Claude AI determines new-learning topic selection and daily rationale.

**Flow**:
1. Query PostgreSQL: all topics where `next_review_at <= NOW()` for this user (sorted by urgency)
2. Query active goals and their incomplete topics (next unlocked topic per path)
3. Calculate available slots within `user.daily_available_minutes`
4. Fill review slots first (overdue reviews have priority per FR-006)
5. Fill remaining time with new-learning topics (Claude selects which goal/topic to prioritize based on goal priorities and proximity to deadlines)
6. Cache result in Redis until midnight
7. Return ordered task list to client

**The FSRS algorithm runs locally** (no AI call for scheduling reviews). Claude is only called for the new-learning selection rationale and the coaching chat.

---

## Resolved NEEDS CLARIFICATION Items

All NEEDS CLARIFICATION items from the specification have been resolved:

| Spec Marker | Resolution |
|-------------|-----------|
| FR-014: AI interaction model | Option C selected by user: both passive planner and interactive coaching chat included in v1 |

No other NEEDS CLARIFICATION markers were present in the spec.
