"use client";

import { useState, useEffect } from "react";
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

const PRIORITY_COLORS: Record<"high" | "medium" | "low", string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-green-100 text-green-700",
};

export function GoalCard({ goal, onStatusChange }: GoalCardProps) {
  const [toggling, setToggling] = useState(false);
  const [barHeight, setBarHeight] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setBarHeight(goal.completionPercent), 80);
    return () => clearTimeout(t);
  }, [goal.completionPercent]);

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

  async function handleToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!onStatusChange || toggling) return;
    setToggling(true);
    const next = goal.status === "active" ? "paused" : "active";
    await onStatusChange(goal.id, next);
    setToggling(false);
  }

  const paused = goal.status === "paused";
  const active = goal.status === "active";

  return (
    <Link href={`/goals/${goal.id}/path`} className="block">
      <div
        className={`rounded-xl border border-border/60 bg-card hover:shadow-md hover:border-primary/20 transition-all duration-200 p-5 flex gap-4 ${
          paused ? "opacity-60" : ""
        }`}
      >
        {/* Barra vertical de progresso */}
        <div className="w-1 rounded-full bg-muted relative overflow-hidden shrink-0 self-stretch min-h-[80px]">
          <div
            className={`absolute inset-x-0 bottom-0 rounded-full transition-all duration-700 ease-out ${
              goal.atRisk && active ? "bg-amber-500" : "bg-primary"
            }`}
            style={{ height: `${barHeight}%` }}
          />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          {/* Header: title + priority + pause button */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-semibold text-base leading-tight flex-1 min-w-0">{goal.title}</h3>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-medium capitalize ${PRIORITY_COLORS[goal.priority]}`}
              >
                {goal.priority}
              </span>
              {onStatusChange && (goal.status === "active" || goal.status === "paused") && (
                <button
                  onClick={handleToggle}
                  disabled={toggling}
                  title={goal.status === "active" ? "Pausar meta" : "Retomar meta"}
                  className={`rounded p-1 transition-colors disabled:opacity-50 ${
                    paused
                      ? "text-primary hover:bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {paused ? (
                    <Play className="h-3.5 w-3.5" />
                  ) : (
                    <Pause className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Paused notice */}
          {paused && (
            <p className="text-xs text-muted-foreground mb-2">Meta pausada — revisões suspensas</p>
          )}

          {/* Description */}
          <p className="text-sm text-muted-foreground line-clamp-2">{goal.description}</p>

          {/* atRisk inline */}
          {goal.atRisk && active && (
            <p className="text-xs text-amber-600 flex items-center gap-1 mt-2">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {daysLate !== null && daysLate > 0
                ? `${daysLate} dias atrasado`
                : "Ritmo abaixo do esperado"}
              {estDateLabel && ` · conclusão estimada ${estDateLabel}`}
            </p>
          )}

          {/* Stats */}
          <p className="text-xs text-muted-foreground mt-3">
            {goal.completedTopics}/{goal.totalTopics} tópicos · {goal.completionPercent}%
          </p>

          {/* Days left */}
          {daysLeft !== null && active && (
            <p
              className={`mt-1 text-xs ${daysLeft < 14 ? "text-destructive" : "text-muted-foreground"}`}
            >
              {daysLeft > 0
                ? `${daysLeft} dias restantes`
                : `${Math.abs(daysLeft)} dias em atraso`}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
