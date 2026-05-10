"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

interface GoalCardProps {
  goal: {
    id: string;
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    targetDate: string | null;
    status: "active" | "paused" | "archived";
    completionPercent: number;
    totalTopics: number;
    completedTopics: number;
    atRisk?: boolean;
    estimatedCompletionDate?: string | null;
  };
}

const PRIORITY_COLORS = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

export function GoalCard({ goal }: GoalCardProps) {
  const daysLeft = goal.targetDate
    ? Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / 86400000)
    : null;

  const daysLate =
    goal.atRisk && goal.estimatedCompletionDate && goal.targetDate
      ? Math.ceil(
          (new Date(goal.estimatedCompletionDate).getTime() -
            new Date(goal.targetDate).getTime()) /
            86400000
        )
      : null;

  const estDateLabel = goal.estimatedCompletionDate
    ? new Date(goal.estimatedCompletionDate + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const riskSuggestion =
    daysLate !== null && daysLate > 30
      ? "Increase daily study time or reduce goal scope."
      : "A bit behind — slightly more daily time will catch up.";

  return (
    <Link href={`/goals/${goal.id}/path`} className="block">
      <div className="rounded-lg border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-semibold text-base leading-tight">{goal.title}</h3>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PRIORITY_COLORS[goal.priority]}`}
          >
            {goal.priority}
          </span>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{goal.description}</p>

        {goal.atRisk && (
          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 mb-3 text-xs text-amber-700 space-y-1">
            <div className="flex items-center gap-1.5 font-medium">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Behind pace
              {daysLate !== null && daysLate > 0 && (
                <span className="font-normal">— {daysLate} day{daysLate !== 1 ? "s" : ""} late</span>
              )}
            </div>
            {estDateLabel && (
              <p>Est. finish: <span className="font-medium">{estDateLabel}</span></p>
            )}
            <p className="text-amber-600">{riskSuggestion}</p>
          </div>
        )}

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {goal.completedTopics} / {goal.totalTopics} topics
            </span>
            <span>{goal.completionPercent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${goal.atRisk ? "bg-amber-500" : "bg-primary"}`}
              style={{ width: `${goal.completionPercent}%` }}
            />
          </div>
        </div>

        {daysLeft !== null && (
          <p className={`mt-3 text-xs ${daysLeft < 14 ? "text-destructive" : "text-muted-foreground"}`}>
            {daysLeft > 0 ? `${daysLeft} days remaining` : `${Math.abs(daysLeft)} days overdue`}
          </p>
        )}
      </div>
    </Link>
  );
}
