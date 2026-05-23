"use client";

import { useEffect, useState } from "react";

import { StreaksSection } from "@/components/progress/StreaksSection";
import { StudyHeatmap } from "@/components/progress/StudyHeatmap";
import { GoalProgressCard } from "@/components/progress/GoalProgressCard";

function useCountUp(target: number, duration = 700) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    const steps = 25;
    const step = Math.max(1, Math.floor(target / steps));
    const interval = duration / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else setCount(current);
    }, interval);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

interface ProgressData {
  streaks: { current: number; longest: number; lastStudyDate: string | null };
  weeklyActivity: { date: string; sessionCount: number; totalMinutes: number }[];
  goalProgress: {
    id: string;
    title: string;
    priority: "high" | "medium" | "low";
    completionPercent: number;
    totalTopics: number;
    completedTopics: number;
    atRisk: boolean;
    estimatedCompletionDate: string | null;
    targetDate: string | null;
  }[];
  overdueReviews: number;
  totalTopicsStudied: number;
  totalStudyMinutes: number;
}

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/progress")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.streaks) setData(d); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-lg border bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const totalHours = Math.round(data.totalStudyMinutes / 60);
  const animatedTopics = useCountUp(data.totalTopicsStudied);
  const animatedHours = useCountUp(totalHours);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Hero stats — horizontal strip, no borders */}
      <div className="flex gap-8 pb-6 border-b border-border/60 mb-6">
        <div>
          <p className="font-display text-4xl font-bold tracking-tight animate-count-in fill-mode-both">{animatedTopics}</p>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">Tópicos estudados</p>
        </div>
        <div className="w-px bg-border/60 self-stretch" />
        <div>
          <p className="font-display text-4xl font-bold tracking-tight animate-count-in fill-mode-both">{animatedHours}h</p>
          <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">Tempo total</p>
        </div>
        <div className="ml-auto self-center">
          {data.streaks.current > 0 && (
            <div className="flex items-center gap-1.5 text-orange-500">
              <span className="text-2xl font-display font-bold">{data.streaks.current}</span>
              <span className="text-xs font-medium">dias seguidos</span>
            </div>
          )}
        </div>
      </div>

      <StreaksSection
        current={data.streaks.current}
        longest={data.streaks.longest}
        lastStudyDate={data.streaks.lastStudyDate}
      />

      <StudyHeatmap weeklyActivity={data.weeklyActivity} />

      {data.goalProgress.length > 0 && (
        <section>
          <div className="space-y-3">
            {data.goalProgress.map((goal) => (
              <GoalProgressCard key={goal.id} goal={goal} />
            ))}
          </div>
        </section>
      )}

      {data.overdueReviews > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {data.overdueReviews} topic{data.overdueReviews !== 1 ? "s" : ""} due for review — check your dashboard.
        </div>
      )}
    </div>
  );
}
