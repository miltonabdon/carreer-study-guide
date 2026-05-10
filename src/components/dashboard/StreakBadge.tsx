"use client";

import { Flame, AlertCircle } from "lucide-react";

interface StreakBadgeProps {
  currentStreak: number;
  overdueReviewCount?: number;
}

export function StreakBadge({ currentStreak, overdueReviewCount = 0 }: StreakBadgeProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1.5 rounded-full bg-orange-50 border border-orange-200 px-3 py-1">
        <Flame className="h-4 w-4 text-orange-500" />
        <span className="text-sm font-semibold text-orange-700">{currentStreak}</span>
        <span className="text-xs text-orange-600">day streak</span>
      </div>

      {overdueReviewCount > 0 && (
        <div className="flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <span className="text-xs text-amber-700">
            {overdueReviewCount} review{overdueReviewCount !== 1 ? "s" : ""} overdue
          </span>
        </div>
      )}
    </div>
  );
}
