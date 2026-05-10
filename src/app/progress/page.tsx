"use client";

import { useEffect, useState } from "react";
import { BookOpen, Clock } from "lucide-react";
import { StreaksSection } from "@/components/progress/StreaksSection";
import { StudyHeatmap } from "@/components/progress/StudyHeatmap";
import { GoalProgressCard } from "@/components/progress/GoalProgressCard";

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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Progress</h1>
        <p className="text-sm text-muted-foreground mt-1">Your study history and goal tracking</p>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xl font-bold">{data.totalTopicsStudied}</p>
            <p className="text-xs text-muted-foreground">Topics studied</p>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xl font-bold">{totalHours}h</p>
            <p className="text-xs text-muted-foreground">Total study time</p>
          </div>
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
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Goals
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
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
