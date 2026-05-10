"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { GoalCard } from "@/components/goals/GoalCard";
import { GoalCreateForm } from "@/components/goals/GoalCreateForm";

interface Goal {
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
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  async function fetchGoals() {
    const res = await fetch("/api/goals");
    if (res.ok) {
      const data = await res.json();
      setGoals(data);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchGoals();
  }, []);

  const active = goals.filter((g) => g.status === "active");
  const paused = goals.filter((g) => g.status === "paused");

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Learning Goals</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {active.length} active {active.length === 1 ? "goal" : "goals"}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Goal
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-lg border bg-muted animate-pulse" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-20 text-center">
          <p className="text-muted-foreground mb-4">No learning goals yet</p>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create your first goal
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Active
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {active.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} />
                ))}
              </div>
            </section>
          )}

          {paused.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Paused
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {paused.map((goal) => (
                  <GoalCard key={goal.id} goal={goal} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {showCreate && (
        <GoalCreateForm
          onClose={() => {
            setShowCreate(false);
            fetchGoals();
          }}
        />
      )}
    </div>
  );
}
