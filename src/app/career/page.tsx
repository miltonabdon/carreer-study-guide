"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, RefreshCw, AlertTriangle, Target } from "lucide-react";
import { CareerTargetForm } from "@/components/career/CareerTargetForm";
import { GapReportCard } from "@/components/career/GapReportCard";

interface CareerTarget {
  id: string;
  description: string;
  createdAt: string;
}

interface SkillGapReport {
  id: string;
  generatedAt: string;
  careerTargetSnapshot: string;
  coveredSkills: string[];
  missingSkills: string[];
  suggestedGoals: Array<{ title: string; rationale: string }>;
}

interface GapAnalysisData {
  reports: SkillGapReport[];
  stalePrompt: boolean;
  currentTopicsCount: number;
}

const EXAMPLE_TARGETS = [
  "Arquiteto de IA Sênior especializado em sistemas agentic e LLMOps para empresas B2B",
  "Tech Lead de plataforma de dados com foco em ML em produção e observabilidade",
  "Staff Engineer com expertise em arquitetura de microsserviços e cloud-native no contexto de IA generativa",
];

export default function CareerPage() {
  const [currentTarget, setCurrentTarget] = useState<CareerTarget | null>(null);
  const [gapData, setGapData] = useState<GapAnalysisData | null>(null);
  const [loadingTarget, setLoadingTarget] = useState(true);
  const [loadingGap, setLoadingGap] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const loadTarget = useCallback(async () => {
    setLoadingTarget(true);
    try {
      const res = await fetch("/api/career/target");
      if (res.ok) {
        const data = await res.json();
        setCurrentTarget(data.current);
      }
    } finally {
      setLoadingTarget(false);
    }
  }, []);

  const loadGapData = useCallback(async () => {
    setLoadingGap(true);
    try {
      const res = await fetch("/api/career/gap-analysis");
      if (res.ok) {
        setGapData(await res.json());
      }
    } finally {
      setLoadingGap(false);
    }
  }, []);

  useEffect(() => {
    loadTarget();
    loadGapData();
  }, [loadTarget, loadGapData]);

  async function handleAnalyze() {
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const res = await fetch("/api/career/gap-analysis", { method: "POST" });
      if (res.ok) {
        await loadGapData();
      } else {
        const data = await res.json().catch(() => ({}));
        setAnalyzeError(data.error ?? "Erro ao gerar análise");
      }
    } catch {
      setAnalyzeError("Erro de rede. Tente novamente.");
    } finally {
      setAnalyzing(false);
    }
  }

  function handleTargetSaved(desc: string) {
    setCurrentTarget((prev) =>
      prev ? { ...prev, description: desc } : { id: "", description: desc, createdAt: new Date().toISOString() }
    );
    loadTarget();
  }

  const latestReport = gapData?.reports[0] ?? null;

  if (loadingTarget) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Evolução de Carreira</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Defina seu objetivo e descubra os gaps entre onde você está e onde quer chegar.
        </p>
      </div>

      {/* Career target form */}
      <section className="rounded-xl border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">Objetivo de Carreira</h2>
        </div>

        {!currentTarget && (
          <div className="mb-4 rounded-lg bg-muted/50 border border-dashed p-4">
            <p className="text-xs text-muted-foreground font-medium mb-2">Exemplos de objetivos:</p>
            <ul className="flex flex-col gap-1">
              {EXAMPLE_TARGETS.map((t, i) => (
                <li
                  key={i}
                  className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  onClick={() => {}}
                >
                  → {t}
                </li>
              ))}
            </ul>
          </div>
        )}

        <CareerTargetForm
          currentDescription={currentTarget?.description}
          onSaved={handleTargetSaved}
        />
      </section>

      {/* Stale prompt banner */}
      {gapData?.stalePrompt && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            Seu perfil evoluiu — você concluiu {gapData.currentTopicsCount} tópicos. Considere atualizar a análise de gaps.
          </p>
        </div>
      )}

      {/* Analyze button */}
      {currentTarget && (
        <div className="flex flex-col gap-2">
          <button
            onClick={handleAnalyze}
            disabled={analyzing || loadingGap}
            className="self-start flex items-center gap-2 rounded-lg border-2 border-primary bg-primary/5 hover:bg-primary/10 text-primary px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {analyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            {analyzing ? "Analisando…" : "Analisar Gaps de Carreira"}
          </button>
          {analyzeError && <p className="text-xs text-destructive">{analyzeError}</p>}
        </div>
      )}

      {/* Latest report */}
      {loadingGap ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : latestReport ? (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Análise mais recente</h2>
            {gapData && gapData.reports.length > 1 && (
              <a href="/career/history" className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline">
                Ver histórico ({gapData.reports.length} análises)
              </a>
            )}
          </div>
          <GapReportCard
            reportId={latestReport.id}
            generatedAt={latestReport.generatedAt}
            careerTargetSnapshot={latestReport.careerTargetSnapshot}
            coveredSkills={latestReport.coveredSkills}
            missingSkills={latestReport.missingSkills}
            suggestedGoals={latestReport.suggestedGoals}
          />
        </section>
      ) : currentTarget ? (
        <div className="rounded-lg border border-dashed p-8 flex flex-col items-center gap-2 text-center">
          <RefreshCw className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Nenhuma análise ainda</p>
          <p className="text-xs text-muted-foreground">
            Clique em "Analisar Gaps de Carreira" para gerar sua primeira análise.
          </p>
        </div>
      ) : null}
    </div>
  );
}
