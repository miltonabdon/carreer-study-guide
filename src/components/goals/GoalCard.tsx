"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Pause, Play } from "lucide-react";

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
  onStatusChange?: (goalId: string, status: "active" | "paused") => Promise<void>;
}

const PRIORITY_COLORS = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

export function GoalCard({ goal, onStatusChange }: GoalCardProps) {
  const [toggling, setToggling] = useState(false);

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
    ? new Date(goal.estimatedCompletionDate + "T12:00:00").toLocaleDateString("pt-BR", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const riskSuggestion =
    daysLate !== null && daysLate > 30
      ? "Aumente o tempo diário ou reduza o escopo da meta."
      : "Levemente atrasado — um pouco mais de tempo diário resolve.";

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!onStatusChange || toggling) return;
    setToggling(true);
    const next = goal.status === "active" ? "paused" : "active";
    await onStatusChange(goal.id, next);
    setToggling(false);
  }

  return (
    <Link href={`/goals/${goal.id}/path`} className="block">
      <div
        className={`rounded-lg border bg-card p-5 shadow-sm hover:shadow-md transition-shadow ${
          goal.status === "paused" ? "opacity-70" : ""
        }`}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-semibold text-base leading-tight flex-1 min-w-0">{goal.title}</h3>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${PRIORITY_COLORS[goal.priority]}`}
            >
              {goal.priority}
            </span>
            {onStatusChange && (goal.status === "active" || goal.status === "paused") && (
              <button
                onClick={handleToggle}
                disabled={toggling}
                title={goal.status === "active" ? "Pausar meta" : "Retomar meta"}
                className={`rounded p-1 transition-colors disabled:opacity-50 ${
                  goal.status === "paused"
                    ? "text-primary hover:bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {goal.status === "paused" ? (
                  <Play className="h-3.5 w-3.5" />
                ) : (
                  <Pause className="h-3.5 w-3.5" />
                )}
              </button>
            )}
          </div>
        </div>

        {goal.status === "paused" && (
          <div className="rounded-md bg-muted px-2.5 py-1.5 mb-3 text-xs text-muted-foreground">
            Meta pausada — revisões suspensas
          </div>
        )}

        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{goal.description}</p>

        {goal.atRisk && goal.status === "active" && (
          <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 mb-3 text-xs text-amber-700 space-y-1">
            <div className="flex items-center gap-1.5 font-medium">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              Atraso no ritmo
              {daysLate !== null && daysLate > 0 && (
                <span className="font-normal">— {daysLate} dia{daysLate !== 1 ? "s" : ""} atrasado</span>
              )}
            </div>
            {estDateLabel && (
              <p>Conclusão estimada: <span className="font-medium">{estDateLabel}</span></p>
            )}
            <p className="text-amber-600">{riskSuggestion}</p>
          </div>
        )}

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {goal.completedTopics} / {goal.totalTopics} tópicos
            </span>
            <span>{goal.completionPercent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${goal.atRisk && goal.status === "active" ? "bg-amber-500" : "bg-primary"}`}
              style={{ width: `${goal.completionPercent}%` }}
            />
          </div>
        </div>

        {daysLeft !== null && goal.status === "active" && (
          <p className={`mt-3 text-xs ${daysLeft < 14 ? "text-destructive" : "text-muted-foreground"}`}>
            {daysLeft > 0 ? `${daysLeft} dias restantes` : `${Math.abs(daysLeft)} dias em atraso`}
          </p>
        )}
      </div>
    </Link>
  );
}
