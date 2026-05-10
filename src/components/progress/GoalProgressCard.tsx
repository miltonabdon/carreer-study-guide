"use client";

import { AlertTriangle } from "lucide-react";

interface GoalProgressCardProps {
  goal: {
    id: string;
    title: string;
    priority: "high" | "medium" | "low";
    completionPercent: number;
    totalTopics: number;
    completedTopics: number;
    atRisk: boolean;
    estimatedCompletionDate: string | null;
    targetDate: string | null;
  };
}

const PRIORITY_COLORS = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

export function GoalProgressCard({ goal }: GoalProgressCardProps) {
  const estimatedDate = goal.estimatedCompletionDate
    ? new Date(goal.estimatedCompletionDate + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const daysLate =
    goal.atRisk && goal.estimatedCompletionDate && goal.targetDate
      ? Math.ceil(
          (new Date(goal.estimatedCompletionDate).getTime() -
            new Date(goal.targetDate).getTime()) /
            86400000
        )
      : null;

  const riskSuggestion =
    daysLate !== null && daysLate > 30
      ? "Increase daily study time or reduce scope."
      : "Slightly more daily time will close the gap.";

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-medium text-sm">{goal.title}</h3>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PRIORITY_COLORS[goal.priority]}`}>
          {goal.priority}
        </span>
      </div>

      {goal.atRisk && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-2.5 py-2 mb-3 text-xs text-amber-700 space-y-0.5">
          <div className="flex items-center gap-1.5 font-medium">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Behind pace
            {daysLate !== null && daysLate > 0 && (
              <span className="font-normal">— {daysLate}d late</span>
            )}
          </div>
          <p className="text-amber-600 pl-5">{riskSuggestion}</p>
        </div>
      )}

      <div className="space-y-1 mb-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{goal.completedTopics} / {goal.totalTopics} topics</span>
          <span>{goal.completionPercent}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${goal.atRisk ? "bg-amber-500" : "bg-primary"}`}
            style={{ width: `${goal.completionPercent}%` }}
          />
        </div>
      </div>

      {estimatedDate && (
        <p className={`text-xs ${goal.atRisk ? "text-amber-600" : "text-muted-foreground"}`}>
          Est. completion: <span className="font-medium">{estimatedDate}</span>
        </p>
      )}
    </div>
  );
}
