"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, AlertTriangle, Mail } from "lucide-react";

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

interface WeeklyReportCardProps {
  report: WeeklyReport;
}

export function WeeklyReportCard({ report }: WeeklyReportCardProps) {
  const [expanded, setExpanded] = useState(false);

  const fmt = (d: string) =>
    new Date(d + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

  const weekLabel = `${fmt(report.periodStart)} – ${fmt(report.periodEnd)}`;
  const insightPreview = report.aiInsight.length > 80
    ? report.aiInsight.slice(0, 80) + "…"
    : report.aiInsight;

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-accent/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{weekLabel}</span>
            <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
              {report.topicsCompleted} tópico{report.topicsCompleted !== 1 ? "s" : ""}
            </span>
          </div>
          {!expanded && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate italic">{insightPreview}</p>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t px-5 py-4 flex flex-col gap-4">
          {/* Metrics table */}
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {[
                ["Tópicos concluídos", String(report.topicsCompleted)],
                ["Horas de estudo", `${report.studyHours.toFixed(1)}h`],
                ["Sequência de dias", `${report.streakAtGeneration} dias`],
                ["Domínio principal", report.topDomain ?? "—"],
                ["Domínio a reforçar", report.weakestDomain ?? "—"],
              ].map(([label, value]) => (
                <tr key={label}>
                  <td className="py-2 text-muted-foreground">{label}</td>
                  <td className="py-2 font-medium text-right">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* AI Insight */}
          <div className="rounded-lg bg-muted/50 border p-3.5 flex items-start gap-2.5">
            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-primary mb-1">Insight da semana</p>
              <p className="text-sm italic leading-relaxed">"{report.aiInsight}"</p>
              {report.fallbackUsed && (
                <div className="mt-2 flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs text-amber-600 dark:text-amber-400">Gerado por fallback</span>
                </div>
              )}
            </div>
          </div>

          {/* Email delivery timestamp */}
          {report.emailSentAt && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              <span>
                E-mail enviado em{" "}
                {new Date(report.emailSentAt).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
