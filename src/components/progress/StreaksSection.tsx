"use client";

import { Flame, Trophy, Calendar } from "lucide-react";
import { useCountUp } from "@/lib/hooks/useCountUp";

interface StreaksSectionProps {
  current: number;
  longest: number;
  lastStudyDate: string | null;
}

export function StreaksSection({ current, longest, lastStudyDate }: StreaksSectionProps) {
  const animatedCurrent = useCountUp(current);
  const animatedLongest = useCountUp(longest);

  const lastDate = lastStudyDate
    ? new Date(lastStudyDate + "T12:00:00").toLocaleDateString("pt-BR", {
        month: "short",
        day: "numeric",
      })
    : "Nunca";

  return (
    <div className="flex items-center gap-6 py-4">
      <div className="flex items-center gap-2">
        <Flame className="h-5 w-5 text-streak" />
        <span className="font-display font-bold text-xl">{animatedCurrent}</span>
        <span className="text-xs text-muted-foreground">sequência atual</span>
      </div>
      <div className="w-px h-4 bg-border/60" />
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-warning" />
        <span className="font-display font-bold text-lg">{animatedLongest}</span>
        <span className="text-xs text-muted-foreground">recorde</span>
      </div>
      <div className="w-px h-4 bg-border/60" />
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{lastDate}</span>
        <span className="text-xs text-muted-foreground">último estudo</span>
      </div>
    </div>
  );
}
