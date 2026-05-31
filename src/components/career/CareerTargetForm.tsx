"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

interface CareerTargetFormProps {
  currentDescription?: string | null;
  onSaved: (newDescription: string) => void;
}

const MAX_CHARS = 1000;
const MIN_CHARS = 10;

export function CareerTargetForm({ currentDescription, onSaved }: CareerTargetFormProps) {
  const [value, setValue] = useState(currentDescription ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length < MIN_CHARS) {
      setError(`Mínimo de ${MIN_CHARS} caracteres`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/career/target", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: trimmed }),
      });
      if (res.ok) {
        onSaved(trimmed);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Erro ao salvar objetivo");
      }
    } catch {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  const hasTarget = !!currentDescription;
  const remaining = MAX_CHARS - value.length;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="career-target" className="text-sm font-medium">
          {hasTarget ? "Atualizar objetivo de carreira" : "Definir objetivo de carreira"}
        </label>
        <p className="text-xs text-muted-foreground">
          Descreva onde você quer chegar — cargo, área, nível de senioridade, tecnologias, contexto. Quanto mais específico, melhor será a análise de gaps.
        </p>
      </div>

      <div className="relative">
        <textarea
          id="career-target"
          value={value}
          onChange={(e) => {
            if (e.target.value.length <= MAX_CHARS) setValue(e.target.value);
          }}
          rows={5}
          placeholder="Ex: Quero me tornar um Arquiteto de IA Sênior, especializado em sistemas agentic com LangGraph, RAG avançado e LLMOps, atuando em empresas de tecnologia B2B..."
          className="w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
        <span className={`absolute bottom-2 right-3 text-xs ${remaining < 50 ? "text-warning" : "text-muted-foreground"}`}>
          {remaining}
        </span>
      </div>

      {error && <p className="text-xs text-destructive font-medium">{error}</p>}

      <button
        type="submit"
        disabled={saving || value.trim().length < MIN_CHARS}
        className="self-start flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-40"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {hasTarget ? "Atualizar" : "Salvar objetivo"}
      </button>
    </form>
  );
}
