import { generateObject, generateText } from "ai";
import { z } from "zod";
import { anthropic, MODEL } from "./client";
import { LEARNING_PATH_SYSTEM_PROMPT, DAILY_PLAN_SYSTEM_PROMPT } from "./prompts";

const MOCK_AI = process.env.MOCK_AI === "true";

// ─── Shared Types ─────────────────────────────────────────────────────────────

export type AssessmentDimension = "recall" | "application" | "analysis";

export interface AssessmentQuestion {
  id: string;
  text: string;
  options: { a: string; b: string; c: string; d: string };
  correct: "a" | "b" | "c" | "d";
  userAnswer: "a" | "b" | "c" | "d" | null;
  dimension: AssessmentDimension;
}

// ─── Knowledge Assessment Generation ─────────────────────────────────────────

const assessmentQuestionSchema = z.object({
  id: z.string(),
  text: z.string(),
  options: z.object({ a: z.string(), b: z.string(), c: z.string(), d: z.string() }),
  correct: z.enum(["a", "b", "c", "d"]),
  dimension: z.enum(["recall", "application", "analysis"]),
});

const assessmentSchema = z.object({
  questions: z.array(assessmentQuestionSchema).min(3).max(5),
});

function mockAssessment(topicTitle: string): AssessmentQuestion[] {
  return [
    {
      id: "mock-q-1",
      text: `O que melhor descreve o conceito principal de "${topicTitle}"?`,
      options: {
        a: "Uma abordagem para estruturar sistemas complexos",
        b: "Um protocolo de comunicação de rede",
        c: "Um padrão de banco de dados relacional",
        d: "Uma linguagem de programação orientada a objetos",
      },
      correct: "a",
      userAnswer: null,
      dimension: "recall",
    },
    {
      id: "mock-q-2",
      text: `Ao aplicar "${topicTitle}" em um projeto real, qual seria o principal benefício?`,
      options: {
        a: "Redução de custos de infraestrutura",
        b: "Maior escalabilidade e manutenibilidade do sistema",
        c: "Eliminação completa de bugs no código",
        d: "Substituição de todas as dependências externas",
      },
      correct: "b",
      userAnswer: null,
      dimension: "application",
    },
    {
      id: "mock-q-3",
      text: `Qual é a principal limitação ou desafio ao adotar "${topicTitle}"?`,
      options: {
        a: "Compatibilidade com versões antigas de hardware",
        b: "Curva de aprendizado e complexidade de implementação inicial",
        c: "Ausência de documentação oficial",
        d: "Restrições de licença comercial",
      },
      correct: "b",
      userAnswer: null,
      dimension: "analysis",
    },
  ];
}

export async function generateAssessment(
  topicTitle: string,
  topicDescription: string,
  notes?: string | null
): Promise<AssessmentQuestion[]> {
  if (MOCK_AI) return mockAssessment(topicTitle);

  const { object } = await generateObject({
    model: anthropic(MODEL),
    schema: assessmentSchema,
    system:
      "Você é um especialista em avaliação pedagógica. Gere perguntas de múltipla escolha em português (pt-BR) para avaliar o entendimento do tópico.",
    prompt: `Crie 3 a 5 perguntas de múltipla escolha para avaliar o entendimento do seguinte tópico.

Tópico: ${topicTitle}
Descrição: ${topicDescription}
${notes ? `Notas do aluno: ${notes}` : ""}

Requisitos:
- Cada pergunta deve ter exatamente 4 opções (a, b, c, d) com uma única resposta correta
- Cubra diferentes dimensões: pelo menos 1 de recall (memorização), 1 de application (aplicação prática) e 1 de analysis (análise crítica)
- Gere um id único para cada pergunta (use strings como "q-1", "q-2", etc.)
- As perguntas devem ser específicas ao tópico, não genéricas
- Escreva todas as perguntas e opções em português (pt-BR)`,
  });

  return object.questions.map((q) => ({ ...q, userAnswer: null }));
}

// ─── Gap Analysis Generation ──────────────────────────────────────────────────

const gapAnalysisSchema = z.object({
  coveredSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  suggestedGoals: z
    .array(z.object({ title: z.string(), rationale: z.string().max(200) }))
    .min(3)
    .max(5),
});

export type GapAnalysisResult = z.infer<typeof gapAnalysisSchema>;

function mockGapAnalysis(_careerTarget: string): GapAnalysisResult {
  return {
    coveredSkills: [
      "Fundamentos de arquitetura de software",
      "Padrões de design (Design Patterns)",
      "Desenvolvimento de APIs REST",
    ],
    missingSkills: [
      "Sistemas multi-agente e frameworks agentic (LangGraph, AutoGen)",
      "RAG avançado (Retrieval-Augmented Generation) com vetores",
      "Orquestração de LLMs em produção (LangSmith, Weights & Biases)",
      "Arquitetura de sistemas de IA em escala empresarial",
    ],
    suggestedGoals: [
      {
        title: "Dominar Frameworks Agentic para IA Empresarial",
        rationale:
          "Fundamental para o objetivo de liderar sistemas agentic; LangGraph e AutoGen são os padrões emergentes do mercado.",
      },
      {
        title: "RAG Avançado e Sistemas de Busca Semântica",
        rationale:
          "Skill crítica ausente no portfolio; base de todo sistema de conhecimento corporativo com IA.",
      },
      {
        title: "Observabilidade e MLOps para Sistemas de IA",
        rationale:
          "Diferencial competitivo para arquitetos que querem levar IA além de protótipos para produção.",
      },
    ],
  };
}

export async function generateGapAnalysis(
  careerTarget: string,
  completedTopics: Array<{ title: string; description?: string | null }>
): Promise<GapAnalysisResult> {
  if (MOCK_AI) return mockGapAnalysis(careerTarget);

  const topicList = completedTopics
    .map((t) => `- ${t.title}${t.description ? `: ${t.description.slice(0, 100)}` : ""}`)
    .join("\n");

  const { object } = await generateObject({
    model: anthropic(MODEL),
    schema: gapAnalysisSchema,
    system:
      "Você é um advisor de carreira especialista em arquitetura de software e IA. Analise o portfolio de aprendizado do profissional e identifique gaps em relação ao objetivo de carreira. Responda em português (pt-BR).",
    prompt: `Analise o portfolio de aprendizado e identifique gaps em relação ao objetivo de carreira.

Objetivo de carreira: "${careerTarget}"

Tópicos já estudados (portfolio atual):
${topicList || "Nenhum tópico concluído ainda."}

Retorne:
- coveredSkills: lista de skills do portfolio relevantes para o objetivo
- missingSkills: lista de skills críticas ausentes para atingir o objetivo
- suggestedGoals: 3 a 5 sugestões de metas de aprendizado priorizadas, cada uma com título e justificativa de até 200 caracteres`,
  });

  return object;
}

// ─── Weekly Insight Generation ────────────────────────────────────────────────

export const WEEKLY_INSIGHT_FALLBACK = "Continue estudando — cada semana conta!";

interface WeekMetrics {
  topicsCompleted: number;
  studyHours: number;
  streakDays: number;
  topDomain: string | null;
  weakestDomain: string | null;
}

export async function generateWeeklyInsight(
  careerTarget: string | null,
  metrics: WeekMetrics
): Promise<string> {
  if (MOCK_AI) {
    return `Ótima semana! Você estudou ${metrics.topicsCompleted} tópico(s) e acumulou ${metrics.studyHours.toFixed(1)}h — continue assim!`;
  }

  try {
    const { text } = await generateText({
      model: anthropic(MODEL),
      system:
        "Você é um coach de aprendizado motivacional. Escreva UMA frase de insight personalizada sobre a semana de estudos do profissional. Seja específico, motivador e breve. Responda apenas a frase, sem prefixo.",
      prompt: `Métricas da semana:
- Tópicos concluídos: ${metrics.topicsCompleted}
- Horas de estudo: ${metrics.studyHours.toFixed(1)}h
- Sequência atual: ${metrics.streakDays} dias
- Domínio mais estudado: ${metrics.topDomain ?? "N/A"}
- Domínio mais fraco: ${metrics.weakestDomain ?? "N/A"}
${careerTarget ? `\nObjetivo de carreira: "${careerTarget}"` : ""}

Escreva uma única frase de insight que conecte a semana ao objetivo de carreira (ou encoraje geralmente se não há objetivo definido).`,
    });
    return text.trim() || WEEKLY_INSIGHT_FALLBACK;
  } catch {
    return WEEKLY_INSIGHT_FALLBACK;
  }
}

// ─── Domain Inference ─────────────────────────────────────────────────────────

const domainInferenceSchema = z.object({
  results: z.array(z.object({ id: z.string(), domain: z.string() })),
});

function mockDomainInference(
  topics: Array<{ id: string; title: string }>
): Array<{ id: string; domain: string }> {
  const domainMap: Record<string, string> = {
    IA: "Inteligência Artificial",
    LLM: "Inteligência Artificial",
    GPT: "Inteligência Artificial",
    "Machine Learning": "Machine Learning",
    Docker: "Cloud & DevOps",
    Kubernetes: "Cloud & DevOps",
    AWS: "Cloud & DevOps",
    API: "Arquitetura de Software",
    REST: "Arquitetura de Software",
    "Design Pattern": "Arquitetura de Software",
    React: "Frontend",
    Next: "Frontend",
    TypeScript: "Engenharia de Software",
    SQL: "Banco de Dados",
    PostgreSQL: "Banco de Dados",
  };

  return topics.map((t) => {
    const domain =
      Object.entries(domainMap).find(([key]) =>
        t.title.toLowerCase().includes(key.toLowerCase())
      )?.[1] ?? "Outros";
    return { id: t.id, domain };
  });
}

export async function inferTopicDomains(
  topics: Array<{ id: string; title: string; description?: string | null }>
): Promise<Array<{ id: string; domain: string }>> {
  if (MOCK_AI) return mockDomainInference(topics);

  const topicList = topics
    .map((t) => `id: ${t.id} | título: "${t.title}"`)
    .join("\n");

  const { object } = await generateObject({
    model: anthropic(MODEL),
    schema: domainInferenceSchema,
    system:
      "Você é um especialista em classificação de conhecimento técnico. Classifique cada tópico em uma categoria de domínio tecnológico.",
    prompt: `Classifique cada tópico abaixo em um domínio tecnológico. Use domínios como: "Inteligência Artificial", "Machine Learning", "Cloud & DevOps", "Arquitetura de Software", "Frontend", "Backend", "Banco de Dados", "Segurança", "Engenharia de Software", ou outro domínio apropriado. Se não for possível classificar, use "Outros".

Tópicos:
${topicList}

Retorne exatamente o mesmo id para cada tópico com seu domínio classificado.`,
  });

  return object.results;
}

// ─── Learning Path Generation ─────────────────────────────────────────────────

const topicSchema = z.object({
  title: z.string(),
  description: z.string(),
  orderIndex: z.number().int().min(0),
  complexity: z.number().int().min(1).max(5),
  estimatedMinutes: z.number().int().min(15).max(360),
  resourceUrl: z.string().url().optional().catch(undefined),
  articleUrl: z.string().url().optional().catch(undefined),
  explanation: z.string().optional(),
});

const learningPathSchema = z.object({
  topics: z.array(topicSchema).min(4).max(30),
  totalEstimatedMinutes: z.number().int().positive(),
  completionWeeksEstimate: z.number().int().positive(),
  paceWarning: z.string().nullable(),
});

export type GeneratedLearningPath = z.infer<typeof learningPathSchema> & { fallbackUsed: boolean };

function mockLearningPath(goalTitle: string, dailyAvailableMinutes: number): GeneratedLearningPath {
  const topics = [
    {
      title: "Fundamentos e Conceitos Base",
      description: `Conceitos fundamentais de ${goalTitle}`,
      orderIndex: 0,
      complexity: 1,
      estimatedMinutes: 60,
      resourceUrl: "https://www.youtube.com/watch?v=rfscVS0vtbw",
      articleUrl: "https://developer.mozilla.org/en-US/docs/Learn",
      explanation: `Este tópico cobre os conceitos fundamentais necessários para começar a estudar ${goalTitle}. Como arquiteto de software, você já possui uma base sólida em sistemas distribuídos e padrões de design — use essa experiência como âncora para os novos conceitos.\n\nFoque em entender o "por quê" antes do "como": qual problema este conhecimento resolve? Como ele se encaixa na sua stack atual? Essa perspectiva acelera o aprendizado e facilita decisões de arquitetura futuras.\n\nAo praticar, implemente um exemplo mínimo funcional antes de ir para casos complexos. Falhar rápido em um ambiente controlado é a forma mais eficiente de fixar fundamentos.`,
    },
    {
      title: "Configuração do Ambiente",
      description: "Setup e ferramentas necessárias",
      orderIndex: 1,
      complexity: 2,
      estimatedMinutes: 45,
      resourceUrl: "https://www.youtube.com/watch?v=YYXdXT2l-Gg",
      articleUrl: "https://docs.python.org/3/tutorial/",
      explanation: `Configurar o ambiente corretamente poupa horas de debugging posterior. Este tópico cobre as ferramentas, versões e configurações necessárias para trabalhar de forma eficiente.\n\nSiga o princípio de infraestrutura como código: documente cada passo de configuração em um README ou script, assim qualquer membro do time pode reproduzir o ambiente. Isso também vale para projetos pessoais — você mesmo no futuro agradecerá.\n\nVerifique a compatibilidade de versões antes de instalar dependências. Conflitos de versão são a causa mais comum de problemas em ambientes de desenvolvimento.`,
    },
    {
      title: "Primeiros Passos Práticos",
      description: "Exercícios introdutórios guiados",
      orderIndex: 2,
      complexity: 2,
      estimatedMinutes: 90,
      resourceUrl: "https://www.youtube.com/watch?v=kqtD5dpn9C8",
      articleUrl: "https://roadmap.sh/",
      explanation: `A melhor forma de consolidar teoria é colocando em prática imediatamente. Este tópico guia os primeiros exercícios práticos, garantindo que os conceitos fundamentais sejam reforçados com experiência hands-on.\n\nSiga o ciclo: leia o conceito → implemente um exemplo mínimo → quebre algo intencionalmente → conserte. Esse processo de "aprender errando com propósito" acelera significativamente a retenção.\n\nNão avance antes de entender o que está acontecendo. Velocidade sem compreensão gera dívida técnica de conhecimento — mais difícil de pagar do que dívida técnica em código.`,
    },
    {
      title: "Conceitos Intermediários",
      description: "Aprofundamento nos conceitos principais",
      orderIndex: 3,
      complexity: 3,
      estimatedMinutes: 90,
      resourceUrl: "https://www.youtube.com/watch?v=SLpUKAGnm-g",
      articleUrl: "https://refactoring.guru/design-patterns",
      explanation: `Com os fundamentos estabelecidos, este tópico aprofunda os conceitos centrais que diferenciam um uso básico de um uso profissional da tecnologia. Aqui entram padrões, boas práticas e armadilhas comuns.\n\nComo arquiteto, preste atenção especial aos trade-offs de cada decisão de design. Pergunte-se: "Qual é o custo desta abstração? Quando ela começa a prejudicar mais do que ajudar?" Esse pensamento crítico é o que separa boas arquiteturas de arquiteturas over-engineered.\n\nBusque conexões com padrões que você já conhece. Novos conceitos raramente são completamente novos — são variações de problemas já resolvidos em outros contextos.`,
    },
    {
      title: "Integração e Pipelines",
      description: "Conectando componentes em fluxos reais",
      orderIndex: 4,
      complexity: 3,
      estimatedMinutes: 120,
      resourceUrl: "https://www.youtube.com/watch?v=oJ5qSb3lMpI",
      articleUrl: "https://martinfowler.com/articles/microservices.html",
      explanation: `Componentes isolados têm valor limitado; o valor real emerge quando eles trabalham juntos em pipelines e fluxos de dados coerentes. Este tópico cobre como integrar os blocos construídos anteriormente em sistemas funcionais.\n\nPense em contratos de interface: cada componente deve expor uma API clara e estável, independente da sua implementação interna. Isso é especialmente crítico em sistemas distribuídos onde mudanças precisam ser retrocompatíveis.\n\nTeste as integrações com dados reais desde cedo. Dados sintéticos escondem problemas de serialização, encoding e casos de borda que só aparecem em produção.`,
    },
    {
      title: "Técnicas Avançadas",
      description: "Otimização e boas práticas",
      orderIndex: 5,
      complexity: 4,
      estimatedMinutes: 120,
      resourceUrl: "https://www.youtube.com/watch?v=8aGhZQkoFbQ",
      articleUrl: "https://12factor.net/",
      explanation: `Com uma base sólida, é hora de explorar as técnicas que tornam sistemas robustos, eficientes e maintainable em longo prazo. Este tópico cobre otimizações, padrões avançados e boas práticas de produção.\n\nLembre-se da regra de ouro: otimize depois de medir. Nunca otimize prematuramente. Use profiling para identificar gargalos reais antes de refatorar.\n\nDocumente as decisões arquiteturais tomadas neste estágio (ADRs — Architecture Decision Records). Quando você ou seu time revisitar o código meses depois, a documentação do "porquê" vale mais que o código em si.`,
    },
    {
      title: "Projeto Prático",
      description: "Aplicação dos conceitos em projeto real",
      orderIndex: 6,
      complexity: 4,
      estimatedMinutes: 180,
      resourceUrl: "https://www.youtube.com/watch?v=W6NZfCO5SIk",
      articleUrl: "https://github.com/practical-tutorials/project-based-learning",
      explanation: `O aprendizado só se consolida quando você constrói algo do zero com seus próprios objetivos. Este projeto prático integra todos os conceitos estudados em uma aplicação coerente e funcional.\n\nEscolha um problema que você realmente quer resolver — a motivação intrínseca é o melhor acelerador de aprendizado. Mesmo que o projeto seja simples, implemente-o com qualidade de produção: testes, tratamento de erros, logging.\n\nDocumente as decisões que você toma ao longo do projeto. Esse portfólio de decisões é o que diferencia um profissional sênior de um júnior no mercado.`,
    },
    {
      title: "Produção e Deploy",
      description: "Colocando em produção com qualidade",
      orderIndex: 7,
      complexity: 5,
      estimatedMinutes: 120,
      resourceUrl: "https://www.youtube.com/watch?v=Wvf0mBNGjXY",
      articleUrl: "https://sre.google/sre-book/table-of-contents/",
      explanation: `Levar software a produção com qualidade é onde a teoria encontra a realidade operacional. Este tópico cobre CI/CD, observabilidade, escalabilidade e as práticas SRE que garantem sistemas confiáveis.\n\nA tríade de observabilidade — logs, métricas e traces — deve ser implementada antes do primeiro deploy em produção, não depois do primeiro incidente. É muito mais fácil adicionar instrumentação quando o sistema ainda está fresco.\n\nAdote a mentalidade de "falha é inevitável": projete para degradação graciosa, implemente circuit breakers, e tenha runbooks documentados para os cenários de falha mais prováveis.`,
    },
  ];
  const total = topics.reduce((s, t) => s + t.estimatedMinutes, 0);
  const weeks = Math.ceil(total / (dailyAvailableMinutes * 5));
  return { topics, totalEstimatedMinutes: total, completionWeeksEstimate: weeks, paceWarning: null, fallbackUsed: true };
}

export async function generateLearningPath(
  goalTitle: string,
  goalDescription: string,
  userBackground: string,
  dailyAvailableMinutes: number
): Promise<GeneratedLearningPath> {
  if (MOCK_AI) return mockLearningPath(goalTitle, dailyAvailableMinutes);

  try {
    const { object } = await generateObject({
      model: anthropic(MODEL),
      schema: learningPathSchema,
      system: LEARNING_PATH_SYSTEM_PROMPT,
      prompt: `Generate a complete learning path for the following goal.

Goal Title: ${goalTitle}
Goal Description: ${goalDescription}

Learner Background: ${userBackground}
Available study time: ${dailyAvailableMinutes} minutes per day (weekdays)

Requirements:
- Create 8-20 ordered topics progressing from foundational to advanced
- Order topics so each builds on previous knowledge
- Provide realistic time estimates (15-360 minutes per topic)
- Complexity scale: 1=beginner concept, 5=expert/advanced concept
- Calculate totalEstimatedMinutes as the sum of all topic durations
- Calculate completionWeeksEstimate based on ${dailyAvailableMinutes} min/day, 5 days/week
- Include a paceWarning if the goal seems unrealistic for the timeline, or null if it's reasonable

For EACH topic also provide:
- resourceUrl: a real YouTube video URL from a trusted channel (freeCodeCamp, Fireship, Traversy Media, Tech With Tim, Coding With Lewis, Academind, or the official channel of the technology). Pick a video that directly covers this specific topic. Use format: https://www.youtube.com/watch?v=VIDEO_ID
- articleUrl: a real URL to official documentation or a quality technical article (official project docs, MDN, dev.to, Medium engineering blogs, Martin Fowler's blog, etc.) directly relevant to this topic
- explanation: 2-4 paragraphs in pt-BR explaining the topic for a senior software architect. Structure: (1) central concept and why it matters in professional practice, (2) how it connects to software architecture patterns or distributed systems the learner already knows, (3) what to focus on when practicing it. Be specific, direct, and assume deep engineering background.`,
    });
    return { ...object, fallbackUsed: false };
  } catch (err) {
    console.error("[generateLearningPath] AI error, using fallback:", err);
    return mockLearningPath(goalTitle, dailyAvailableMinutes);
  }
}

// ─── Daily Plan Generation ────────────────────────────────────────────────────

const dailyTaskSchema = z.object({
  topicId: z.string(),
  taskType: z.enum(["new_learning", "review"]),
  suggestedMinutes: z.number().int().min(15).max(120),
  rationale: z.string(),
});

const dailyPlanSchema = z.object({
  tasks: z.array(dailyTaskSchema),
  aiRationale: z.string(),
});

export type GeneratedDailyPlan = z.infer<typeof dailyPlanSchema> & { fallbackUsed: boolean };

interface DueReview {
  topicId: string;
  topicTitle: string;
  goalTitle: string;
  goalPriority: "high" | "medium" | "low";
  daysOverdue: number;
  estimatedMinutes: number;
}

interface NewLearningCandidate {
  topicId: string;
  topicTitle: string;
  goalTitle: string;
  goalPriority: "high" | "medium" | "low";
  estimatedMinutes: number;
  targetDateDaysLeft?: number;
}

export async function generateDailyPlanWithAI(
  availableMinutes: number,
  dueReviews: DueReview[],
  newLearningCandidates: NewLearningCandidate[]
): Promise<GeneratedDailyPlan> {
  function buildFallbackPlan(): GeneratedDailyPlan {
    const tasks: GeneratedDailyPlan["tasks"] = [];
    let remaining = availableMinutes;
    for (const r of dueReviews) {
      if (remaining <= 0) break;
      const mins = Math.min(r.estimatedMinutes, remaining);
      tasks.push({ topicId: r.topicId, taskType: "review", suggestedMinutes: mins, rationale: "Due for review" });
      remaining -= mins;
    }
    for (const c of newLearningCandidates) {
      if (remaining <= 0) break;
      const mins = Math.min(c.estimatedMinutes, remaining);
      tasks.push({ topicId: c.topicId, taskType: "new_learning", suggestedMinutes: mins, rationale: "Next topic in path" });
      remaining -= mins;
    }
    return { tasks, aiRationale: "Plano gerado por regras internas.", fallbackUsed: true };
  }

  if (MOCK_AI) return buildFallbackPlan();

  try {
    const { object } = await generateObject({
      model: anthropic(MODEL),
      schema: dailyPlanSchema,
      system: DAILY_PLAN_SYSTEM_PROMPT,
      prompt: `Generate an optimized daily study plan.

Available time today: ${availableMinutes} minutes

DUE REVIEWS (prioritize these):
${
  dueReviews.length > 0
    ? dueReviews
        .map(
          (r) =>
            `- Topic: "${r.topicTitle}" (Goal: ${r.goalTitle}, Priority: ${r.goalPriority}, ${r.daysOverdue} days overdue, ~${r.estimatedMinutes} min)`
        )
        .join("\n")
    : "None"
}

AVAILABLE NEW TOPICS (fill remaining time):
${
  newLearningCandidates.length > 0
    ? newLearningCandidates
        .map(
          (c) =>
            `- Topic: "${c.topicTitle}" (Goal: ${c.goalTitle}, Priority: ${c.goalPriority}${c.targetDateDaysLeft !== undefined ? `, ${c.targetDateDaysLeft} days to deadline` : ""}, ~${c.estimatedMinutes} min)`
        )
        .join("\n")
    : "None available yet"
}

Select tasks that fit within ${availableMinutes} minutes total. Include all overdue reviews first, then fill remaining time with new learning.`,
    });
    return { ...object, fallbackUsed: false };
  } catch (err) {
    console.error("[generateDailyPlanWithAI] AI error, using fallback:", err);
    return buildFallbackPlan();
  }
}
