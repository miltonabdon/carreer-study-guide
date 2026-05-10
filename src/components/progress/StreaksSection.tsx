"use client";

import { Flame, Trophy, Calendar } from "lucide-react";

interface StreaksSectionProps {
  current: number;
  longest: number;
  lastStudyDate: string | null;
}

export function StreaksSection({ current, longest, lastStudyDate }: StreaksSectionProps) {
  const lastDate = lastStudyDate
    ? new Date(lastStudyDate + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "Never";

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="rounded-lg border bg-card p-4 text-center">
        <div className="flex justify-center mb-2">
          <Flame className="h-6 w-6 text-orange-500" />
        </div>
        <p className="text-2xl font-bold">{current}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Current streak</p>
      </div>

      <div className="rounded-lg border bg-card p-4 text-center">
        <div className="flex justify-center mb-2">
          <Trophy className="h-6 w-6 text-yellow-500" />
        </div>
        <p className="text-2xl font-bold">{longest}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Longest streak</p>
      </div>

      <div className="rounded-lg border bg-card p-4 text-center">
        <div className="flex justify-center mb-2">
          <Calendar className="h-6 w-6 text-primary" />
        </div>
        <p className="text-base font-bold">{lastDate}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Last study day</p>
      </div>
    </div>
  );
}
