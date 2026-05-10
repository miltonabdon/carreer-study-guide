"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AIGenerationProgress } from "@/components/ui/AIGenerationProgress";

export default function OnboardingPage() {
  const router = useRouter();
  const { update } = useSession();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [targetDate, setTargetDate] = useState("");
  const [dailyMinutes, setDailyMinutes] = useState(60);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          priority,
          targetDate: targetDate || undefined,
          dailyMinutes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      await update({ onboardingCompleted: true });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-8">
        <div className="py-4 flex flex-col items-center">
          {/* Animated icon */}
          <div className="relative mb-7">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200/60">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-green-400" />
            </span>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-1 text-center">
            Criando sua trilha de aprendizado
          </h2>
          <p className="text-sm text-gray-500 text-center mb-8 max-w-xs">
            A IA está estruturando um plano personalizado para{" "}
            <span className="font-medium text-gray-700">&ldquo;{title}&rdquo;</span>
          </p>

          <div className="w-full">
            <AIGenerationProgress />
          </div>

          <p className="text-xs text-gray-400 text-center mt-6">
            Isso pode levar até 30 segundos — não feche esta janela
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm text-gray-400">Passo {step} de 2</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full">
          <div
            className="h-1.5 bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: step === 1 ? "50%" : "100%" }}
          />
        </div>
      </div>

      {step === 1 && (
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Qual seu objetivo de aprendizado?</h1>
          <p className="text-gray-500 mb-6 text-sm">Descreva o que você quer aprender. A IA vai criar um caminho estruturado para você.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título do objetivo *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Dominar Agentic AI com LangGraph"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="O que você quer aprender? Qual seu nível atual? O que espera alcançar?"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
          <button
            onClick={() => setStep(2)}
            disabled={!title.trim() || !description.trim()}
            className="mt-6 w-full bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Próximo
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Configure seu plano</h1>
          <p className="text-gray-500 mb-6 text-sm">Ajuste as preferências para personalizar seu plano diário.</p>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as "high" | "medium" | "low")}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="high">Alta — foco máximo</option>
                <option value="medium">Média — ritmo constante</option>
                <option value="low">Baixa — quando possível</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data alvo (opcional)</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tempo disponível por dia: <span className="font-bold text-blue-600">{dailyMinutes} min</span>
              </label>
              <input
                type="range"
                min={15}
                max={180}
                step={15}
                value={dailyMinutes}
                onChange={(e) => setDailyMinutes(Number(e.target.value))}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>15 min</span>
                <span>180 min</span>
              </div>
            </div>
          </div>
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
              <button onClick={handleSubmit} className="ml-2 underline font-medium">Tentar novamente</button>
            </div>
          )}
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setStep(1)}
              disabled={loading}
              className="flex-1 border border-gray-300 text-gray-700 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              Voltar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              Começar a aprender
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
