import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  date,
  real,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const goalPriorityEnum = pgEnum("goal_priority", ["high", "medium", "low"]);
export const goalStatusEnum = pgEnum("goal_status", ["active", "paused", "archived"]);
export const topicStatusEnum = pgEnum("topic_status", [
  "locked",
  "unlocked",
  "in_progress",
  "complete",
  "skipped",
]);
export const fsrsStateEnum = pgEnum("fsrs_state", ["New", "Learning", "Review", "Relearning"]);
export const sessionTypeEnum = pgEnum("session_type", ["new_learning", "review"]);
export const planStatusEnum = pgEnum("plan_status", ["active", "completed", "expired"]);
export const taskStatusEnum = pgEnum("task_status", ["pending", "completed", "skipped"]);
export const pathStatusEnum = pgEnum("path_status", ["active", "regenerated", "archived"]);

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  dailyAvailableMinutes: integer("daily_available_minutes").notNull().default(60),
  timezone: varchar("timezone", { length: 50 }).notNull().default("UTC"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── NextAuth tables ──────────────────────────────────────────────────────────

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 255 }).notNull(),
  provider: varchar("provider", { length: 255 }).notNull(),
  providerAccountId: varchar("provider_account_id", { length: 255 }).notNull(),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  expiresAt: integer("expires_at"),
  tokenType: varchar("token_type", { length: 255 }),
  scope: varchar("scope", { length: 255 }),
  idToken: text("id_token"),
  sessionState: varchar("session_state", { length: 255 }),
});

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: varchar("identifier", { length: 255 }).notNull(),
  token: varchar("token", { length: 255 }).notNull(),
  expires: timestamp("expires").notNull(),
});

// ─── Learning Goals ───────────────────────────────────────────────────────────

export const learningGoals = pgTable("learning_goals", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description").notNull(),
  priority: goalPriorityEnum("priority").notNull().default("medium"),
  targetDate: date("target_date"),
  status: goalStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Learning Paths ───────────────────────────────────────────────────────────

export const learningPaths = pgTable("learning_paths", {
  id: uuid("id").defaultRandom().primaryKey(),
  goalId: uuid("goal_id")
    .notNull()
    .references(() => learningGoals.id, { onDelete: "cascade" }),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  totalEstimatedMinutes: integer("total_estimated_minutes").notNull().default(0),
  completionWeeksEstimate: integer("completion_weeks_estimate"),
  status: pathStatusEnum("status").notNull().default("active"),
});

// ─── Topics ───────────────────────────────────────────────────────────────────

export const topics = pgTable("topics", {
  id: uuid("id").defaultRandom().primaryKey(),
  pathId: uuid("path_id")
    .notNull()
    .references(() => learningPaths.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull(),
  complexity: integer("complexity").notNull().default(3),
  estimatedMinutes: integer("estimated_minutes").notNull().default(45),
  status: topicStatusEnum("status").notNull().default("locked"),
  resourceUrl: text("resource_url"),
  notes: text("notes"),
  // FSRS fields
  fsrsState: fsrsStateEnum("fsrs_state").notNull().default("New"),
  fsrsStability: real("fsrs_stability"),
  fsrsDifficulty: real("fsrs_difficulty"),
  fsrsRetrievability: real("fsrs_retrievability"),
  fsrsLapses: integer("fsrs_lapses").notNull().default(0),
  nextReviewAt: timestamp("next_review_at"),
  lastReviewedAt: timestamp("last_reviewed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Study Sessions ───────────────────────────────────────────────────────────

export const studySessions = pgTable("study_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  topicId: uuid("topic_id")
    .notNull()
    .references(() => topics.id, { onDelete: "cascade" }),
  sessionType: sessionTypeEnum("session_type").notNull(),
  studiedAt: date("studied_at").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
  confidenceRating: integer("confidence_rating").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Daily Plans ──────────────────────────────────────────────────────────────

export const dailyPlans = pgTable("daily_plans", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  planDate: date("plan_date").notNull(),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  availableMinutes: integer("available_minutes").notNull(),
  status: planStatusEnum("status").notNull().default("active"),
  aiRationale: text("ai_rationale"),
});

// ─── Daily Plan Tasks ─────────────────────────────────────────────────────────

export const dailyPlanTasks = pgTable("daily_plan_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  planId: uuid("plan_id")
    .notNull()
    .references(() => dailyPlans.id, { onDelete: "cascade" }),
  topicId: uuid("topic_id")
    .notNull()
    .references(() => topics.id, { onDelete: "cascade" }),
  taskType: sessionTypeEnum("task_type").notNull(),
  suggestedMinutes: integer("suggested_minutes").notNull(),
  orderIndex: integer("order_index").notNull(),
  status: taskStatusEnum("status").notNull().default("pending"),
  completedAt: timestamp("completed_at"),
});

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  goals: many(learningGoals),
  studySessions: many(studySessions),
  dailyPlans: many(dailyPlans),
}));

export const learningGoalsRelations = relations(learningGoals, ({ one, many }) => ({
  user: one(users, { fields: [learningGoals.userId], references: [users.id] }),
  path: many(learningPaths),
}));

export const learningPathsRelations = relations(learningPaths, ({ one, many }) => ({
  goal: one(learningGoals, { fields: [learningPaths.goalId], references: [learningGoals.id] }),
  topics: many(topics),
}));

export const topicsRelations = relations(topics, ({ one, many }) => ({
  path: one(learningPaths, { fields: [topics.pathId], references: [learningPaths.id] }),
  studySessions: many(studySessions),
  dailyPlanTasks: many(dailyPlanTasks),
}));

export const studySessionsRelations = relations(studySessions, ({ one }) => ({
  user: one(users, { fields: [studySessions.userId], references: [users.id] }),
  topic: one(topics, { fields: [studySessions.topicId], references: [topics.id] }),
}));

export const dailyPlansRelations = relations(dailyPlans, ({ one, many }) => ({
  user: one(users, { fields: [dailyPlans.userId], references: [users.id] }),
  tasks: many(dailyPlanTasks),
}));

export const dailyPlanTasksRelations = relations(dailyPlanTasks, ({ one }) => ({
  plan: one(dailyPlans, { fields: [dailyPlanTasks.planId], references: [dailyPlans.id] }),
  topic: one(topics, { fields: [dailyPlanTasks.topicId], references: [topics.id] }),
}));
