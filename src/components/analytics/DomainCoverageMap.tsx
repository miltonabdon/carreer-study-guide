"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";

interface DomainData {
  domain: string;
  completedTopics: number;
  totalTopics: number;
  avgConfidence: number | null;
  isGap: boolean;
}

interface DomainCoverageMapProps {
  data: DomainData[];
}

function ConfidenceStars({ value }: { value: number | null }) {
  if (!value) return <span className="text-xs text-muted-foreground">—</span>;
  const full = Math.round(value);
  return (
    <span className="text-xs">
      {"★".repeat(full)}{"☆".repeat(5 - full)}
    </span>
  );
}

export function DomainCoverageMap({ data }: DomainCoverageMapProps) {
  const [tooltip, setTooltip] = useState<string | null>(null);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">Nenhum domínio identificado ainda</p>
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => b.completedTopics - a.completedTopics);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {sorted.map((d) => (
        <div
          key={d.domain}
          onMouseEnter={() => setTooltip(d.domain)}
          onMouseLeave={() => setTooltip(null)}
          className={`relative rounded-lg border p-3 cursor-default transition-colors ${
            d.isGap
              ? "border-dashed bg-muted/30 opacity-75"
              : "bg-card hover:bg-accent/50"
          }`}
        >
          {d.isGap && (
            <span className="absolute top-2 right-2">
              <AlertCircle className="h-3 w-3 text-muted-foreground" />
            </span>
          )}
          <p className="text-xs font-medium leading-tight line-clamp-2 pr-4">{d.domain}</p>
          <p className="text-lg font-bold mt-1">{d.completedTopics}</p>
          <p className="text-xs text-muted-foreground">de {d.totalTopics} tópico{d.totalTopics !== 1 ? "s" : ""}</p>
          <div className="mt-1">
            <ConfidenceStars value={d.avgConfidence} />
          </div>
          {d.isGap && (
            <span className="mt-1.5 inline-block rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
              gap
            </span>
          )}

          {tooltip === d.domain && (
            <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-lg border bg-card p-2 shadow-lg text-xs">
              <p className="font-semibold mb-1">{d.domain}</p>
              <p>{d.completedTopics} concluídos / {d.totalTopics} total</p>
              {d.avgConfidence && <p>Confiança média: {d.avgConfidence.toFixed(1)}/5</p>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
