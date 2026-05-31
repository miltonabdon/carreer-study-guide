"use client";

import { useState } from "react";
import { Plus, Check, Loader2 } from "lucide-react";

interface SuggestedGoalItemProps {
  reportId: string;
  goalIndex: number;
  title: string;
  rationale: string;
}

export function SuggestedGoalItem({ reportId, goalIndex, title, rationale }: SuggestedGoalItemProps) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleCreate() {
    setState("loading");
    try {
      const res = await fetch(`/api/career/gap-analysis/${reportId}/create-goal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalIndex }),
      });
      if (res.ok) {
        setState("done");
      } else {
        setState("error");
      }
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border bg-card p-3.5">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{rationale}</p>
        {state === "error" && (
          <p className="text-xs text-destructive mt-1">Erro ao criar meta. Tente novamente.</p>
        )}
      </div>
      <button
        onClick={handleCreate}
        disabled={state !== "idle"}
        title="Adicionar Meta"
        className="shrink-0 flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 hover:bg-accent"
      >
        {state === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {state === "done" && <Check className="h-3.5 w-3.5 text-green-500" />}
        {state === "idle" && <Plus className="h-3.5 w-3.5" />}
        {state === "done" ? "Adicionado" : "Adicionar Meta"}
      </button>
    </div>
  );
}
