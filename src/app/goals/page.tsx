"use client";

import { useEffect, useState } from "react";
import { Plus, BookOpen } from "lucide-react";
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

  async function handleStatusChange(goalId: string, status: "active" | "paused") {
    const res = await fetch(`/api/goals/${goalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) fetchGoals();
  }

  useEffect(() => {
    fetchGoals();
  }, []);

  const active = goals.filter((g) => g.status === "active");
  const paused = goals.filter((g) => g.status === "paused");

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-1">
            Seus objetivos
          </p>
          <h1 className="font-display text-3xl font-bold tracking-tight">Metas de Aprendizado</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> Nova meta
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 rounded-xl border bg-muted animate-pulse" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="py-20 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <BookOpen className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-display font-semibold text-foreground">Nenhuma meta ainda</p>
            <p className="text-sm text-muted-foreground mt-1">
              Defina o que quer aprender e a IA vai criar um caminho estruturado.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-xl px-4 py-2.5 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" /> Criar primeira meta
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                  Ativas
                </span>
                <div className="flex-1 h-px bg-border/60" />
              </div>
              <div className="space-y-3">
                {active.map((goal, index) => (
                  <div key={goal.id} className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both" style={{ animationDelay: `${index * 60}ms`, animationDuration: '260ms' }}>
                    <GoalCard goal={goal} onStatusChange={handleStatusChange} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {paused.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
                  Pausadas
                </span>
                <div className="flex-1 h-px bg-border/60" />
              </div>
              <div className="space-y-3">
                {paused.map((goal, index) => (
                  <div key={goal.id} className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both" style={{ animationDelay: `${index * 60}ms`, animationDuration: '260ms' }}>
                    <GoalCard goal={goal} onStatusChange={handleStatusChange} />
                  </div>
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
