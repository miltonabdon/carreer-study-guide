"use client";

import { useState, useEffect } from "react";
import { Flame, Trophy, Calendar } from "lucide-react";

interface StreaksSectionProps {
  current: number;
  longest: number;
  lastStudyDate: string | null;
}

function useCountUp(target: number, duration = 600) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const steps = 20;
    const step = target / steps;
    const interval = duration / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, interval);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

export function StreaksSection({ current, longest, lastStudyDate }: StreaksSectionProps) {
  const animatedCurrent = useCountUp(current);
  const animatedLongest = useCountUp(longest);

  const lastDate = lastStudyDate
    ? new Date(lastStudyDate + "T12:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "Never";

  return (
    <div className="flex items-center gap-6 py-4">
      <div className="flex items-center gap-2">
        <Flame className="h-5 w-5 text-orange-500" />
        <span className="font-display font-bold text-xl">{animatedCurrent}</span>
        <span className="text-xs text-muted-foreground">sequência atual</span>
      </div>
      <div className="w-px h-4 bg-border/60" />
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-yellow-500" />
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
