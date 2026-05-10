"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Clock, BookOpen, Trophy } from "lucide-react";
import { PathTimeline } from "@/components/goals/PathTimeline";

interface Topic {
  id: string;
  title: string;
  description: string | null;
  orderIndex: number;
  complexity: number;
  estimatedMinutes: number;
  status: "locked" | "unlocked" | "in_progress" | "complete" | "skipped" | "known";
  resourceUrl: string | null;
  notes: string | null;
  nextReviewAt: string | null;
}

interface PathData {
  goal: {
    id: string;
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
  };
  path: {
    id: string;
    totalEstimatedMinutes: number;
    completionWeeksEstimate: number | null;
    completionPercent: number;
    totalTopics: number;
    completedTopics: number;
  };
  topics: Topic[];
}

export default function PathPage({ params }: { params: { goalId: string } }) {
  const { goalId } = params;
  const router = useRouter();
  const [data, setData] = useState<PathData | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);

  const fetchPath = useCallback(async () => {
    const res = await fetch(`/api/goals/${goalId}/path`);
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    if (res.ok) {
      setData(await res.json());
    }
    setLoading(false);
  }, [goalId, router]);

  useEffect(() => {
    fetchPath();
  }, [fetchPath]);

  async function handleTopicUpdate(
    topicId: string,
    updates: Partial<Pick<Topic, "status" | "resourceUrl" | "notes">>
  ) {
    const res = await fetch(`/api/topics/${topicId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const updated = await res.json();
      setData((prev) =>
        prev
          ? {
              ...prev,
              topics: prev.topics.map((t) => (t.id === topicId ? { ...t, ...updated } : t)),
            }
          : prev
      );
    }
  }

  async function handleRegenerate() {
    if (!confirm("Regenerate the learning path? Completed topics will be preserved.")) return;
    setRegenerating(true);
    const res = await fetch(`/api/goals/${goalId}/path/regenerate`, { method: "POST" });
    if (res.ok) {
      await fetchPath();
    }
    setRegenerating(false);
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="h-8 w-48 rounded bg-muted animate-pulse mb-6" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-lg border bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center">
        <p className="text-muted-foreground">Learning path not found.</p>
        <Link href="/goals" className="text-primary hover:underline text-sm mt-2 inline-block">
          Back to goals
        </Link>
      </div>
    );
  }

  const totalHours = Math.round(data.path.totalEstimatedMinutes / 60);
  const topicsLeft = data.path.totalTopics - data.path.completedTopics;
  const pct = data.path.completionPercent;

  function motivationalPhrase(): string {
    if (pct === 0) return "Pronto para começar sua jornada!";
    if (pct < 25) return "Ótimo começo — mantenha o ritmo 💪";
    if (pct < 50) return "Construindo bases sólidas. Continue assim!";
    if (pct < 75) return "Metade do caminho! Progresso excelente 🔥";
    if (pct < 100) return "Quase lá! Reta final 🚀";
    return "Trilha completa! Trabalho incrível 🏆";
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <Link
          href="/goals"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Goals
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{data.goal.title}</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-prose">{data.goal.description}</p>
          </div>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${regenerating ? "animate-spin" : ""}`} />
            Regenerate
          </button>
        </div>

        <div className="flex gap-6 mt-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" />
            {data.path.completedTopics} / {data.path.totalTopics} topics complete
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />~{totalHours}h total
            {data.path.completionWeeksEstimate
              ? ` · ~${data.path.completionWeeksEstimate} weeks`
              : ""}
          </span>
        </div>

        <div className="mt-4">
          {/* Frase motivacional e percentual */}
          <div className="flex justify-between items-end mb-1.5">
            <span className="text-xs font-medium text-muted-foreground">{motivationalPhrase()}</span>
            <span className="text-xs font-bold tabular-nums">{pct}%</span>
          </div>

          {/* Barra com marcos */}
          <div className="relative">
            <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background:
                    pct === 100
                      ? "#22c55e"
                      : `linear-gradient(to right, hsl(var(--primary)), hsl(var(--primary) / 0.6))`,
                }}
              />
            </div>
            {/* Marcos em 25%, 50%, 75% */}
            {[25, 50, 75].map((mark) => (
              <div
                key={mark}
                className={`absolute top-0 h-3 w-px ${pct >= mark ? "bg-white/50" : "bg-muted-foreground/20"}`}
                style={{ left: `${mark}%` }}
              />
            ))}
          </div>

          {/* Contagem restante ou celebração */}
          {pct === 100 ? (
            <div className="flex items-center gap-1.5 mt-2 text-green-700">
              <Trophy className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">Trilha concluída!</span>
            </div>
          ) : topicsLeft > 0 ? (
            <p className="text-xs text-muted-foreground mt-1.5">
              {topicsLeft} tópico{topicsLeft !== 1 ? "s" : ""} restante{topicsLeft !== 1 ? "s" : ""}
            </p>
          ) : null}
        </div>
      </div>

      <PathTimeline topics={data.topics} onTopicUpdate={handleTopicUpdate} onTopicComplete={fetchPath} />
    </div>
  );
}
