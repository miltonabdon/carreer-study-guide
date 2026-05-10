"use client";

import { useState, useEffect } from "react";
import { Sparkles, Plus, ChevronRight, Brain } from "lucide-react";

interface Technique {
  id: string;
  title: string;
  description: string;
  tag: string;
  difficulty: "Intermediário" | "Avançado" | "Expert";
  whyNow: string;
}

const ALL_TECHNIQUES: Technique[] = [
  {
    id: "multi-agent",
    title: "Multi-Agent Orchestration",
    description: "Construa sistemas com múltiplos agentes colaborativos usando AutoGen ou CrewAI para resolver tarefas complexas com divisão de papéis.",
    tag: "Agentic AI",
    difficulty: "Avançado",
    whyNow: "Base essencial para sistemas autônomos de nível produção.",
  },
  {
    id: "graph-rag",
    title: "Graph RAG",
    description: "Combine grafos de conhecimento com RAG para recuperação contextual estruturada. Supera RAG clássico em domínios com relações complexas.",
    tag: "RAG Avançado",
    difficulty: "Avançado",
    whyNow: "Diferencial competitivo em arquiteturas de LLM enterprise.",
  },
  {
    id: "lora-finetuning",
    title: "Fine-tuning com LoRA",
    description: "Adapte LLMs para domínios específicos com Low-Rank Adaptation. Custo de treinamento drasticamente reduzido versus full fine-tuning.",
    tag: "LLM Training",
    difficulty: "Expert",
    whyNow: "Habilidade crítica para soluções verticalizadas de IA.",
  },
  {
    id: "ai-evals",
    title: "AI Evals & Observabilidade",
    description: "Frameworks de avaliação sistemática de LLMs: métricas de qualidade, rastreamento de prompts, detecção de alucinações e monitoramento em produção.",
    tag: "MLOps",
    difficulty: "Avançado",
    whyNow: "Impossível entregar IA confiável sem avaliação rigorosa.",
  },
  {
    id: "moe",
    title: "Mixture of Experts (MoE)",
    description: "Arquitetura por trás dos modelos mais eficientes (GPT-4, Mixtral). Entenda roteamento de especialistas, sparse activation e implicações de escala.",
    tag: "Arquitetura LLM",
    difficulty: "Expert",
    whyNow: "Fundamento para entender e arquitetar modelos de próxima geração.",
  },
  {
    id: "cot-tot-react",
    title: "Prompt Engineering Avançado",
    description: "Chain-of-Thought, Tree-of-Thought e ReAct patterns. Técnicas para raciocínio multi-step, decomposição de problemas e planejamento com LLMs.",
    tag: "Prompt Design",
    difficulty: "Intermediário",
    whyNow: "Maximiza output de qualquer LLM sem custo adicional.",
  },
  {
    id: "ai-safety",
    title: "AI Safety & Red Teaming",
    description: "Técnicas de adversarial testing, jailbreak detection, prompt injection defense e avaliação de risco em sistemas de IA generativa.",
    tag: "AI Security",
    difficulty: "Avançado",
    whyNow: "Requisito crescente em deployments enterprise e regulatórios.",
  },
  {
    id: "semantic-kernel",
    title: "Semantic Kernel",
    description: "SDK da Microsoft para orquestração de LLMs com plugins, planners e memória. Integração nativa com Azure OpenAI e suporte a .NET/Python.",
    tag: "Agentic Frameworks",
    difficulty: "Intermediário",
    whyNow: "Adoção acelerada em enterprises com stack Microsoft.",
  },
  {
    id: "function-calling",
    title: "Function Calling Avançado",
    description: "Structured outputs, parallel tool calls, error recovery e design de ferramentas para agentes. Padrões para sistemas tool-augmented confiáveis.",
    tag: "LLM APIs",
    difficulty: "Intermediário",
    whyNow: "Fundamental para qualquer sistema agentic de produção.",
  },
  {
    id: "synthetic-data",
    title: "Geração de Dados Sintéticos",
    description: "Use LLMs para gerar datasets de treinamento, benchmarks customizados e dados de avaliação. Pipelines com filtragem e validação automática.",
    tag: "Data Engineering",
    difficulty: "Avançado",
    whyNow: "Soluciona a escassez de dados rotulados em domínios específicos.",
  },
];

const DIFFICULTY_COLOR: Record<Technique["difficulty"], string> = {
  Intermediário: "bg-blue-50 text-blue-700 border-blue-200",
  Avançado: "bg-amber-50 text-amber-700 border-amber-200",
  Expert: "bg-red-50 text-red-700 border-red-200",
};

interface Props {
  existingGoalTitles?: string[];
}

function getDailySlice(seed: string): Technique[] {
  // Deterministic daily rotation based on date
  const dayIndex = Math.floor(
    new Date().getTime() / (1000 * 60 * 60 * 24)
  );
  const offset = (dayIndex + seed.charCodeAt(0)) % ALL_TECHNIQUES.length;
  const ordered = [
    ...ALL_TECHNIQUES.slice(offset),
    ...ALL_TECHNIQUES.slice(0, offset),
  ];
  return ordered.slice(0, 3);
}

export function AITechSuggestions({ existingGoalTitles = [] }: Props) {
  const [suggestions, setSuggestions] = useState<Technique[]>([]);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    const slice = getDailySlice("ai-tech");
    // Filter out techniques whose title overlaps with existing goals
    const filtered = slice.filter(
      (t) =>
        !existingGoalTitles.some((g) =>
          g.toLowerCase().includes(t.id.replace(/-/g, " ")) ||
          t.id.toLowerCase().includes(g.toLowerCase().split(" ")[0])
        )
    );
    setSuggestions(filtered.length >= 2 ? filtered : slice);
  }, [existingGoalTitles]);

  async function handleAdd(technique: Technique) {
    setCreating(technique.id);
    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: technique.title,
          description: `${technique.description} ${technique.whyNow}`,
          priority: "medium",
        }),
      });
      if (res.ok) {
        setAdded((prev) => new Set(Array.from(prev).concat(technique.id)));
      }
    } catch {
      // silently ignore
    } finally {
      setCreating(null);
    }
  }

  if (suggestions.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <h2 className="text-sm font-semibold text-gray-900">Sugestões para você</h2>
        <span className="text-xs text-gray-400 ml-auto flex items-center gap-0.5">
          <Brain className="w-3 h-3" /> baseado no seu perfil
        </span>
      </div>

      <div className="space-y-2.5">
        {suggestions.map((tech) => {
          const isAdded = added.has(tech.id);
          const isCreating = creating === tech.id;

          return (
            <div
              key={tech.id}
              className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-gray-900">{tech.title}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${DIFFICULTY_COLOR[tech.difficulty]}`}>
                      {tech.difficulty}
                    </span>
                    <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded-full border border-gray-100">
                      {tech.tag}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{tech.description}</p>
                  <p className="text-xs text-indigo-600 mt-1.5 flex items-center gap-1">
                    <ChevronRight className="w-3 h-3 shrink-0" />
                    {tech.whyNow}
                  </p>
                </div>

                <button
                  onClick={() => handleAdd(tech)}
                  disabled={isAdded || isCreating}
                  className={`shrink-0 flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                    isAdded
                      ? "bg-green-50 text-green-700 border border-green-200 cursor-default"
                      : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
                  }`}
                >
                  {isCreating ? (
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Criando...
                    </span>
                  ) : isAdded ? (
                    "Adicionado ✓"
                  ) : (
                    <>
                      <Plus className="w-3 h-3" />
                      Adicionar meta
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
