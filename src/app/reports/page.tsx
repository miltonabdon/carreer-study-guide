"use client";

import { useState, useEffect } from "react";
import { Loader2, CalendarClock } from "lucide-react";
import { WeeklyReportCard } from "@/components/reports/WeeklyReportCard";

interface WeeklyReport {
  id: string;
  weekId: string;
  periodStart: string;
  periodEnd: string;
  topicsCompleted: number;
  studyHours: number;
  streakAtGeneration: number;
  topDomain: string | null;
  weakestDomain: string | null;
  aiInsight: string;
  fallbackUsed: boolean;
  emailSentAt: string | null;
  generatedAt: string;
}

export default function ReportsPage() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/reports/weekly");
        if (res.ok) {
          const data = await res.json();
          setReports(data.reports ?? []);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Relatórios Semanais</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Acompanhe sua evolução semana a semana com insights gerados por IA.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 flex flex-col items-center gap-3 text-center">
          <CalendarClock className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm font-medium">Nenhum relatório ainda</p>
          <p className="text-xs text-muted-foreground max-w-xs">
            Seu primeiro relatório semanal será gerado na próxima segunda-feira, desde que você tenha estudado ao menos um tópico na semana.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {reports.map((report) => (
            <WeeklyReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}
