# Data Model: AI-Powered Personal Study Guide

**Branch**: `001-ai-study-guide-app` | **Date**: 2026-05-09
**Phase**: 1 — Derived from `spec.md` Key Entities section

---

## Entity Overview

```
User
 └── LearningGoal (1..*)
       └── LearningPath (1)
             └── Topic (1..*)
                   ├── StudySession (0..*)
                   └── ReviewSchedule (1)
User
 └── DailyPlan (1 per day)
       └── DailyPlanTask (2..5)  → references Topic
```

---

## Entities

### User

The authenticated account. Single user per account (v1).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Login email |
| `password_hash` | TEXT | NOT NULL | bcrypt hash |
| `display_name` | VARCHAR(100) | NOT NULL | Name shown in UI |
| `daily_available_minutes` | INT | NOT NULL, DEFAULT 60 | User's stated daily study time (FR-009) |
| `onboarding_completed` | BOOLEAN | NOT NULL, DEFAULT false | Whether the user finished the first-time onboarding wizard (FR-015); false redirects to `/onboarding` via middleware |
| `timezone` | VARCHAR(50) | NOT NULL, DEFAULT 'UTC' | IANA timezone string |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | Account creation |
| `updated_at` | TIMESTAMP | NOT NULL | Last profile update |

**State transitions**: N/A (no lifecycle state)

---

### LearningGoal

A defined knowledge outcome the user wants to achieve. Maps to FR-001, US5.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK | Unique identifier |
| `user_id` | UUID | FK → User, NOT NULL | Owner |
| `title` | VARCHAR(200) | NOT NULL | Short goal title |
| `description` | TEXT | NOT NULL | Detailed goal description (used for AI path generation) |
| `priority` | ENUM | NOT NULL | `high`, `medium`, `low` |
| `target_date` | DATE | NULLABLE | Optional deadline |
| `status` | ENUM | NOT NULL, DEFAULT 'active' | See state transitions |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | |
| `updated_at` | TIMESTAMP | NOT NULL | |

**State transitions**:
```
active → paused    (user pauses; path and reviews suspended)
active → archived  (user completes or abandons; read-only)
paused → active    (user resumes; reviews resume from paused state)
```

**Validation rules**:
- `title` must be non-empty
- `target_date` if set, must be in the future at creation time
- A user may have at most 10 active or paused goals simultaneously (UX constraint to prevent overwhelm)

---

### LearningPath

An AI-generated, ordered sequence of topics for a specific goal. One path per goal. Maps to FR-002, US2.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK | |
| `goal_id` | UUID | FK → LearningGoal, UNIQUE | One path per goal |
| `generated_at` | TIMESTAMP | NOT NULL | When AI generated the path |
| `total_estimated_minutes` | INT | NOT NULL | Sum of all topic estimated durations |
| `completion_weeks_estimate` | INT | NULLABLE | Estimated weeks at user's daily pace |
| `status` | ENUM | NOT NULL, DEFAULT 'active' | `active`, `regenerated`, `archived` |

**Relationships**:
- Contains many Topics (ordered by `order_index`)
- A path can be regenerated (new path created, old archived) when the goal description changes significantly

---

### Topic

A discrete unit of knowledge within a learning path. Maps to FR-009, FR-010, FR-011, US2. Also carries FSRS scheduling state.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK | |
| `path_id` | UUID | FK → LearningPath, NOT NULL | Parent path |
| `title` | VARCHAR(200) | NOT NULL | Topic name |
| `description` | TEXT | NULLABLE | AI-generated or user-edited description |
| `order_index` | INT | NOT NULL | Position in path (0-based) |
| `complexity` | INT | NOT NULL, CHECK 1-5 | 1=beginner, 5=expert |
| `estimated_minutes` | INT | NOT NULL | Suggested study time |
| `status` | ENUM | NOT NULL, DEFAULT 'locked' | See state transitions |
| `resource_url` | TEXT | NULLABLE | User-attached external link (FR-011) |
| `notes` | TEXT | NULLABLE | User personal notes |
| `created_at` | TIMESTAMP | NOT NULL | |
| `updated_at` | TIMESTAMP | NOT NULL | |
| — FSRS fields — | | | |
| `fsrs_state` | ENUM | NOT NULL, DEFAULT 'New' | `New`, `Learning`, `Review`, `Relearning` |
| `fsrs_stability` | FLOAT | NULLABLE | S parameter (days); null until first session |
| `fsrs_difficulty` | FLOAT | NULLABLE | D parameter (0-10); null until first session |
| `fsrs_retrievability` | FLOAT | NULLABLE | R parameter (0-1) at last review |
| `fsrs_lapses` | INT | NOT NULL, DEFAULT 0 | Count of confidence=1 ratings |
| `next_review_at` | TIMESTAMP | NULLABLE | Scheduled next review (indexed) |
| `last_reviewed_at` | TIMESTAMP | NULLABLE | Date of most recent StudySession |

**Indexes**:
- `(path_id, order_index)` — for path rendering
- `(path_id, status)` — for next-unlocked-topic queries
- `(next_review_at, fsrs_state)` where user_id — for daily review planner query

**State transitions**:
```
locked     → unlocked    (previous topic marked complete, or first topic in path)
unlocked   → in_progress (user starts a study session)
in_progress → complete   (user logs session with confidence ≥ 3)
unlocked   → skipped     (user marks as "already known" — FR-010)
skipped    → unlocked    (user un-skips)
complete   → in_progress (review session started for complete topic)
```

**Validation rules**:
- `order_index` must be unique within a path
- FSRS fields are updated atomically with each StudySession write
- `next_review_at` is null until the first session is logged

---

### StudySession

A logged instance of learning. Maps to FR-004, US1 (marking tasks done), US3 (spaced repetition input).

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → User, NOT NULL | |
| `topic_id` | UUID | FK → Topic, NOT NULL | |
| `session_type` | ENUM | NOT NULL | `new_learning`, `review` |
| `studied_at` | DATE | NOT NULL | Calendar date of study (in user's timezone) |
| `duration_minutes` | INT | NOT NULL, CHECK > 0 | Actual time spent |
| `confidence_rating` | INT | NOT NULL, CHECK 1-5 | 1=Again … 5=Very Easy |
| `notes` | TEXT | NULLABLE | Optional session notes |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT NOW() | |

**Side effects on write**:
1. Updates `Topic.fsrs_stability`, `Topic.fsrs_difficulty`, `Topic.fsrs_retrievability`, `Topic.fsrs_lapses` using FSRS algorithm
2. Updates `Topic.next_review_at` with new scheduled interval
3. Updates `Topic.last_reviewed_at`
4. Updates `Topic.status` based on state machine
5. Invalidates Redis daily plan cache for that user

---

### DailyPlan

The AI-generated set of study tasks for a specific calendar day. Maps to FR-003, SC-002.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK | |
| `user_id` | UUID | FK → User, NOT NULL | |
| `plan_date` | DATE | NOT NULL | Calendar date (user's timezone) |
| `generated_at` | TIMESTAMP | NOT NULL | When generated |
| `available_minutes` | INT | NOT NULL | User's daily limit at generation time |
| `status` | ENUM | NOT NULL, DEFAULT 'active' | `active`, `completed`, `expired` |
| `ai_rationale` | TEXT | NULLABLE | Optional AI explanation of today's priorities |
| `gap_days` | INT | NULLABLE | Number of consecutive missed study days detected before this plan was generated; null when no gap (FR-018) |
| `gap_resolved` | BOOLEAN | NOT NULL, DEFAULT true | Whether the user has responded to the missed-day recovery modal; false triggers `GapRecoveryModal` on the dashboard until resolved |

**Unique constraint**: `(user_id, plan_date)` — one plan per user per day

**State transitions**:
```
active    → completed  (all tasks marked done)
active    → expired    (midnight passes with uncompleted tasks)
```

**Gap recovery flow** (when `gap_days >= 2 && gap_resolved = false`):
- Dashboard renders `GapRecoveryModal` before the plan
- User chooses "recover" → `gap_resolved = true`, recovery plans created for next `gap_days` days
- User chooses "resume" → `gap_resolved = true`, normal plan proceeds unchanged

---

### DailyPlanTask

Individual tasks within a DailyPlan. Maps to FR-003, US1.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PK | |
| `plan_id` | UUID | FK → DailyPlan, NOT NULL | |
| `topic_id` | UUID | FK → Topic, NOT NULL | |
| `task_type` | ENUM | NOT NULL | `new_learning`, `review` |
| `suggested_minutes` | INT | NOT NULL | Planned duration |
| `order_index` | INT | NOT NULL | Display order in the daily plan |
| `status` | ENUM | NOT NULL, DEFAULT 'pending' | `pending`, `completed`, `skipped` |
| `completed_at` | TIMESTAMP | NULLABLE | When user marked done |

---

## Relationships Summary

```
User (1) ────────────── (*) LearningGoal
LearningGoal (1) ─────── (1) LearningPath
LearningPath (1) ───────── (*) Topic
Topic (1) ──────────────── (*) StudySession
Topic (1) ──────────────── (1) FSRS state (embedded fields)
User (1) ────────────── (*) DailyPlan
DailyPlan (1) ────────── (*) DailyPlanTask
DailyPlanTask (*) ───────── (1) Topic
StudySession (*) ────────── (1) Topic
```

---

## Key Query Patterns

### Due reviews for daily plan
```sql
SELECT t.* FROM topics t
WHERE t.next_review_at <= CURRENT_TIMESTAMP
  AND t.path_id IN (
    SELECT lp.id FROM learning_paths lp
    JOIN learning_goals lg ON lp.goal_id = lg.id
    WHERE lg.user_id = $userId AND lg.status = 'active'
  )
ORDER BY t.fsrs_state DESC, t.next_review_at ASC
LIMIT 20;
```

### Next unlocked topic per active goal
```sql
SELECT DISTINCT ON (lp.goal_id) t.*
FROM topics t
JOIN learning_paths lp ON t.path_id = lp.id
JOIN learning_goals lg ON lp.goal_id = lg.id
WHERE lg.user_id = $userId
  AND lg.status = 'active'
  AND t.status = 'unlocked'
ORDER BY lp.goal_id, t.order_index ASC;
```

### Progress per goal
```sql
SELECT
  lg.id,
  COUNT(t.id) FILTER (WHERE t.status = 'complete') AS completed_topics,
  COUNT(t.id) AS total_topics,
  AVG(t.fsrs_difficulty) AS avg_difficulty
FROM learning_goals lg
JOIN learning_paths lp ON lp.goal_id = lg.id
JOIN topics t ON t.path_id = lp.id
WHERE lg.user_id = $userId
GROUP BY lg.id;
```
