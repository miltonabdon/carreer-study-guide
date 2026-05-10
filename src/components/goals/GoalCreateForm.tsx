"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, AlertTriangle } from "lucide-react";
import { AIGenerationProgress } from "@/components/ui/AIGenerationProgress";

interface GoalCreateFormProps {
  onClose: () => void;
}

export function GoalCreateForm({ onClose }: GoalCreateFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fallbackUsed, setFallbackUsed] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFallbackUsed(false);

    const form = new FormData(e.currentTarget);
    const targetDate = form.get("targetDate") as string;

    const res = await fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description"),
        priority: form.get("priority"),
        targetDate: targetDate || undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to create goal");
      setLoading(false);
      return;
    }

    const data = await res.json().catch(() => ({}));
    if (data?.path?.fallbackUsed) {
      setFallbackUsed(true);
      setLoading(false);
      setTimeout(() => { router.refresh(); onClose(); }, 2500);
      return;
    }

    router.refresh();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg border bg-card p-6 shadow-lg">

        {/* Loading overlay */}
        {loading && (
          <div className="py-4 flex flex-col items-center">
            <div className="relative mb-6">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200/60">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-400" />
              </span>
            </div>

            <h3 className="text-lg font-semibold text-card-foreground mb-1 text-center">
              Gerando trilha de aprendizado
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-7 max-w-xs">
              A IA está criando um caminho personalizado com base no seu objetivo
            </p>

            <div className="w-full">
              <AIGenerationProgress />
            </div>

            <p className="text-xs text-muted-foreground/60 text-center mt-5">
              Isso pode levar até 30 segundos
            </p>
          </div>
        )}

        {!loading && (
        <>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">New Learning Goal</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1">
              Goal title
            </label>
            <input
              id="title"
              name="title"
              type="text"
              required
              placeholder="e.g. Master RAG and vector databases"
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              required
              rows={3}
              placeholder="What do you want to learn and why? The more context, the better the AI-generated path."
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="priority" className="block text-sm font-medium mb-1">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                defaultValue="medium"
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div className="flex-1">
              <label htmlFor="targetDate" className="block text-sm font-medium mb-1">
                Target date (optional)
              </label>
              <input
                id="targetDate"
                name="targetDate"
                type="date"
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {fallbackUsed && (
            <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <p className="text-xs text-amber-700">IA indisponível — caminho de aprendizado padrão gerado</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Create goal
            </button>
          </div>
        </form>
        </>
        )}
      </div>
    </div>
  );
}
