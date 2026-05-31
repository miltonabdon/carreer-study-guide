"use client";

import { useState, useEffect } from "react";
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
  high: "bg-destructive/10 text-destructive",
  medium: "bg-warning-subtle text-warning-text border border-warning-border",
  low: "bg-success-subtle text-success-text border border-success-border",
};

const PRIORITY_LABELS = {
  high: "alta",
  medium: "média",
  low: "baixa",
};

export function GoalProgressCard({ goal }: GoalProgressCardProps) {
  const [barHeight, setBarHeight] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setBarHeight(goal.completionPercent), 80);
    return () => clearTimeout(t);
  }, [goal.completionPercent]);

  const estimatedDate = goal.estimatedCompletionDate
    ? new Date(goal.estimatedCompletionDate + "T12:00:00").toLocaleDateString("pt-BR", {
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

  return (
    <div className="flex items-stretch gap-4 py-4 border-b border-border/60 last:border-0">
      {/* Vertical progress bar */}
      <div className="w-1 rounded-full bg-muted relative overflow-hidden self-stretch min-h-[48px]">
        <div
          className={`absolute inset-x-0 bottom-0 rounded-full transition-all duration-700 ease-out ${goal.atRisk ? "bg-warning" : "bg-primary"}`}
          style={{ height: `${barHeight}%` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <h3 className="font-medium text-sm">{goal.title}</h3>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[goal.priority]}`}>
            {PRIORITY_LABELS[goal.priority]}
          </span>
          {goal.atRisk && (
            <span className="shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-warning-subtle text-warning-text border border-warning-border">
              <AlertTriangle className="h-3 w-3" />
              atrasado
              {daysLate !== null && daysLate > 0 && ` ${daysLate}d`}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {goal.completedTopics}/{goal.totalTopics} tópicos · {goal.completionPercent}%
          {estimatedDate && (
            <span className={`ml-2 ${goal.atRisk ? "text-warning-text" : ""}`}>
              · previsão {estimatedDate}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
