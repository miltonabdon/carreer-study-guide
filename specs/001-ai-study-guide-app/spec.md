# Feature Specification: AI-Powered Personal Study Guide

**Feature Branch**: `001-ai-study-guide-app`
**Created**: 2026-05-09
**Status**: Draft
**Input**: User description: "sou um arquiteto de software, graduado em engenharia da computacao e pos graduado em arquitetura de software e atualmente estou terminando outra pos em computacao em nuvem e aplicativos moveis. Tenho feito bastante mentorias sobre liderança de equipe e ser um lider/gestor de arquitetura em um proximo passo na minha carreira. Tenho estudado muito sobre inteligencia artificial, spec driven development, alguns autopilot, agentic IA, entre outros cursos envolvendo rag e tudo mais, mas tenho forte interesse em seguir firme nessa frente de IA. Porem tenho tido dificuldades em manter uma rotina de estudo e em como organizar isso, preciso de uma ferramenta, uma aplicacao web que me ajude nisso. Pois atualmente estudo todo dia, mas nao sinto que tenho evoluido muito nos assuntos por falta de planejamento. Use as melhores estrategias e tecnicas de IA pra ajudar a pensar em algo que melhore minha forma de aprender e me ajude a ter esse controle e guia diario"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Daily Guided Study Plan (Priority: P1)

As a software architect studying multiple areas simultaneously, I want to open the app each morning and immediately see a clear, prioritized list of what to study today — with no decision fatigue — so I can jump straight into learning.

**Why this priority**: The user studies every day but lacks direction. The single biggest blocker is knowing *what* to study and *in what order* on any given day. This is the core daily-use value of the product.

**Independent Test**: Can be fully tested by logging in and seeing a daily plan showing 2–5 specific topics with estimated durations and objectives, generated automatically without any manual curation by the user.

**Acceptance Scenarios**:

1. **Given** the user has defined at least one learning goal, **When** they open the app on any day, **Then** they see a structured daily plan with 2–5 prioritized study tasks, each with a topic name, suggested duration, and clear learning objective
2. **Given** the user has marked some tasks as complete, **When** they return to the app later that day, **Then** the remaining tasks are visible, the completed ones are shown with a completion indicator, and overall daily progress is displayed as a percentage
3. **Given** the user did not study the previous day, **When** they open the app the next day, **Then** the system acknowledges the gap and adjusts the day's plan to be achievable without overwhelming the user, rather than doubling the workload

---

### User Story 2 - Structured Learning Path per Goal (Priority: P2)

As a learner with multiple focus areas (AI, cloud computing, architecture leadership), I want the system to generate a structured, ordered learning path for each goal so I always know what to study next and understand how topics build on each other.

**Why this priority**: Random daily studying without a structured sequence means foundational gaps get skipped and advanced topics feel disconnected. A structured path converts daily effort into compounding knowledge.

**Independent Test**: Can be tested by defining a single goal (e.g., "Master Agentic AI") and verifying the system outputs a multi-week learning path with topics ordered from foundational to advanced, including visible dependencies between topics.

**Acceptance Scenarios**:

1. **Given** the user defines a learning goal with a description and optional target date, **When** the system generates a learning path, **Then** topics are ordered from foundational to advanced with visible dependencies, and the path includes an estimated number of weeks to complete at the user's stated daily availability
2. **Given** the user completes a topic in a learning path, **When** they mark it as done, **Then** the next recommended topic in the path becomes highlighted, the overall path progress percentage updates, and the dependent topics become unlocked
3. **Given** a user has multiple active learning paths, **When** they view the home dashboard, **Then** the system recommends which path and specific topic to prioritize today based on their stated goal priorities and learning history

---

### User Story 3 - Spaced Repetition and Review Scheduling (Priority: P2)

As someone learning many topics across months, I want the app to automatically remind me to review previously studied material at the right time so I retain knowledge long-term and don't have to re-learn things I already covered.

**Why this priority**: Without systematic review, studied knowledge evaporates. The user studying daily without visible progress may partly be due to forgetting earlier topics. Spaced repetition directly addresses retention.

**Independent Test**: Can be tested by studying 3 topics on day 1 and verifying that review sessions for those topics appear in the daily plan at appropriate intervals (e.g., day 3, day 7, day 14) based on forgetting curve principles.

**Acceptance Scenarios**:

1. **Given** a topic was studied and marked as complete, **When** the review interval calculated by the system arrives, **Then** a review task for that topic appears in the daily plan with a note indicating it is a scheduled review
2. **Given** the user completes a review session and rates their confidence (1–5), **When** they submit the rating, **Then** a confidence of 4–5 extends the next review interval; a confidence of 1–2 shortens it and adds an extra review within the next 3 days
3. **Given** the daily plan has too many review tasks and new-learning tasks combined, **When** the system generates the day's plan, **Then** it respects the user's stated daily time limit and prioritizes overdue reviews over new learning

---

### User Story 4 - Progress Visibility and Evolution Dashboard (Priority: P3)

As someone who studies daily without feeling like they are advancing, I want to see a visual record of my learning history and progress across all goals so I can recognize real growth and stay motivated.

**Why this priority**: The user's core frustration is invisible progress. A progress dashboard transforms accumulated effort into visible evidence of learning, directly addressing the motivational gap.

**Independent Test**: Can be tested after logging one week of study sessions and verifying the dashboard shows a calendar heatmap of study days, a topic completion count per goal, average daily study time, and a streak counter.

**Acceptance Scenarios**:

1. **Given** the user has logged study sessions over multiple days, **When** they open the progress dashboard, **Then** they see a timeline or heatmap of study activity, total topics studied per goal, current streak, and overall knowledge coverage by area
2. **Given** a specific goal is selected, **When** the user views its detail page, **Then** they see completion percentage, list of mastered topics, remaining topics, and an estimated completion date based on their current pace
3. **Given** a topic has not been reviewed in longer than its scheduled interval, **When** the user views the progress page, **Then** that topic is visually flagged as "review overdue" and an option to schedule a review session is shown immediately

---

### User Story 5 - Goal Definition and Career Alignment (Priority: P3)

As a professional with clear career objectives in AI and architecture leadership, I want to define my learning goals linked to career outcomes so the app's recommendations are purposeful and directly advance my professional development.

**Why this priority**: Study without purpose leads to scattered knowledge. Linking topics to career goals ensures every study session contributes to something meaningful and measurable.

**Independent Test**: Can be tested by defining a goal ("Become an AI solutions architect by Q4 2026"), setting its priority, and verifying that the generated learning path only contains topics relevant to that goal and that daily plan suggestions reference it.

**Acceptance Scenarios**:

1. **Given** the user creates a learning goal with a title, description, priority level, and optional target date, **When** they save it, **Then** the system immediately proposes an initial set of learning topics and a suggested path to achieve that goal
2. **Given** multiple goals exist with different priorities, **When** the system generates the daily plan, **Then** study time is allocated proportionally to goal priority — higher priority goals receive more time in the daily plan
3. **Given** a goal's deadline is within 30 days and the user is unlikely to complete it at their current pace, **When** they view the goal, **Then** the system displays a warning and suggests either reducing the goal scope or increasing daily study time

---

### Edge Cases

- When the user hasn't studied for several days: the system detects the gap (≥2 consecutive missed days) and presents a choice — "Recover missed content (distributed over the next N days)" or "Resume with normal daily load from today"; the user's choice is applied immediately to the next generated plan
- How does the system handle a topic that spans multiple domains (e.g., "LLM Fine-tuning" is both AI and cloud computing)?
- What happens when the user marks a topic as already known — can they skip it in the learning path without it affecting their review schedule?
- How does the system handle conflicting goals that compete for the same limited daily study time?
- What if the user's available daily study time changes significantly mid-path (e.g., from 1 hour to 20 minutes per day)?
- What happens when the user wants to pause a goal temporarily without losing their progress?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow users to create learning goals with a title, description, priority level (high/medium/low), and optional target completion date
- **FR-002**: System MUST generate a structured, ordered learning path for each defined goal, showing topics in dependency order from foundational to advanced with estimated study durations per topic
- **FR-003**: System MUST generate a personalized daily study plan containing 2–5 prioritized tasks, respecting the user's stated daily time availability and balancing new learning with scheduled reviews
- **FR-004**: System MUST allow users to log completed study sessions specifying the topic, actual duration, and a self-assessed confidence rating on a 1–5 scale
- **FR-005**: System MUST implement spaced repetition scheduling: review intervals for each topic are automatically calculated after each session based on the user's confidence rating, following established forgetting-curve principles
- **FR-006**: System MUST surface overdue review tasks in the daily plan before new-learning tasks when the user's time limit is insufficient for both
- **FR-007**: System MUST provide a progress dashboard showing: study activity heatmap, topics completed per goal, current and longest learning streaks, and per-goal completion percentage
- **FR-008**: System MUST alert the user when a learning goal's deadline is at risk given the current study pace, and offer actionable options (reduce scope or increase daily time)
- **FR-009**: System MUST allow users to set and update their available daily study time so the daily plan generation respects that constraint
- **FR-010**: System MUST allow users to mark individual topics as "already known" (skip in new-learning queue but keep in review rotation) or "needs extra attention" (increase review frequency)
- **FR-011**: System MUST allow users to attach external resource links (URLs) and personal notes to each topic, so they can record where they are learning that topic
- **FR-012**: System MUST track daily study streaks and display them prominently to reinforce consistent habits
- **FR-013**: System MUST allow users to pause, resume, or archive a learning goal without losing progress data
- **FR-014**: System MUST operate as both a passive intelligent planner AND include an interactive AI coaching interface; the planner generates daily plans, learning paths, and spaced review schedules automatically, while the coaching panel allows the user to ask questions, describe their understanding of a topic, and receive personalized guidance and explanations in a conversational format; both modes must be available in v1, with the planner as the primary entry point
- **FR-015**: System MUST present a guided onboarding wizard
- **FR-016**: System MUST implement graceful degradation when the AI service is unavailable
- **FR-017**: System MUST provide a data portability and account deletion feature: users can export all their data (goals, learning paths, topics, study sessions, daily plans) as a single JSON file; users can permanently delete their account and all associated data; both actions must be accessible from account settings: if today's plan cannot be generated via AI, the system MUST automatically fall back to either (a) the previous day's pending tasks or (b) a rule-based plan selecting overdue reviews and the next unlocked topics in each active path; the user MUST NOT see a blocking error — a subtle banner indicating "AI unavailable, using smart fallback" is acceptable (2–3 steps) to first-time users before showing the dashboard: Step 1 — name and describe the first learning goal; Step 2 — set priority and optional target date; Step 3 — set daily available study time; only after completing these steps does the user land on the main dashboard with their generated plan

### Key Entities

- **Learning Goal**: A defined knowledge outcome the user wants to achieve, with title, priority, target date, and status
- **Learning Path**: An ordered sequence of topics with explicit dependencies, generated per goal, showing progression from foundational to advanced
- **Topic**: A discrete unit of knowledge within a path; has estimated study time, complexity level, completion status, confidence rating, and an attached review schedule; a single Topic entity may be referenced by multiple Learning Paths across different goals — progress, confidence ratings, and review schedules are shared (not duplicated) across all goals that include the same topic
- **Study Session**: A logged instance of learning activity; captures topic, date, actual duration, and confidence rating (1–5)
- **Daily Plan**: The system-generated set of study tasks for a specific day, dynamically balancing new learning and spaced reviews within the user's time budget
- **Review Schedule**: The per-topic calendar of upcoming review sessions, calculated from spaced repetition intervals adjusted by confidence ratings

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can define a learning goal and receive a complete, ordered learning path within 60 seconds of submission
- **SC-002**: The daily study plan is visible to the user within 3 seconds of opening the application
- **SC-003**: Users can log a completed study session in under 30 seconds
- **SC-004**: Users who follow the generated daily plan consistently for 30 days show measurable retention improvement, evidenced by increasing average confidence ratings on spaced review sessions (≥10% improvement vs. their first-week ratings)
- **SC-005**: 75% of users who use the app for at least 2 weeks report feeling more organized and in control of their study progress compared to before using the tool (measured via in-app survey)
- **SC-006**: Topics reviewed on schedule via spaced repetition show ≥20% higher average confidence scores compared to topics reviewed ad-hoc or not reviewed
- **SC-007**: Users report a ≥40% reduction in time spent deciding what to study each day, compared to self-reported baseline before using the tool

## Clarifications

### Session 2026-05-10

- Q: What does a new user see on first login with no goals? → A: Guided onboarding wizard (2–3 steps: goal creation → priority/date → daily time) before reaching the dashboard
- Q: When AI service is unavailable, what should the system do? → A: Fallback automático — reutiliza plano anterior ou gera plano por regras simples; exibe banner sutil, nunca bloqueia o usuário
- Q: When the same topic appears in multiple goals, how is it handled? → A: Shared entity — single Topic, progress and review schedule unified across all goals referencing it
- Q: After multiple missed study days, how should the system react? → A: Presents a choice to the user — recover missed content (distributed) or resume with normal load from today
- Q: Can users export or delete their learning data? → A: Yes — full JSON export + permanent account deletion, accessible from account settings

## Assumptions

- The primary user is a working professional with 30–90 minutes of study time available per day on weekdays; weekends may vary
- The application is web-first and accessed via browser; mobile responsiveness is a quality expectation but native mobile apps are out of scope for the initial version
- The system organizes and schedules study activities but does not host, generate, or stream learning content; users consume content from their own chosen sources (courses, books, videos)
- Users attach their own resource links to topics (YouTube videos, course URLs, articles); the system does not integrate with external learning platform APIs (no Coursera sync, no YouTube API)
- Authentication uses a standard account system with email and password; social login (e.g., Google) is desirable but not required for v1
- Self-assessed confidence ratings are the primary signal for the spaced repetition algorithm; no external validation or quiz-based assessment is required for v1
- The product supports a single user per account; team features, shared learning paths, and mentoring dashboards are out of scope for v1
- Internet connectivity is required at all times; offline mode is out of scope for v1
- The initial set of suggested topics for a learning path is AI-generated based on the goal description; users can add, remove, or reorder topics manually after generation
