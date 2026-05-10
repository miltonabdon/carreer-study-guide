# API Contracts: AI-Powered Personal Study Guide

**Branch**: `001-ai-study-guide-app` | **Date**: 2026-05-09
**Phase**: 1 — Interface contracts for the web application's REST API

All endpoints are under `/api/` prefix (Next.js App Router). Authentication required on all endpoints except `/api/auth/*`. Responses use `application/json`. Errors follow the shape `{ error: string, code?: string }`.

---

## Authentication

### POST /api/auth/register
Create a new user account.

**Request**:
```ts
{
  email: string;      // valid email
  password: string;   // min 8 chars
  displayName: string;
  dailyAvailableMinutes?: number; // default: 60
  timezone?: string;  // IANA timezone, default: 'UTC'
}
```

**Response 201**:
```ts
{
  userId: string;
  email: string;
  displayName: string;
}
```

---

### POST /api/auth/login
Authenticate and create a session.

**Request**: `{ email: string; password: string }`

**Response 200**: `{ userId: string; displayName: string }` + sets session cookie

---

### POST /api/auth/logout
Destroy session.

**Response 200**: `{ success: true }`

---

## Goals

### GET /api/goals
List all goals for the authenticated user.

**Response 200**:
```ts
{
  goals: Array<{
    id: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    targetDate: string | null;    // ISO date
    status: 'active' | 'paused' | 'archived';
    completedTopics: number;
    totalTopics: number;
    completionPercent: number;
    estimatedCompletionDate: string | null;
    createdAt: string;
  }>;
}
```

---

### POST /api/goals
Create a new learning goal and trigger AI learning path generation.

**Request**:
```ts
{
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  targetDate?: string;  // ISO date
}
```

**Response 201**:
```ts
{
  goalId: string;
  pathId: string;
  totalTopics: number;
  estimatedWeeks: number;
  topics: Array<{
    id: string;
    title: string;
    orderIndex: number;
    complexity: 1 | 2 | 3 | 4 | 5;
    estimatedMinutes: number;
    status: 'locked' | 'unlocked';
  }>;
}
```

**Note**: Learning path generation is synchronous but may take up to 60s (SC-001). Client should show a loading state.

---

### PATCH /api/goals/[goalId]
Update goal fields or status.

**Request** (all fields optional):
```ts
{
  title?: string;
  description?: string;
  priority?: 'high' | 'medium' | 'low';
  targetDate?: string | null;
  status?: 'active' | 'paused' | 'archived';
}
```

**Response 200**: Updated goal object (same shape as GET /api/goals item)

---

### DELETE /api/goals/[goalId]
Archive a goal (soft delete — sets status to 'archived').

**Response 200**: `{ success: true }`

---

## Learning Paths

### GET /api/goals/[goalId]/path
Get the learning path and all topics for a goal.

**Response 200**:
```ts
{
  pathId: string;
  goalId: string;
  generatedAt: string;
  totalEstimatedMinutes: number;
  completionWeeksEstimate: number | null;
  topics: Array<{
    id: string;
    title: string;
    description: string | null;
    orderIndex: number;
    complexity: 1 | 2 | 3 | 4 | 5;
    estimatedMinutes: number;
    status: 'locked' | 'unlocked' | 'in_progress' | 'complete' | 'skipped';
    resourceUrl: string | null;
    notes: string | null;
    fsrState: 'New' | 'Learning' | 'Review' | 'Relearning';
    nextReviewAt: string | null;
    lastReviewedAt: string | null;
  }>;
}
```

---

### POST /api/goals/[goalId]/path/regenerate
Regenerate the learning path using AI (archives current path, creates new one).

**Request**: `{ keepCompletedTopics?: boolean }` — default false

**Response 200**: Same shape as GET /api/goals/[goalId]/path

---

## Topics

### PATCH /api/topics/[topicId]
Update topic metadata (user-editable fields only).

**Request** (all optional):
```ts
{
  resourceUrl?: string | null;
  notes?: string | null;
  status?: 'unlocked' | 'skipped';  // Only these transitions allowed via PATCH
}
```

**Response 200**: Updated topic object

---

## Study Sessions

### POST /api/sessions
Log a completed study session. This write triggers FSRS recalculation and daily plan cache invalidation.

**Request**:
```ts
{
  topicId: string;
  sessionType: 'new_learning' | 'review';
  studiedAt: string;          // ISO date (YYYY-MM-DD) in user's timezone
  durationMinutes: number;    // must be > 0
  confidenceRating: 1 | 2 | 3 | 4 | 5;
  notes?: string;
}
```

**Response 201**:
```ts
{
  sessionId: string;
  topicUpdated: {
    id: string;
    status: string;
    fsrsState: string;
    nextReviewAt: string | null;
    fsrsStability: number;
    fsrsDifficulty: number;
  };
  nextTopicUnlocked: {   // null if no new topic unlocked
    id: string;
    title: string;
  } | null;
}
```

---

### GET /api/sessions
List sessions for the authenticated user.

**Query params**: `?topicId=&from=&to=&limit=50&offset=0`

**Response 200**:
```ts
{
  sessions: Array<{
    id: string;
    topicId: string;
    topicTitle: string;
    sessionType: 'new_learning' | 'review';
    studiedAt: string;
    durationMinutes: number;
    confidenceRating: number;
    notes: string | null;
    createdAt: string;
  }>;
  total: number;
}
```

---

## Daily Plan

### GET /api/plans/today
Get today's daily plan. Generates a new plan if none exists for today.

**Response 200**:
```ts
{
  planId: string;
  planDate: string;              // YYYY-MM-DD
  availableMinutes: number;
  status: 'active' | 'completed' | 'expired';
  aiRationale: string | null;
  generatedAt: string;
  tasks: Array<{
    id: string;
    topicId: string;
    topicTitle: string;
    goalTitle: string;
    taskType: 'new_learning' | 'review';
    suggestedMinutes: number;
    orderIndex: number;
    status: 'pending' | 'completed' | 'skipped';
    completedAt: string | null;
    isOverdueReview: boolean;
  }>;
  completedCount: number;
  totalCount: number;
}
```

---

### PATCH /api/plans/today/tasks/[taskId]
Mark a task as completed or skipped (triggers session log if completed).

**Request**:
```ts
{
  status: 'completed' | 'skipped';
  durationMinutes?: number;      // required if status='completed'
  confidenceRating?: 1|2|3|4|5; // required if status='completed'
  notes?: string;
}
```

**Response 200**: Updated task object + updated plan summary

---

## Progress

### GET /api/progress
Get the user's progress dashboard data.

**Response 200**:
```ts
{
  streaks: {
    current: number;       // days
    longest: number;       // days
    lastStudyDate: string | null;
  };
  weeklyActivity: Array<{
    date: string;          // YYYY-MM-DD
    sessionCount: number;
    totalMinutes: number;
  }>;                      // Last 90 days for heatmap
  goalsProgress: Array<{
    goalId: string;
    goalTitle: string;
    priority: string;
    completedTopics: number;
    totalTopics: number;
    completionPercent: number;
    targetDate: string | null;
    estimatedCompletionDate: string | null;
    atRisk: boolean;       // true if behind pace for target date
  }>;
  overdueReviews: number;  // count of topics with past-due next_review_at
  totalTopicsStudied: number;
  totalStudyMinutes: number;
}
```

---

## AI Coach Chat

### POST /api/coach
Streaming endpoint for the AI coaching chat. Returns a streaming text response (text/event-stream).

**Request**:
```ts
{
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  topicId?: string;   // current topic context (optional)
}
```

**Response**: `Content-Type: text/event-stream` — Server-Sent Events stream of text chunks, compatible with Vercel AI SDK `useChat()` hook.

**Context injected server-side** (not sent by client):
- User's background (from profile)
- Current topic title + description (if topicId provided)
- User's completed topics list (for coaching depth calibration)
- Last 8 messages from this conversation

---

## Error Codes

| HTTP Status | code | Meaning |
|-------------|------|---------|
| 400 | `VALIDATION_ERROR` | Request body fails schema validation |
| 401 | `UNAUTHENTICATED` | No valid session |
| 403 | `FORBIDDEN` | Resource belongs to another user |
| 404 | `NOT_FOUND` | Resource does not exist |
| 409 | `CONFLICT` | Duplicate resource (e.g., session already logged for today's task) |
| 429 | `RATE_LIMITED` | Too many AI generation requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
| 503 | `AI_UNAVAILABLE` | Claude API unreachable |
