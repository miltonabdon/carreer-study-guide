"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { DailyPlanCard } from "@/components/dashboard/DailyPlanCard";
import { StreakBadge } from "@/components/dashboard/StreakBadge";

interface PlanTask {
  id: string;
  topicId: string;
  taskType: "new_learning" | "review";
  suggestedMinutes: number;
  orderIndex: number;
  status: "pending" | "completed" | "skipped";
  topicTitle: string;
  topicDescription: string | null;
  topicNextReviewAt: string | null;
  goalTitle: string;
}

interface DailyPlan {
  id: string;
  planDate: string;
  availableMinutes: number;
  aiRationale: string | null;
  completionPercent: number;
  tasks: PlanTask[];
}

export default function DashboardPage() {
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);

  async function fetchPlan() {
    const res = await fetch("/api/plans/today");
    if (res.ok) {
      const data = await res.json();
      setPlan(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchPlan();
    // Fetch streak from progress API when it's available
    fetch("/api/progress")
      .then((r) => r.json())
      .then((d) => setStreak(d?.streaks?.current ?? 0))
      .catch(() => {});
  }, []);

  async function handleTaskComplete(
    taskId: string,
    data: { status: "completed" | "skipped"; durationMinutes?: number; confidenceRating?: number; notes?: string }
  ) {
    const res = await fetch(`/api/plans/today/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      await fetchPlan();
    }
  }

  async function handleRegenerate(minutes: number) {
    const res = await fetch("/api/plans/today/regenerate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ availableMinutes: minutes }),
    });
    if (res.ok) {
      setPlan(await res.json());
    }
  }

  const overdueCount =
    plan?.tasks.filter(
      (t) =>
        t.taskType === "review" &&
        t.topicNextReviewAt &&
        new Date(t.topicNextReviewAt) < new Date() &&
        t.status === "pending"
    ).length ?? 0;

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your daily study guide</p>

        </div>
        <StreakBadge currentStreak={streak} overdueReviewCount={overdueCount} />
      </div>

      {/* Quick nav */}
      <div className="flex gap-3 mb-6">
        <Link
          href="/goals"
          className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
        >
          <Plus className="h-4 w-4" />
          Goals
        </Link>
        <Link
          href="/progress"
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
        >
          Progress
        </Link>
        <Link
          href="/coach"
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
        >
          AI Coach
        </Link>
      </div>

      {/* Daily Plan */}
      {loading ? (
        <div className="rounded-lg border bg-muted animate-pulse h-64" />
      ) : plan ? (
        <DailyPlanCard plan={plan} onTaskComplete={handleTaskComplete} onRegenerate={handleRegenerate} />
      ) : (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <p className="text-muted-foreground mb-4">Could not load today&apos;s plan.</p>
          <button
            onClick={fetchPlan}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
