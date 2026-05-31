# Quickstart & Integration Scenarios: AI-Powered Career Evolution Features

**Branch**: `002-career-evolution-ai` | **Date**: 2026-05-30
**Phase**: 1 — Integration test flows derived from spec.md User Stories and acceptance scenarios

These scenarios are hand-testable end-to-end flows. Each assumes a logged-in user with at
least one active learning goal and some completed topics (from the existing 001 features).

---

## Prerequisites

Before testing any scenario below, ensure:

1. A user account exists and is authenticated (`POST /api/auth/login`)
2. At least one learning goal with a generated path exists (`POST /api/goals`)
3. At least one topic is marked `complete` or `known` (via `PATCH /api/topics/:topicId`)
4. `MOCK_AI=true` can be set to test flows without Anthropic credits — AI responses are
   canned/predictable; disable for production validation

---

## Scenario 1: Knowledge Assessment — Happy Path (US1, P1)

**Goal**: Complete a topic, request an assessment, answer questions, see FSRS adjustment.

### Step 1 — Confirm topic is complete
```
GET /api/goals/:goalId/path
→ 200; verify a topic has status: "complete"
```

### Step 2 — Generate assessment
```
POST /api/topics/:topicId/assessment
→ 201; body contains assessmentId, 3–5 questions, each with 4 options; `correct` field absent
→ Verify: alreadyGeneratedToday: false
→ Verify: each question has dimension in [recall, application, analysis]
```

### Step 3 — Submit answers (all correct)
```
POST /api/assessments/:assessmentId/submit
body: { answers: [{ questionId: "...", answer: "a" }, ...] }
→ 200; score: 100; fsrsAction: "extended"; reinforcementNeeded: false
→ Verify: correct field now present on each question
→ Verify: topic.next_review_at extended (GET topic and check)
```

### Step 4 — Re-request assessment same day
```
POST /api/topics/:topicId/assessment
→ 200 (not 201); alreadyGeneratedToday: true; generatedAt contains timestamp string
→ Verify: correct answers already visible (assessment was submitted)
→ Verify: no new AI call was made (MOCK_AI logs / Anthropic usage unchanged)
```

**Expected**: Step 4 returns existing result, not a new assessment.

---

## Scenario 2: Knowledge Assessment — Low Score FSRS Adjustment

**Goal**: Confirm that a score < 50% shortens the review interval.

### Step 1 — Generate assessment (fresh topic, different day or first time)
```
POST /api/topics/:topicId/assessment
→ 201; note current topic.next_review_at
```

### Step 2 — Submit all wrong answers
```
POST /api/assessments/:assessmentId/submit
body: { answers: [{questionId: "...", answer: "a"}, ...] }  // all wrong
→ 200; score: 0; fsrsAction: "shortened"; reinforcementNeeded: true
```

### Step 3 — Verify FSRS adjustment
```
GET /api/goals/:goalId/path
→ Topic's next_review_at ≤ NOW() + 3 days
```

### Step 4 — Verify daily plan includes extra review
```
GET /api/plans/today
→ Plan contains a review task for the assessed topic within 3 days
```

---

## Scenario 3: Career Target & Skill Gap Analysis (US2, P2)

**Goal**: Define career target, run gap analysis, create a goal from a suggestion.

### Step 1 — Define career target
```
POST /api/career/target
body: { description: "AI Solutions Architect specializing in enterprise agentic systems" }
→ 201; id, description, createdAt returned
```

### Step 2 — Verify target saved
```
GET /api/career/target
→ current.description matches; history array has 1 entry
```

### Step 3 — Run gap analysis
```
POST /api/career/gap-analysis
→ 201; body contains coveredSkills[], missingSkills[], suggestedGoals[3–5 items]
→ Verify: topicsCountAtGeneration matches actual completed topic count
```

### Step 4 — Verify stale prompt is NOT showing (just generated)
```
GET /api/career/gap-analysis
→ stalePrompt: false (0 new topics since report)
```

### Step 5 — Create goal from suggestion
```
POST /api/career/gap-analysis/:reportId/create-goal
body: { goalIndex: 0 }
→ 201; goalId, title (matches suggestedGoals[0].title), pathGenerating: true
```

### Step 6 — Verify goal appears in goal list
```
GET /api/goals
→ New goal present with title from suggestion
```

---

## Scenario 4: No Career Target Edge Case (FR-004, FR-010 edge case)

**Goal**: Verify the system prompts properly when no target is defined.

```
POST /api/career/gap-analysis  (user has no career target)
→ 422; error: "Defina seu objetivo de carreira antes de solicitar análise"
```

```
GET /api/career/target
→ 200; current: null; history: []
```

---

## Scenario 5: Stale Gap Report Prompt (FR-005)

**Goal**: After 10+ new completed topics, verify stale prompt appears.

### Step 1 — Generate a gap report (baseline)
```
POST /api/career/gap-analysis
→ 201; topicsCountAtGeneration: N
```

### Step 2 — Complete 10+ additional topics
(Complete 10 topics via study sessions or PATCH /api/topics/:id status:complete)

### Step 3 — Verify stale prompt
```
GET /api/career/gap-analysis
→ stalePrompt: true; currentTopicsCount >= N + 10
```

---

## Scenario 6: Learning Analytics Dashboard (US3, P2)

**Goal**: Verify all analytics metrics are returned correctly after study history exists.

### Prerequisites
- At least 5 topics completed across different weeks
- Topics should have `domain` values (or verify "Outros" fallback)

### Step 1 — Load analytics (triggers domain inference if needed)
```
GET /api/analytics
→ 200; weeklyVelocity array has up to 8 entries
→ Verify: domainCoverage entries sum to all completed topics
→ Verify: retentionHealth.strongPercent + weakPercent ≤ 100
→ If domains not yet inferred: domainInferenceInProgress: true
```

### Step 2 — Re-load analytics (domains cached)
```
GET /api/analytics
→ domainInferenceInProgress: false (domains now stored in topics.domain)
```

### Step 3 — Filter by goal
```
GET /api/analytics?goalId=:goalId
→ All metrics scoped to that goal only
→ projectedCompletions contains entry for that goalId
```

---

## Scenario 7: Weekly Report Generation (US4, P3)

**Goal**: Verify the cron endpoint generates and stores a weekly report.

### Step 1 — Simulate Monday cron fire
```
POST /api/cron/weekly-report
Headers: { Authorization: "Bearer {CRON_SECRET}" }
→ 200; usersProcessed ≥ 1; body contains counts
```

### Step 2 — Verify report stored
```
GET /api/reports/weekly
→ reports[0].weekId = current ISO week (e.g., "2026-W22")
→ reports[0].aiInsight is non-empty string
→ reports[0].fallbackUsed: false (unless MOCK_AI caused fallback)
```

### Step 3 — Fire cron again (idempotency)
```
POST /api/cron/weekly-report (same week)
→ 200; usersProcessed = same number; no duplicate rows created
```

### Step 4 — Verify email delivery
```
GET /api/reports/weekly
→ reports[0].emailSentAt is non-null (if user has emailNotificationsEnabled: true)
```

---

## Scenario 8: AI Service Failure Handling

**Goal**: Verify graceful degradation when AI is unavailable.

### Assessment failure
```
(With Anthropic API key invalid / network blocked)
POST /api/topics/:topicId/assessment
→ 503; error: "Avaliação temporariamente indisponível — tente novamente em breve"
→ Topic status unchanged; no assessment row created
```

### Gap analysis failure
```
POST /api/career/gap-analysis
→ 503; error: "Análise indisponível — tente novamente"
→ GET /api/career/gap-analysis shows previous reports unaffected; no new row created
```

### Weekly report cron failure (AI insight only)
```
POST /api/cron/weekly-report
→ 200; aiFailures count > 0
→ GET /api/reports/weekly → report exists; fallbackUsed: true; aiInsight contains fallback phrase
```

---

## Scenario 9: Data Export Includes New Entities (FR-010)

```
GET /api/account/export
→ 200; JSON file contains:
  - careerTargets: array of all target versions
  - skillGapReports: array of all gap reports
  - knowledgeAssessments: array of all assessments (with questions JSONB)
  - weeklyReports: array of all weekly reports
```

---

## Scenario 10: Account Deletion Cascades (FR-010)

```
DELETE /api/account
→ 200; account deleted
→ Verify: career_targets, skill_gap_reports, knowledge_assessments, weekly_reports
         all deleted (attempt GET /api/career/target with old session → 401)
```
