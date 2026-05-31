"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Info, TrendingUp, ShieldCheck, ShieldAlert } from "lucide-react";
import { WeeklyVelocityChart } from "@/components/analytics/WeeklyVelocityChart";
import { DomainCoverageMap } from "@/components/analytics/DomainCoverageMap";
import { ConfidenceTrendChart } from "@/components/analytics/ConfidenceTrendChart";

interface Goal {
  id: string;
  title: string;
}

interface AnalyticsData {
  weeklyVelocity: Array<{ weekLabel: string; topicsCompleted: number; studyHours: number }>;
  domainCoverage: Array<{ domain: string; completedTopics: number; totalTopics: number; avgConfidence: number | null; isGap: boolean }>;
  confidenceTrends: Array<{ goalId: string; goalTitle: string; weekLabel: string; avgConfidence: number }>;
  projectedCompletion: Array<{
    goalId: string;
    goalTitle: string;
    targetDate: string | null;
    totalTopics: number;
    completedTopics: number;
    remainingMinutes: number;
  }>;
  retentionHealth: { strong: number; weak: number; total: number; strongPercent: number };
  domainInferenceInProgress: boolean;
}

export default function AnalyticsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/goals")
      .then((r) => r.json())
      .then((g: Goal[]) => setGoals(Array.isArray(g) ? g : []))
      .catch(() => {});
  }, []);

  const loadAnalytics = useCallback(async (goalId: string) => {
    setLoading(true);
    try {
      const url = goalId ? `/api/analytics?goalId=${goalId}` : "/api/analytics";
      const res = await fetch(url);
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics(selectedGoalId);
  }, [selectedGoalId, loadAnalytics]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visualize sua evolução, cobertura de domínios e tendências de confiança.
          </p>
        </div>

        {goals.length > 0 && (
          <select
            value={selectedGoalId}
            onChange={(e) => setSelectedGoalId(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todas as metas</option>
            {goals.map((g) => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>
        )}
      </div>

      {data?.domainInferenceInProgress && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-4 py-3">
          <Info className="h-4 w-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Classificação de domínios em andamento — os dados ficarão completos em breve.
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <>
          {/* Weekly velocity */}
          <section className="rounded-xl border bg-card p-5">
            <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Velocidade Semanal
            </h2>
            <WeeklyVelocityChart data={data.weeklyVelocity} />
          </section>

          {/* Domain + Confidence side by side */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <section className="rounded-xl border bg-card p-5">
              <h2 className="text-sm font-semibold mb-4">Cobertura de Domínios</h2>
              <DomainCoverageMap data={data.domainCoverage} />
            </section>

            <section className="rounded-xl border bg-card p-5">
              <h2 className="text-sm font-semibold mb-4">Tendência de Confiança</h2>
              <ConfidenceTrendChart data={data.confidenceTrends} />
            </section>
          </div>

          {/* Retention health */}
          <section className="rounded-xl border bg-card p-5">
            <h2 className="text-sm font-semibold mb-3">Saúde de Retenção</h2>
            {data.retentionHealth.total === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma sessão registrada</p>
            ) : (
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-green-500" />
                  <span className="text-sm">
                    <strong className="text-green-600 dark:text-green-400">{data.retentionHealth.strongPercent}%</strong>{" "}
                    <span className="text-muted-foreground">alta confiança</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  <span className="text-sm">
                    <strong className="text-amber-600 dark:text-amber-400">{data.retentionHealth.weak}</strong>{" "}
                    <span className="text-muted-foreground">sessões com baixa confiança</span>
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {data.retentionHealth.total} sessões analisadas
                </span>
              </div>
            )}
          </section>

          {/* Projected completion */}
          {data.projectedCompletion.length > 0 && (
            <section className="rounded-xl border bg-card overflow-hidden">
              <div className="px-5 py-4 border-b">
                <h2 className="text-sm font-semibold">Previsão de Conclusão</h2>
              </div>
              <div className="divide-y">
                {data.projectedCompletion.map((g) => {
                  const pct = g.totalTopics > 0 ? Math.round((g.completedTopics / g.totalTopics) * 100) : 0;
                  return (
                    <div key={g.goalId} className="px-5 py-3 flex items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{g.goalTitle}</p>
                        <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold">{pct}%</p>
                        <p className="text-xs text-muted-foreground">
                          {g.completedTopics}/{g.totalTopics} tópicos
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">Erro ao carregar analytics. Tente novamente.</p>
        </div>
      )}
    </div>
  );
}
