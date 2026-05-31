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
  order: number;
  group: "Fundamentos" | "RAG" | "Agentic" | "Treinamento" | "Produção";
}

// 25 técnicas em 5 trilhas ordenadas de fundacional → expert
const ALL_TECHNIQUES: Technique[] = [
  // ── Trilha 1: Fundamentos ─────────────────────────────────
  {
    id: "embeddings-vector-db",
    title: "Embeddings & Bancos Vetoriais",
    description:
      "Representações semânticas densas de texto, imagem e código. pgvector, Pinecone e Weaviate: indexação ANN, filtros de metadados e cálculo de similaridade cosseno.",
    tag: "RAG Foundation",
    difficulty: "Intermediário",
    whyNow: "Fundamento obrigatório antes de qualquer sistema RAG ou busca semântica.",
    order: 1,
    group: "Fundamentos",
  },
  {
    id: "structured-outputs",
    title: "Structured Outputs & JSON Mode",
    description:
      "JSON mode, function-schema-first design e validação com Zod. Técnicas para extrair saídas tipadas confiáveis de qualquer LLM sem parsing frágil.",
    tag: "LLM APIs",
    difficulty: "Intermediário",
    whyNow: "Requisito para integrar LLMs em sistemas tipados sem alucinações de formato.",
    order: 2,
    group: "Fundamentos",
  },
  {
    id: "function-calling",
    title: "Function Calling Avançado",
    description:
      "Structured outputs, parallel tool calls, error recovery e design de ferramentas para agentes. Padrões para sistemas tool-augmented confiáveis.",
    tag: "LLM APIs",
    difficulty: "Intermediário",
    whyNow: "Fundamental para qualquer sistema agentic de produção.",
    order: 3,
    group: "Fundamentos",
  },
  {
    id: "streaming-sse",
    title: "Streaming de Respostas LLM",
    description:
      "Server-Sent Events, streaming parcial com AI SDK, backpressure e UI progressiva. Diferença entre stream de tokens, objetos parciais e tool calls em tempo real.",
    tag: "LLM APIs",
    difficulty: "Intermediário",
    whyNow: "Essencial para UX responsiva — usuários abandonam apps que 'travam' aguardando IA.",
    order: 4,
    group: "Fundamentos",
  },
  {
    id: "cot-tot-react",
    title: "Prompt Engineering Avançado",
    description:
      "Chain-of-Thought, Tree-of-Thought e ReAct patterns. Técnicas para raciocínio multi-step, decomposição de problemas e planejamento com LLMs.",
    tag: "Prompt Design",
    difficulty: "Intermediário",
    whyNow: "Maximiza output de qualquer LLM sem custo adicional.",
    order: 5,
    group: "Fundamentos",
  },
  {
    id: "context-window",
    title: "Gestão de Context Window",
    description:
      "Chunking semântico, sliding window, context compression com LLMLingua e priorização de contexto. Long-context vs. retrieval trade-offs em escala.",
    tag: "Prompt Design",
    difficulty: "Avançado",
    whyNow: "Determina qualidade e custo de qualquer app LLM em escala — o gargalo real.",
    order: 6,
    group: "Fundamentos",
  },
  {
    id: "semantic-kernel",
    title: "Semantic Kernel",
    description:
      "SDK da Microsoft para orquestração de LLMs com plugins, planners e memória. Integração nativa com Azure OpenAI e suporte a .NET/Python.",
    tag: "Agentic Frameworks",
    difficulty: "Intermediário",
    whyNow: "Adoção acelerada em enterprises com stack Microsoft.",
    order: 7,
    group: "Fundamentos",
  },

  // ── Trilha 2: RAG ─────────────────────────────────────────
  {
    id: "rag-advanced-patterns",
    title: "RAG Avançado: HyDE, RAPTOR & Re-ranking",
    description:
      "HyDE (Hypothetical Document Embeddings), RAPTOR (sumarização recursiva em árvore), re-ranking com cross-encoders, fusion retrieval e métricas RAGAS.",
    tag: "RAG Avançado",
    difficulty: "Avançado",
    whyNow: "Eleva drasticamente a precisão do RAG — diferencial real em projetos enterprise.",
    order: 8,
    group: "RAG",
  },
  {
    id: "graph-rag",
    title: "Graph RAG",
    description:
      "Combine grafos de conhecimento com RAG para recuperação contextual estruturada. Supera RAG clássico em domínios com relações complexas entre entidades.",
    tag: "RAG Avançado",
    difficulty: "Avançado",
    whyNow: "Diferencial competitivo em arquiteturas de LLM enterprise.",
    order: 9,
    group: "RAG",
  },

  // ── Trilha 3: Agentic ─────────────────────────────────────
  {
    id: "langchain-langgraph",
    title: "LangChain & LangGraph",
    description:
      "LCEL, chains composáveis, runnables e state machines com LangGraph. Workflows agentic com loops, branches, checkpointing e human-in-the-loop.",
    tag: "Agentic Frameworks",
    difficulty: "Intermediário",
    whyNow: "Framework mais adotado globalmente para sistemas agentic em produção.",
    order: 10,
    group: "Agentic",
  },
  {
    id: "ai-memory-systems",
    title: "Sistemas de Memória para Agentes",
    description:
      "Memória de curto prazo (context), episódica (histórico), semântica (vector store) e procedural. Patterns com Mem0 e LangMem para agentes persistentes.",
    tag: "Agentic AI",
    difficulty: "Avançado",
    whyNow: "Componente crítico para agentes com comportamento coerente entre sessões.",
    order: 11,
    group: "Agentic",
  },
  {
    id: "multi-agent",
    title: "Multi-Agent Orchestration",
    description:
      "Sistemas com múltiplos agentes colaborativos usando AutoGen ou CrewAI para resolver tarefas complexas com divisão de papéis e supervisão hierárquica.",
    tag: "Agentic AI",
    difficulty: "Avançado",
    whyNow: "Base essencial para sistemas autônomos de nível produção.",
    order: 12,
    group: "Agentic",
  },
  {
    id: "mcp-protocol",
    title: "Model Context Protocol (MCP)",
    description:
      "Protocolo aberto da Anthropic para conectar LLMs a ferramentas, APIs e fontes de dados. Servidores MCP, transports stdio/SSE, segurança e permissões.",
    tag: "AI Protocols",
    difficulty: "Intermediário",
    whyNow: "Padrão emergente adotado por Claude, OpenAI e Gemini — infra do ecossistema agentic.",
    order: 13,
    group: "Agentic",
  },
  {
    id: "ai-workflow-orchestration",
    title: "Workflow Orchestration com IA",
    description:
      "Workflows duráveis com LangGraph + Temporal. Pausa/retomada de agentes, retry com backoff, observabilidade e gestão de estado em processos de longa duração.",
    tag: "Agentic AI",
    difficulty: "Avançado",
    whyNow: "Arquitetura de referência para agentes que executam tarefas de minutos a horas.",
    order: 14,
    group: "Agentic",
  },
  {
    id: "computer-use",
    title: "Computer Use & Browser Agents",
    description:
      "Agentes que controlam interfaces gráficas reais — Playwright, Puppeteer e Claude Computer Use API. Automação de tarefas visuais sem APIs disponíveis.",
    tag: "Agentic AI",
    difficulty: "Expert",
    whyNow: "Nova categoria de agentes com casos de uso impossíveis via tool calling tradicional.",
    order: 15,
    group: "Agentic",
  },

  // ── Trilha 4: Treinamento ─────────────────────────────────
  {
    id: "synthetic-data",
    title: "Geração de Dados Sintéticos",
    description:
      "Use LLMs para gerar datasets de treinamento, benchmarks customizados e dados de avaliação. Pipelines com filtragem automática e self-instruct.",
    tag: "Data Engineering",
    difficulty: "Avançado",
    whyNow: "Soluciona a escassez de dados rotulados em domínios específicos.",
    order: 16,
    group: "Treinamento",
  },
  {
    id: "lora-finetuning",
    title: "Fine-tuning com LoRA",
    description:
      "Adapte LLMs para domínios específicos com Low-Rank Adaptation. Custo de treinamento drasticamente reduzido versus full fine-tuning.",
    tag: "LLM Training",
    difficulty: "Expert",
    whyNow: "Habilidade crítica para soluções verticalizadas de IA.",
    order: 17,
    group: "Treinamento",
  },
  {
    id: "rlhf-dpo",
    title: "RLHF & DPO: Alinhamento de Modelos",
    description:
      "Reinforcement Learning from Human Feedback e Direct Preference Optimization. Como modelos como GPT-4 e Claude são alinhados — e como replicar isso em domínios customizados.",
    tag: "LLM Training",
    difficulty: "Expert",
    whyNow: "Fundamento para customizar comportamento e valores de modelos fine-tunados.",
    order: 18,
    group: "Treinamento",
  },
  {
    id: "moe",
    title: "Mixture of Experts (MoE)",
    description:
      "Arquitetura por trás dos modelos mais eficientes (GPT-4, Mixtral). Roteamento de especialistas, sparse activation e implicações de escala para inferência.",
    tag: "Arquitetura LLM",
    difficulty: "Expert",
    whyNow: "Fundamento para entender e arquitetar modelos de próxima geração.",
    order: 19,
    group: "Treinamento",
  },

  // ── Trilha 5: Produção ─────────────────────────────────────
  {
    id: "ai-evals",
    title: "AI Evals & Observabilidade",
    description:
      "Frameworks de avaliação sistemática de LLMs: métricas de qualidade, rastreamento de prompts, detecção de alucinações e monitoramento contínuo em produção.",
    tag: "MLOps",
    difficulty: "Avançado",
    whyNow: "Impossível entregar IA confiável sem avaliação rigorosa e contínua.",
    order: 20,
    group: "Produção",
  },
  {
    id: "ai-safety",
    title: "AI Safety & Red Teaming",
    description:
      "Adversarial testing, jailbreak detection, prompt injection defense e avaliação de risco em sistemas de IA generativa para ambientes enterprise.",
    tag: "AI Security",
    difficulty: "Avançado",
    whyNow: "Requisito crescente em deployments enterprise e regulatórios.",
    order: 21,
    group: "Produção",
  },
  {
    id: "llm-caching-routing",
    title: "LLM Caching & Model Routing",
    description:
      "Semantic caching com Redis, KV cache (Anthropic prompt cache), model routing por custo/latência e fallback automático entre provedores com AI Gateway.",
    tag: "MLOps",
    difficulty: "Avançado",
    whyNow: "Reduz custo de infra de IA em até 90% em produção com alto volume de requests.",
    order: 22,
    group: "Produção",
  },
  {
    id: "quantization-inference",
    title: "Quantização & Otimização de Inferência",
    description:
      "GGUF, GPTQ, bitsandbytes e vLLM. Serve LLMs em hardware acessível com throughput máximo. Trade-offs entre quantização 4-bit, 8-bit e FP16.",
    tag: "LLM Infrastructure",
    difficulty: "Expert",
    whyNow: "Viabiliza auto-hosting de LLMs — controle total sobre custo e privacidade de dados.",
    order: 23,
    group: "Produção",
  },
  {
    id: "multimodal-ai",
    title: "AI Multimodal: Visão, Áudio e Vídeo",
    description:
      "APIs vision (Claude, GPT-4V, Gemini), transcrição com Whisper, geração de imagem com Stable Diffusion e pipelines multimodais end-to-end.",
    tag: "Foundation Models",
    difficulty: "Avançado",
    whyNow: "Nova fronteira de aplicações AI-native além do texto puro.",
    order: 24,
    group: "Produção",
  },
  {
    id: "ai-cloud-infra",
    title: "AI na Nuvem: Bedrock, Vertex AI & Azure OpenAI",
    description:
      "Implante e governe LLMs em AWS Bedrock, GCP Vertex AI e Azure OpenAI. IAM, VPCs privadas, data residency, SLAs enterprise e FinOps de IA.",
    tag: "Cloud AI",
    difficulty: "Avançado",
    whyNow: "Requisito para arquitetar soluções IA enterprise-grade com governança e compliance.",
    order: 25,
    group: "Produção",
  },
];

const DIFFICULTY_COLOR: Record<Technique["difficulty"], string> = {
  Intermediário: "bg-info-subtle text-info-text border-info-border",
  Avançado: "bg-warning-subtle text-warning-text border-warning-border",
  Expert: "bg-destructive/10 text-destructive border-destructive/20",
};

const GROUP_COLOR: Record<Technique["group"], string> = {
  Fundamentos: "text-muted-foreground",
  RAG: "text-info-text",
  Agentic: "text-primary",
  Treinamento: "text-streak-text",
  Produção: "text-destructive",
};

interface Props {
  existingGoalTitles?: string[];
}

function getDailySlice(seed: string): Technique[] {
  // Sort by sequence order first, then apply day-based rotation for variety
  const ordered = [...ALL_TECHNIQUES].sort((a, b) => a.order - b.order);
  const dayIndex = Math.floor(new Date().getTime() / (1000 * 60 * 60 * 24));
  const offset = (dayIndex + seed.charCodeAt(0)) % ordered.length;
  const rotated = [...ordered.slice(offset), ...ordered.slice(0, offset)];
  return rotated.slice(0, 3);
}

export function AITechSuggestions({ existingGoalTitles = [] }: Props) {
  const [suggestions, setSuggestions] = useState<Technique[]>([]);
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    const slice = getDailySlice("ai-tech");
    const filtered = slice.filter(
      (t) =>
        !existingGoalTitles.some(
          (g) =>
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
        <h2 className="text-sm font-semibold text-foreground">Sugestões para você</h2>
        <span className="text-xs text-muted-foreground ml-auto flex items-center gap-0.5">
          <Brain className="w-3 h-3" /> baseado no seu perfil
        </span>
      </div>

      <div className="space-y-2.5">
        {suggestions.map((tech, index) => {
          const isAdded = added.has(tech.id);
          const isCreating = creating === tech.id;

          return (
            <div
              key={tech.id}
              className="rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition-all animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
              style={{ animationDelay: `${index * 70}ms`, animationDuration: '280ms' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-semibold text-foreground">{tech.title}</span>
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${DIFFICULTY_COLOR[tech.difficulty]}`}
                    >
                      {tech.difficulty}
                    </span>
                    <span className="text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full border border-border">
                      {tech.tag}
                    </span>
                    <span className={`text-[10px] font-medium ${GROUP_COLOR[tech.group]}`}>
                      Trilha {tech.order}/{ALL_TECHNIQUES.length} · {tech.group}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                    {tech.description}
                  </p>
                  <p className="text-xs text-primary mt-1.5 flex items-center gap-1">
                    <ChevronRight className="w-3 h-3 shrink-0" />
                    {tech.whyNow}
                  </p>
                </div>

                <button
                  onClick={() => handleAdd(tech)}
                  disabled={isAdded || isCreating}
                  className={`shrink-0 flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                    isAdded
                      ? "bg-success-subtle text-success-text border border-success-border cursor-default"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
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
