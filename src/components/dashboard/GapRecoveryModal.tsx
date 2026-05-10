"use client";

import { useState } from "react";
import { CalendarX, RefreshCw, SkipForward } from "lucide-react";

interface GapRecoveryModalProps {
  gapDays: number;
  onResolve: (choice: "recover" | "resume") => Promise<void>;
}

export function GapRecoveryModal({ gapDays, onResolve }: GapRecoveryModalProps) {
  const [loading, setLoading] = useState<"recover" | "resume" | null>(null);

  async function handle(choice: "recover" | "resume") {
    setLoading(choice);
    await onResolve(choice);
    setLoading(null);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border bg-card shadow-lg p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 rounded-full">
            <CalendarX className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <h2 className="font-semibold text-base">Você ficou {gapDays} {gapDays === 1 ? "dia" : "dias"} sem estudar</h2>
            <p className="text-xs text-muted-foreground mt-0.5">O que você prefere fazer com o conteúdo perdido?</p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => handle("recover")}
            disabled={!!loading}
            className="w-full flex items-start gap-3 rounded-lg border-2 border-blue-200 bg-blue-50 hover:border-blue-400 hover:bg-blue-100 px-4 py-3 text-left transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 text-blue-600 shrink-0 mt-0.5 ${loading === "recover" ? "animate-spin" : ""}`} />
            <div>
              <p className="text-sm font-medium text-blue-900">Recuperar conteúdo perdido</p>
              <p className="text-xs text-blue-700 mt-0.5">
                O conteúdo de hoje será distribuído nos próximos {gapDays} {gapDays === 1 ? "dia" : "dias"}, sem sobrecarregar sua agenda.
              </p>
            </div>
          </button>

          <button
            onClick={() => handle("resume")}
            disabled={!!loading}
            className="w-full flex items-start gap-3 rounded-lg border-2 border-gray-200 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 px-4 py-3 text-left transition-colors disabled:opacity-50"
          >
            <SkipForward className="h-5 w-5 text-gray-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Retomar com carga normal</p>
              <p className="text-xs text-gray-600 mt-0.5">Continuar de onde parou, sem compensar os dias perdidos.</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
