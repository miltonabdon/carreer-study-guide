"use client";

import { Flame, AlertCircle } from "lucide-react";

interface StreakBadgeProps {
  currentStreak: number;
  overdueReviewCount?: number;
}

function streakMilestone(streak: number): string | null {
  if (streak >= 365) return "1 ano!";
  if (streak >= 100) return "100 dias!";
  if (streak >= 30) return "1 mês!";
  if (streak >= 14) return "2 semanas!";
  if (streak >= 7) return "1 semana!";
  if (streak >= 3) return "3 dias!";
  return null;
}

export function StreakBadge({ currentStreak, overdueReviewCount = 0 }: StreakBadgeProps) {
  const milestone = streakMilestone(currentStreak);
  const isHot = currentStreak >= 7;

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 transition-all ${
          isHot
            ? "bg-streak-subtle border-streak-border shadow-sm"
            : "bg-streak-subtle border-streak-border/60"
        }`}
      >
        <Flame
          className={`shrink-0 ${
            currentStreak > 0 ? "text-streak" : "text-muted-foreground"
          } ${isHot ? "h-5 w-5" : "h-4 w-4"}`}
        />
        <span
          className={`font-bold leading-none tabular-nums text-streak-text ${
            isHot ? "text-xl" : "text-base"
          }`}
        >
          {currentStreak}
        </span>
        {milestone ? (
          <span className="text-xs font-semibold text-streak-text bg-streak border-streak-border rounded-full px-2 py-0.5 leading-none">
            {milestone}
          </span>
        ) : (
          <span className="text-xs text-streak-text/70 leading-none">
            dia{currentStreak !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {overdueReviewCount > 0 && (
        <div className="flex items-center gap-1.5 rounded-full bg-warning-subtle border border-warning-border px-3 py-1">
          <AlertCircle className="h-4 w-4 text-warning" />
          <span className="text-xs text-warning-text">
            {overdueReviewCount} revisão{overdueReviewCount !== 1 ? "ões" : ""} em atraso
          </span>
        </div>
      )}
    </div>
  );
}
