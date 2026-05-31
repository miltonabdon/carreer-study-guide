"use client";

import { useState, useEffect } from "react";
import { Loader2, Badge, Calendar } from "lucide-react";

interface CareerTarget {
  id: string;
  description: string;
  createdAt: string;
}

export default function CareerHistoryPage() {
  const [history, setHistory] = useState<CareerTarget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/career/target");
        if (res.ok) {
          const data = await res.json();
          setHistory(data.history ?? []);
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
        <a href="/career" className="text-xs text-muted-foreground hover:text-foreground mb-3 block">
          ← Voltar para Evolução de Carreira
        </a>
        <h1 className="text-2xl font-bold">Histórico de Objetivos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Acompanhe como sua visão de carreira evoluiu ao longo do tempo.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : history.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">Nenhum objetivo de carreira definido ainda.</p>
        </div>
      ) : (
        <ol className="relative border-l border-border ml-3 flex flex-col gap-0">
          {history.map((target, i) => (
            <li key={target.id} className="mb-6 ml-6">
              <span className="absolute -left-2 flex h-4 w-4 items-center justify-center rounded-full border bg-background ring-4 ring-background">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              <div className="rounded-lg border bg-card p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(target.createdAt).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                  {i === 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
                      Versão atual
                    </span>
                  )}
                </div>
                <p className="text-sm leading-relaxed">{target.description}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
