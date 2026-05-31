# Feature Specification: AI-Powered Career Evolution Features

**Feature Branch**: `002-career-evolution-ai`
**Created**: 2026-05-30
**Status**: Draft
**Input**: User description: "Quero desenvolver nesse projeto mais funcionalidades para me ajudar nos estudos e conseguir me fazer evoluir ainda mais como um profissional de arquitetura de software na area e na era de IA"

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — AI Knowledge Validation Assessments (Priority: P1)

As a software architect who completes topics in my learning path, I want the system to generate
targeted questions to test my actual understanding of what I studied, so I can distinguish genuine
mastery from surface-level exposure and calibrate my review schedule accordingly.

**Why this priority**: The core pain point is studying without feeling real progress. Replacing
pure self-rating with AI-generated validation gives objective evidence of mastery and builds
genuine confidence that compounds over time.

**Independent Test**: Complete any topic in a learning path → request an assessment → receive
3–5 focused questions within 15 seconds → answer them → see the score impact the next spaced
review date for that topic.

**Acceptance Scenarios**:

1. **Given** a topic has been completed (any status: complete or known), **When** the user
   requests a knowledge assessment, **Then** the system generates and displays 3–5 questions
   within 15 seconds, covering different levels of understanding (recall, application, analysis)
   relevant to that topic's title and description

2. **Given** the user completes an assessment with a score ≥ 80%, **When** the result is saved,
   **Then** the next spaced review interval for that topic is extended by at least 20% compared
   to what the FSRS algorithm alone would have scheduled

3. **Given** the user scores below 50% on an assessment, **When** the result is saved, **Then**
   an extra review task is scheduled within the next 3 days and the current FSRS interval is
   shortened; the topic card shows a "reinforcement needed" indicator

4. **Given** the AI service is unavailable when an assessment is requested, **When** the system
   fails to generate questions, **Then** a graceful fallback message is shown ("Avaliação
   temporariamente indisponível — tente novamente em breve") and the topic remains completed
   without penalty

---

### User Story 2 — Career Target & Skill Gap Analysis (Priority: P2)

As a software architect targeting AI-era leadership roles, I want the system to analyze my
learning portfolio against my defined career goal and identify precisely what skills I am still
missing, so every new learning goal I create advances my career rather than filling random gaps.

**Why this priority**: Without a career compass, the user accumulates knowledge breadth without
targeted depth. Skill gap analysis converts learning activity into career capital and answers
"what should I study next for my specific goal?"

**Independent Test**: Define a career target (e.g., "AI Solutions Architect specializing in
enterprise agentic systems") → request analysis → receive a structured report within 60 seconds
identifying: covered skills, missing critical skills, and 3–5 suggested learning goals with
priority reasoning.

**Acceptance Scenarios**:

1. **Given** the user has defined a career target, **When** they request a skill gap analysis,
   **Then** the system generates a report within 60 seconds containing: (a) a list of skills
   from their learning portfolio that are relevant to the career target, (b) a list of critical
   skills missing from their portfolio, and (c) 3–5 specific suggested learning goal titles with
   a one-sentence rationale for each

2. **Given** the user has an existing skill gap report and has completed 10 or more new topics
   since it was generated, **When** they view the career page, **Then** the system surfaces a
   prompt: "Your learning profile has evolved — consider regenerating your skill gap analysis"

3. **Given** multiple goals are suggested in the gap report, **When** the user clicks "Add goal"
   next to a suggestion, **Then** the app pre-fills the goal creation form with the suggested
   title and a brief AI-generated description, ready for the user to review and submit

4. **Given** no career target has been defined, **When** the user navigates to the career
   analysis page, **Then** they see a prompt to define their target before analysis is available,
   with 3 example targets shown for inspiration

---

### User Story 3 — Learning Analytics Dashboard (Priority: P2)

As someone who studies every day but questions whether they are truly advancing professionally,
I want a visual analytics dashboard that shows learning velocity, domain coverage, and knowledge
retention trends over time, so I have objective evidence of professional growth and can identify
which areas need more attention.

**Why this priority**: The user explicitly states "estudo todo dia, mas não sinto que tenho
evoluído" — invisible progress is the core motivational problem. Analytics makes the invisible
visible.

**Independent Test**: After logging at least 2 weeks of study sessions across multiple topics,
open the analytics dashboard and verify: (a) weekly velocity chart shows sessions and topics per
week, (b) domain coverage map groups completed topics by technology area, (c) per-goal
confidence trend shows average ratings over time.

**Acceptance Scenarios**:

1. **Given** the user has completed at least 5 topics across one or more goals, **When** they
   open the Analytics page, **Then** they see: a weekly learning velocity chart (topics completed
   and study hours per week, last 8 weeks), a domain coverage visualization grouping completed
   topics by inferred technology domain, and a retention health indicator showing the percentage
   of topics with strong vs. weak confidence ratings

2. **Given** the user selects a specific goal in the analytics filter, **When** the view updates,
   **Then** all charts and metrics reflect only that goal's data — velocity, coverage, confidence
   trends, and projected completion date at current pace

3. **Given** the analytics page is open, **When** the user hovers over or taps a domain in the
   coverage map, **Then** a tooltip shows the specific topics completed in that domain, their
   average confidence score, and how many are due for review

4. **Given** a domain shows low coverage (fewer than 3 completed topics relevant to the career
   target), **When** that domain appears in the coverage map, **Then** it is visually
   distinguished (e.g., lighter color or "gap" label) and linked to the skill gap analysis page

---

### User Story 4 — Weekly Learning Insights Report (Priority: P3)

As a busy professional, I want to receive a structured weekly summary of my learning activity
with an AI-generated insight connecting this week's progress to my career target, so I can
reflect on my trajectory each week and decide how to adjust priorities for the week ahead.

**Why this priority**: Daily granularity (the existing daily plan) creates urgency but not
perspective. A weekly cadence allows reflection and course correction before habits drift.

**Independent Test**: After 7 days of study activity, receive (or view in-app) a weekly report
containing: total topics and hours, streak status, top studied domain, weakest domain, and one
AI-generated insight sentence tailored to the user's career target.

**Acceptance Scenarios**:

1. **Given** the user has email notifications enabled, **When** Monday 08:00 UTC arrives (or
   user-configured time), **Then** a weekly report email is sent containing: topics studied last
   week, total study hours, current streak, top domain, weakest domain, and one AI-generated
   insight sentence connecting the week's learning to the user's career target (or general
   encouragement if no target is defined)

2. **Given** the user navigates to the "Relatórios Semanais" (Weekly Reports) section in the
   app, **When** the page loads, **Then** they see a list of past weekly reports (most recent
   first), each expandable to show full metrics and the AI insight

3. **Given** the user studied fewer than 3 topics in a week (light week), **When** the weekly
   report is generated, **Then** it acknowledges the lighter week without judgment and includes
   one concrete action recommendation for the coming week aligned with the highest-priority
   active goal

4. **Given** the user's email opt-out is active, **When** Monday arrives, **Then** no email is
   sent but the weekly report is still generated and available in-app with full content

---

### Edge Cases

- When no career target is defined and the user requests a skill gap analysis: show a clear
  prompt to define a target first; offer 3 example career target descriptions to lower the
  barrier
- When a knowledge assessment AI call fails: topic remains completed; the user sees a
  non-blocking retry option; FSRS schedule is not affected
- When all of the user's topics are marked "already known": assessments can still be requested
  for those topics; gap analysis uses them as evidence of coverage
- When the user has fewer than 7 days of study history: the first weekly report covers all
  available data and notes it is a partial-week report
- When a domain cannot be inferred from a topic title: that topic is grouped under "Outros"
  (Other) in the domain coverage map; this does not affect velocity or confidence metrics
- When the user changes their career target: a new gap analysis is required; the old report is
  retained in history so the user can compare evolution over time
- When the skill gap analysis AI call fails: an inline error is shown with a retry button; no
  partial result is saved; any previously generated report remains visible and unchanged; the
  user can retry immediately without any cooldown period
- When the AI insight call fails during the weekly report cron: the report is still generated
  and stored/delivered using a generic fallback phrase; the failure is logged (Vercel logs) but
  does not block report delivery
- When a user requests an assessment for a topic already assessed today: the existing result is
  returned immediately (no new AI call); score and correct answers are shown with a timestamp
  note; the FSRS schedule is not re-adjusted (it was already adjusted on first completion)
- When multiple skill gap reports exist: the analytics page shows the most recent; older reports
  are accessible in a "Report History" list

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to request an AI-generated knowledge assessment for any
  completed topic (status: complete or known); each assessment MUST contain 3–5 multiple-choice
  questions, each with exactly 4 answer options and one correct answer, covering recall,
  application, and analysis dimensions of the topic; the score is calculated automatically as
  (correct answers ÷ total questions) × 100; assessments are opt-in and do not block topic
  completion; if the user requests an assessment for a topic they have already assessed on the
  same calendar day, the system MUST return the existing result (score + correct answers
  revealed) with a timestamp note ("Avaliação de hoje — feita às HH:MM") rather than
  generating a new one

- **FR-002**: System MUST calculate an assessment score (0–100) and apply it to the topic's FSRS
  schedule: a score ≥ 80% extends the next review interval by at least 20% beyond the standard
  FSRS calculation; a score < 50% shortens the interval and schedules an extra review within
  3 days; scores between 50–79% leave the FSRS schedule unchanged

- **FR-003**: System MUST allow users to define and update a career target — a free-text
  description of their desired professional role or outcome (e.g., "AI Solutions Architect
  specializing in enterprise agentic systems"); the career target is optional; all versions are
  retained with no limit — each update creates a timestamped entry and the full history is
  viewable in-app; the most recent version is used as context for skill gap analysis

- **FR-004**: System MUST perform an AI-powered skill gap analysis when requested: the analysis
  compares the user's completed topics (across all active and paused goals) against their career
  target and returns: (a) skills covered, (b) critical skills missing, (c) 3–5 prioritized
  suggested learning goal titles with rationale; analysis results are persisted so the user can
  view them later and compare across multiple generation runs; if the AI call fails for any
  reason (timeout, API error, no credits), the system MUST show an inline error message with a
  retry button — no partial result is saved and any previously generated report remains visible
  and unaffected

- **FR-005**: System MUST prompt the user to regenerate their skill gap analysis when they have
  completed 10 or more new topics since the last report was generated

- **FR-006**: System MUST provide a Learning Analytics page displaying: weekly learning velocity
  chart (topics completed and study hours per week for the last 8 weeks), domain coverage
  visualization grouping completed topics by inferred technology domain, per-goal confidence
  trend (average confidence rating over time per goal), and projected completion dates at current
  study pace for each active goal

- **FR-007**: System MUST generate a weekly learning insights report every Monday covering the
  previous 7 days; the report includes: topics completed, total study time, streak status, top
  studied domain, weakest coverage domain, and one AI-generated insight sentence connecting the
  week's activity to the user's career target; if the AI insight call fails, the report MUST
  still be generated and stored using a generic motivational fallback phrase (e.g., "Continue
  estudando — cada semana conta!") in place of the personalized insight; reports are stored in
  the database regardless of AI availability

- **FR-008**: System MUST deliver the weekly report by email to users with email notifications
  enabled; users with email opt-out still have access to all weekly reports in-app via a
  "Relatórios Semanais" page; the weekly email is independent from the existing daily digest

- **FR-009**: System MUST allow users to create a new learning goal directly from a skill gap
  report suggestion with a single action; the goal creation form is pre-filled with the
  suggested title and AI-generated description from the report

- **FR-010**: System MUST include knowledge assessment history, skill gap reports, and weekly
  reports in the full data export (existing FR-017); all three entities MUST be cascade-deleted
  when the user's account is deleted

### Key Entities

- **Career Target**: The user's defined professional destination; free-text description; belongs
  to a user; fully versioned with no retention limit — each update creates a new entry with a
  timestamp, and all historical versions are retained; the most recent version is the active one
  used for gap analysis; the full version history is accessible in-app as a timestamped list so
  the user can reflect on how their professional goals have evolved; optional

- **Knowledge Assessment**: An AI-generated evaluation for a specific topic; contains 3–5
  multiple-choice questions each with 4 options and one marked-correct answer; stores the user's
  selected answer per question and the computed score (0–100, calculated as correct/total × 100);
  linked to the topic; has a completion timestamp; one assessment per topic per calendar day
  maximum

- **Skill Gap Report**: A persisted output of an AI analysis run; contains a generation
  timestamp, the career target version used, a covered-skills array, a missing-skills array, and
  a suggested-goals array (title + rationale pairs); belongs to a user; multiple reports can
  exist over time

- **Weekly Report**: A system-generated summary for a calendar week (ISO week identifier);
  contains metrics snapshot (topics, hours, streak), top domain, weakest domain, and
  AI-generated insight text; belongs to a user; generated automatically each Monday; stored
  regardless of email delivery status

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A knowledge assessment is generated and displayed within 15 seconds of the user
  requesting one for a completed topic

- **SC-002**: A skill gap analysis report is generated and displayed within 60 seconds of the
  user submitting a career target and requesting analysis

- **SC-003**: The Learning Analytics dashboard loads within 3 seconds and correctly reflects all
  completed study sessions in its charts and metrics

- **SC-004**: Users who engage with knowledge assessments on 5+ topics within their first 2
  weeks report that the assessments identify genuine gaps they had not noticed through
  self-rating alone (measured via in-app feedback prompt shown after the 5th assessment)

- **SC-005**: Weekly reports are successfully generated for all active users every Monday, with
  email delivery rate ≥ 95% for users with notifications enabled (measured via delivery logs)

- **SC-006**: Users who view their skill gap analysis report create at least one new learning
  goal within 7 days of viewing the report, at a rate ≥ 50% (indicating the report is
  actionable, not just informational)

---

## Clarifications

### Session 2026-05-30

- Q: What format should knowledge assessment questions take? → A: Multiple choice — 3–5 questions each with 4 options and one correct answer; score auto-calculated as (correct ÷ total) × 100; no AI grading round-trip needed
- Q: When the skill gap analysis AI call fails, what should the system do? → A: Show inline error + retry button; no partial result saved; any existing previous report remains visible and unaffected
- Q: When the AI insight generation fails during the weekly report cron, what should happen? → A: Generate the report without the personalized insight using a generic motivational fallback phrase; report is still stored and delivered; no report is skipped
- Q: When a user requests an assessment for a topic they already assessed today, what should the system show? → A: Return the existing result with score and correct answers visible, with a timestamp note ("Avaliação de hoje — feita às HH:MM"); no new AI call; FSRS not re-adjusted
- Q: How many historical career target versions should be retained? → A: All versions, no limit — full timestamped history retained and viewable in-app; most recent version is active for gap analysis

## Assumptions

- Knowledge assessments are strictly opt-in; they do not replace or gate topic completion; the
  user completes a topic first, then optionally requests an assessment to validate their
  understanding
- Assessment questions are generated on-demand using the topic title, description, and any
  user notes attached to the topic; they are not pre-generated during path creation
- Domain categorization for the analytics coverage map is AI-inferred from topic titles and
  descriptions at dashboard load time; no manual domain tagging is required from the user; topics
  that cannot be categorized are grouped under "Outros"
- The career target is a single free-text field per user; there is no predefined taxonomy of
  roles or a dropdown; the user writes their target in their own words
- One knowledge assessment per topic per day is the maximum; requesting a second assessment for
  the same topic on the same day returns the existing assessment result
- Weekly reports are generated on a server-side cron schedule; if the cron fails for a given
  Monday, it retries the following day; at most one report per ISO week is stored per user
- Skill gap analysis is not throttled (the user can regenerate as often as they wish); each
  generation creates a new persisted report entry
- The weekly report email is a separate send from the daily digest (different template, different
  cron); it respects the same `emailNotificationsEnabled` preference
- This feature set extends the existing app; all authentication, session management, data export,
  and account deletion behaviors from the primary spec (001-ai-study-guide-app) apply unchanged
