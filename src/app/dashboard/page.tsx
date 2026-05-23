"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { DailyPlanCard } from "@/components/dashboard/DailyPlanCard";
import { GapRecoveryModal } from "@/components/dashboard/GapRecoveryModal";
import { StreakBadge } from "@/components/dashboard/StreakBadge";
import { AITechSuggestions } from "@/components/dashboard/AITechSuggestions";

function getGreeting(name: string) {
  const h = new Date().getHours();
  const saudacao = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  return name ? `${saudacao}, ${name}` : saudacao;
}

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
  fallbackUsed?: boolean;
  gapDays?: number | null;
  gapResolved?: boolean;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const firstName = session?.user?.name?.split(" ")[0] ?? "";

  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [goalTitles, setGoalTitles] = useState<string[]>([]);

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
    fetch("/api/progress")
      .then((r) => r.json())
      .then((d) => setStreak(d?.streaks?.current ?? 0))
      .catch(() => {});
    fetch("/api/goals")
      .then((r) => r.json())
      .then((d: Array<{ title: string }>) => setGoalTitles(Array.isArray(d) ? d.map((g) => g.title) : []))
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

  async function handleGapResolve(choice: "recover" | "resume") {
    const res = await fetch("/api/plans/today/gap-resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choice }),
    });
    if (res.ok) {
      await fetchPlan();
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

  const showGapModal = plan && (plan.gapDays ?? 0) >= 2 && !plan.gapResolved;

  const todayLabel = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {showGapModal && (
        <GapRecoveryModal gapDays={plan!.gapDays!} onResolve={handleGapResolve} />
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <p className="font-display text-2xl font-bold tracking-tight text-foreground">
          {getGreeting(firstName)}
        </p>
        <StreakBadge currentStreak={streak} overdueReviewCount={overdueCount} />
      </div>
      <p className="text-xs text-muted-foreground capitalize mb-6">{todayLabel}</p>

      {/* Daily Plan */}
      {loading ? (
        <div className="rounded-xl border bg-muted animate-pulse h-48" />
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

      {/* AI Technique Suggestions */}
      <AITechSuggestions existingGoalTitles={goalTitles} />
    </div>
  );
}
