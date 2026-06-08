# Topic Resources Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich every generated learning path topic with an AI-written explanation, a YouTube video URL, and an article/documentation URL — displayed read-only in the TopicNode notes panel above the user's own editable notes.

**Architecture:** Extend the Drizzle schema with two new nullable columns (`explanation`, `article_url`) on the `topics` table; extend the Zod schema and prompt in `generateLearningPath` to produce these fields; update `TopicNode` to render the "Conteúdo base" section when fields are non-null. No new API routes or components needed.

**Tech Stack:** Next.js 14 App Router, Drizzle ORM + drizzle-kit (migrations), Zod, Anthropic AI SDK (`ai` package), Vitest, Tailwind CSS.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/db/schema.ts` | Modify | Add `explanation` and `articleUrl` fields to `topics` table |
| `drizzle/` | Generate | New migration file via `npm run db:generate` |
| `src/lib/ai/generate.ts` | Modify | Extend topic Zod schema, prompt, and mock data |
| `src/components/goals/TopicNode.tsx` | Modify | Render "Conteúdo base" section in notes panel |

---

## Task 1: Extend the `topics` schema with `explanation` and `articleUrl`

**Files:**
- Modify: `src/lib/db/schema.ts` (lines 116–140, the `topics` table definition)

- [ ] **Step 1: Add the two new fields to the topics table in schema.ts**

Open `src/lib/db/schema.ts`. Find the `topics` table (around line 116). Add the two new columns after `notes` (line 128):

```ts
// existing fields up to here:
  resourceUrl: text("resource_url"),
  notes: text("notes"),
  // NEW:
  explanation: text("explanation"),
  articleUrl: text("article_url"),
```

The full block around that section should now look like:

```ts
export const topics = pgTable("topics", {
  id: uuid("id").defaultRandom().primaryKey(),
  pathId: uuid("path_id")
    .notNull()
    .references(() => learningPaths.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  orderIndex: integer("order_index").notNull(),
  complexity: integer("complexity").notNull().default(3),
  estimatedMinutes: integer("estimated_minutes").notNull().default(45),
  status: topicStatusEnum("status").notNull().default("locked"),
  resourceUrl: text("resource_url"),
  notes: text("notes"),
  explanation: text("explanation"),
  articleUrl: text("article_url"),
  domain: text("domain"),
  // FSRS fields …
```

- [ ] **Step 2: Generate the migration**

```bash
npm run db:generate
```

Expected: drizzle-kit prints something like `[✓] Your SQL migration file ➜ drizzle/0001_*.sql`. A new `.sql` file appears in `drizzle/`.

- [ ] **Step 3: Verify the generated SQL looks correct**

Open the new migration file. It should contain:

```sql
ALTER TABLE "topics" ADD COLUMN "explanation" text;
ALTER TABLE "topics" ADD COLUMN "article_url" text;
```

No other changes. If the file looks correct, proceed.

- [ ] **Step 4: Apply the migration to the local/production database**

```bash
npm run db:migrate
```

Expected: drizzle-kit prints migration applied successfully. No errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/schema.ts drizzle/
git commit -m "feat: add explanation and articleUrl columns to topics table"
```

---

## Task 2: Extend `generateLearningPath` — Zod schema, prompt, and mock

**Files:**
- Modify: `src/lib/ai/generate.ts` (the `topicSchema`, `mockLearningPath`, and `generateLearningPath` functions)

- [ ] **Step 1: Extend the topic Zod schema**

In `src/lib/ai/generate.ts`, find `topicSchema` (around line 289):

```ts
const topicSchema = z.object({
  title: z.string(),
  description: z.string(),
  orderIndex: z.number().int().min(0),
  complexity: z.number().int().min(1).max(5),
  estimatedMinutes: z.number().int().min(15).max(360),
});
```

Replace it with:

```ts
const topicSchema = z.object({
  title: z.string(),
  description: z.string(),
  orderIndex: z.number().int().min(0),
  complexity: z.number().int().min(1).max(5),
  estimatedMinutes: z.number().int().min(15).max(360),
  resourceUrl: z.string().url().optional(),
  articleUrl: z.string().url().optional(),
  explanation: z.string().optional(),
});
```

- [ ] **Step 2: Update `mockLearningPath` to include resource fields**

Find `mockLearningPath` (around line 306). Replace the `topics` array with one that includes resource fields. Use these fixed values:

```ts
function mockLearningPath(goalTitle: string, dailyAvailableMinutes: number): GeneratedLearningPath {
  const topics = [
    {
      title: "Fundamentos e Conceitos Base",
      description: `Conceitos fundamentais de ${goalTitle}`,
      orderIndex: 0,
      complexity: 1,
      estimatedMinutes: 60,
      resourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      articleUrl: "https://developer.mozilla.org/en-US/docs/Learn",
      explanation: `Este tópico cobre os conceitos fundamentais necessários para começar a estudar ${goalTitle}. Como arquiteto de software, você já possui uma base sólida em sistemas distribuídos e padrões de design — use essa experiência como âncora para os novos conceitos.\n\nFoque em entender o "por quê" antes do "como": qual problema este conhecimento resolve? Como ele se encaixa na sua stack atual? Essa perspectiva acelera o aprendizado e facilita decisões de arquitetura futuras.\n\nAo praticar, implemente um exemplo mínimo funcional antes de ir para casos complexos. Falhar rápido em um ambiente controlado é a forma mais eficiente de fixar fundamentos.`,
    },
    {
      title: "Configuração do Ambiente",
      description: "Setup e ferramentas necessárias",
      orderIndex: 1,
      complexity: 2,
      estimatedMinutes: 45,
      resourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      articleUrl: "https://docs.python.org/3/tutorial/",
      explanation: `Configurar o ambiente corretamente poupa horas de debugging posterior. Este tópico cobre as ferramentas, versões e configurações necessárias para trabalhar de forma eficiente.\n\nSiga o princípio de infraestrutura como código: documente cada passo de configuração em um README ou script, assim qualquer membro do time pode reproduzir o ambiente. Isso também vale para projetos pessoais — você mesmo no futuro agradecerá.\n\nVerifique a compatibilidade de versões antes de instalar dependências. Conflitos de versão são a causa mais comum de problemas em ambientes de desenvolvimento.`,
    },
    {
      title: "Primeiros Passos Práticos",
      description: "Exercícios introdutórios guiados",
      orderIndex: 2,
      complexity: 2,
      estimatedMinutes: 90,
      resourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      articleUrl: "https://roadmap.sh/",
      explanation: `A melhor forma de consolidar teoria é colocando em prática imediatamente. Este tópico guia os primeiros exercícios práticos, garantindo que os conceitos fundamentais sejam reforçados com experiência hands-on.\n\nSiga o ciclo: leia o conceito → implemente um exemplo mínimo → quebre algo intencionalmente → conserte. Esse processo de "aprender errando com propósito" acelera significativamente a retenção.\n\nNão avance antes de entender o que está acontecendo. Velocidade sem compreensão gera dívida técnica de conhecimento — mais difícil de pagar do que dívida técnica em código.`,
    },
    {
      title: "Conceitos Intermediários",
      description: "Aprofundamento nos conceitos principais",
      orderIndex: 3,
      complexity: 3,
      estimatedMinutes: 90,
      resourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      articleUrl: "https://refactoring.guru/design-patterns",
      explanation: `Com os fundamentos estabelecidos, este tópico aprofunda os conceitos centrais que diferenciam um uso básico de um uso profissional da tecnologia. Aqui entram padrões, boas práticas e armadilhas comuns.\n\nComo arquiteto, preste atenção especial aos trade-offs de cada decisão de design. Pergunte-se: "Qual é o custo desta abstração? Quando ela começa a prejudicar mais do que ajudar?" Esse pensamento crítico é o que separa boas arquiteturas de arquiteturas over-engineered.\n\nBusque conexões com padrões que você já conhece. Novos conceitos raramente são completamente novos — são variações de problemas já resolvidos em outros contextos.`,
    },
    {
      title: "Integração e Pipelines",
      description: "Conectando componentes em fluxos reais",
      orderIndex: 4,
      complexity: 3,
      estimatedMinutes: 120,
      resourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      articleUrl: "https://martinfowler.com/articles/microservices.html",
      explanation: `Componentes isolados têm valor limitado; o valor real emerge quando eles trabalham juntos em pipelines e fluxos de dados coerentes. Este tópico cobre como integrar os blocos construídos anteriormente em sistemas funcionais.\n\nPense em contratos de interface: cada componente deve expor uma API clara e estável, independente da sua implementação interna. Isso é especialmente crítico em sistemas distribuídos onde mudanças precisam ser retrocompatíveis.\n\nTeste as integrações com dados reais desde cedo. Dados sintéticos escondem problemas de serialização, encoding e casos de borda que só aparecem em produção.`,
    },
    {
      title: "Técnicas Avançadas",
      description: "Otimização e boas práticas",
      orderIndex: 5,
      complexity: 4,
      estimatedMinutes: 120,
      resourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      articleUrl: "https://12factor.net/",
      explanation: `Com uma base sólida, é hora de explorar as técnicas que tornam sistemas robustos, eficientes e maintainable em longo prazo. Este tópico cobre otimizações, padrões avançados e boas práticas de produção.\n\nLembre-se da regra de ouro: otimize depois de medir. Nunca otimize prematuramente. Use profiling para identificar gargalos reais antes de refatorar.\n\nDocumente as decisões arquiteturais tomadas neste estágio (ADRs — Architecture Decision Records). Quando você ou seu time revisitar o código meses depois, a documentação do "porquê" vale mais que o código em si.`,
    },
    {
      title: "Projeto Prático",
      description: "Aplicação dos conceitos em projeto real",
      orderIndex: 6,
      complexity: 4,
      estimatedMinutes: 180,
      resourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      articleUrl: "https://github.com/practical-tutorials/project-based-learning",
      explanation: `O aprendizado só se consolida quando você constrói algo do zero com seus próprios objetivos. Este projeto prático integra todos os conceitos estudados em uma aplicação coerente e funcional.\n\nEscolha um problema que você realmente quer resolver — a motivação intrínseca é o melhor acelerador de aprendizado. Mesmo que o projeto seja simples, implemente-o com qualidade de produção: testes, tratamento de erros, logging.\n\nDocumente as decisões que você toma ao longo do projeto. Esse portfólio de decisões é o que diferencia um profissional sênior de um júnior no mercado.`,
    },
    {
      title: "Produção e Deploy",
      description: "Colocando em produção com qualidade",
      orderIndex: 7,
      complexity: 5,
      estimatedMinutes: 120,
      resourceUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      articleUrl: "https://sre.google/sre-book/table-of-contents/",
      explanation: `Levar software a produção com qualidade é onde a teoria encontra a realidade operacional. Este tópico cobre CI/CD, observabilidade, escalabilidade e as práticas SRE que garantem sistemas confiáveis.\n\nA tríade de observabilidade — logs, métricas e traces — deve ser implementada antes do primeiro deploy em produção, não depois do primeiro incidente. É muito mais fácil adicionar instrumentação quando o sistema ainda está fresco.\n\nAdote a mentalidade de "falha é inevitável": projete para degradação graciosa, implemente circuit breakers, e tenha runbooks documentados para os cenários de falha mais prováveis.`,
    },
  ];
  const total = topics.reduce((s, t) => s + t.estimatedMinutes, 0);
  const weeks = Math.ceil(total / (dailyAvailableMinutes * 5));
  return { topics, totalEstimatedMinutes: total, completionWeeksEstimate: weeks, paceWarning: null, fallbackUsed: true };
}
```

- [ ] **Step 3: Update the prompt in `generateLearningPath`**

Find the `prompt` string inside `generateLearningPath` (around line 335). Replace it with:

```ts
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
```

- [ ] **Step 4: Update the INSERT that saves topics to persist the new fields**

Find the route that inserts topics after path generation. Open `src/app/api/goals/[goalId]/path/route.ts`. Find the `topicRows` mapping (around line 56):

```ts
    const topicRows = generated.topics.map((t, i) => ({
      pathId: newPath.id,
      title: t.title,
      description: t.description,
      orderIndex: t.orderIndex,
      complexity: t.complexity,
      estimatedMinutes: t.estimatedMinutes,
      status: i === 0 ? ("unlocked" as const) : ("locked" as const),
    }));
```

Replace it with:

```ts
    const topicRows = generated.topics.map((t, i) => ({
      pathId: newPath.id,
      title: t.title,
      description: t.description,
      orderIndex: t.orderIndex,
      complexity: t.complexity,
      estimatedMinutes: t.estimatedMinutes,
      status: i === 0 ? ("unlocked" as const) : ("locked" as const),
      resourceUrl: t.resourceUrl ?? null,
      articleUrl: t.articleUrl ?? null,
      explanation: t.explanation ?? null,
    }));
```

Also find the regenerate route at `src/app/api/goals/[goalId]/path/regenerate/route.ts`. Check if it also maps topics and apply the same change if it does.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ai/generate.ts src/app/api/goals/
git commit -m "feat: extend generateLearningPath with explanation, resourceUrl, articleUrl per topic"
```

---

## Task 3: Update `TopicNode` to render "Conteúdo base" section

**Files:**
- Modify: `src/components/goals/TopicNode.tsx`

The `Topic` interface needs two new optional fields, and the notes panel needs a read-only "Conteúdo base" section.

- [ ] **Step 1: Add the new fields to the `Topic` interface**

In `src/components/goals/TopicNode.tsx`, find the `Topic` interface (around line 8):

```ts
interface Topic {
  id: string;
  title: string;
  description: string | null;
  orderIndex: number;
  complexity: number;
  estimatedMinutes: number;
  status: "locked" | "unlocked" | "in_progress" | "complete" | "skipped" | "known";
  resourceUrl: string | null;
  notes: string | null;
  nextReviewAt: string | null;
}
```

Replace it with:

```ts
interface Topic {
  id: string;
  title: string;
  description: string | null;
  orderIndex: number;
  complexity: number;
  estimatedMinutes: number;
  status: "locked" | "unlocked" | "in_progress" | "complete" | "skipped" | "known";
  resourceUrl: string | null;
  notes: string | null;
  nextReviewAt: string | null;
  explanation: string | null;
  articleUrl: string | null;
}
```

- [ ] **Step 2: Add the "Conteúdo base" section to the notes panel**

Find the `showNotes` panel (around line 311):

```tsx
      {showNotes && (
        <div className="mt-3 space-y-2 border-t pt-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Resource URL
            </label>
```

Replace the entire `{showNotes && (...)}` block with:

```tsx
      {showNotes && (
        <div className="mt-3 space-y-3 border-t pt-3">
          {/* AI-generated base content */}
          {(topic.explanation || topic.articleUrl) && (
            <div className="rounded-md bg-muted/50 border border-border/50 p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-foreground">Conteúdo base</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  Gerado pela IA
                </span>
              </div>
              {topic.explanation && (
                <div className="space-y-1">
                  {topic.explanation.split("\n\n").map((paragraph, i) => (
                    <p key={i} className="text-xs text-muted-foreground leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}
              {topic.articleUrl && (
                <div className="flex items-center gap-1 pt-1">
                  <span className="text-xs text-muted-foreground">Artigo/Docs:</span>
                  <a
                    href={topic.articleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline truncate max-w-[240px]"
                  >
                    {topic.articleUrl.replace(/^https?:\/\//, "")}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Editable user fields */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">
              Resource URL
            </label>
            <input
              type="url"
              value={resourceUrl}
              onChange={(e) => setResourceUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Your notes on this topic…"
              className="w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setShowNotes(false)}
              className="text-xs px-3 py-1 rounded border hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={saveNotes}
              disabled={saving}
              className="text-xs px-3 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      )}
```

- [ ] **Step 3: Verify the Topic interface is also updated in `PathTimeline.tsx` and `PathPage`**

Open `src/components/goals/PathTimeline.tsx`. Find its local `Topic` interface (around line 5) and add the two new fields:

```ts
interface Topic {
  id: string;
  title: string;
  description: string | null;
  orderIndex: number;
  complexity: number;
  estimatedMinutes: number;
  status: "locked" | "unlocked" | "in_progress" | "complete" | "skipped" | "known";
  resourceUrl: string | null;
  notes: string | null;
  nextReviewAt: string | null;
  explanation: string | null;
  articleUrl: string | null;
}
```

Open `src/app/goals/[goalId]/path/page.tsx`. Find its local `Topic` interface (around line 9) and add the two new fields:

```ts
interface Topic {
  id: string;
  title: string;
  description: string | null;
  orderIndex: number;
  complexity: number;
  estimatedMinutes: number;
  status: "locked" | "unlocked" | "in_progress" | "complete" | "skipped" | "known";
  resourceUrl: string | null;
  notes: string | null;
  nextReviewAt: string | null;
  explanation: string | null;
  articleUrl: string | null;
}
```

- [ ] **Step 4: Build to catch TypeScript errors**

```bash
npm run build 2>&1 | grep -E "error|Error" | grep -v node_modules
```

Expected: no TypeScript errors. If there are errors, fix them before proceeding.

- [ ] **Step 5: Commit**

```bash
git add src/components/goals/TopicNode.tsx src/components/goals/PathTimeline.tsx src/app/goals/
git commit -m "feat: render AI-generated explanation and article link in TopicNode notes panel"
```

---

## Task 4: Verify end-to-end with MOCK_AI and push

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Create a new goal (or regenerate an existing path)**

Navigate to `http://localhost:3000/goals`, create a new goal OR open an existing goal and click "Regenerate". With `MOCK_AI=true`, the mock topics will include `explanation`, `resourceUrl`, and `articleUrl`.

- [ ] **Step 3: Open the notes panel on any unlocked topic**

Click the `StickyNote` button on the first topic (status: unlocked). Verify:
- A "Conteúdo base" section appears at the top with "Gerado pela IA" badge
- The explanation renders as multiple paragraphs
- The article URL appears as a clickable link
- The Resource URL input is pre-filled with the YouTube URL from the mock
- The Notes textarea is empty (user hasn't written anything yet)
- Save/Cancel buttons work as before

- [ ] **Step 4: Verify locked topics show nothing**

Click the `StickyNote` button on a locked topic — it should not be visible (the `canInteract` guard already prevents showing any buttons for locked topics). Confirm locked topics have no notes button.

- [ ] **Step 5: Verify topics with null explanation (old topics)**

If there are existing topics in the DB without explanation/articleUrl, confirm the "Conteúdo base" section is completely hidden — no empty box, no label.

- [ ] **Step 6: Commit and push**

```bash
git add -A
git commit -m "feat: AI-generated topic resources — explanation, video, article per topic

Each new learning path topic now includes:
- AI-generated contextual explanation (2-4 paragraphs, pt-BR, tailored
  for a software architect)
- YouTube video URL from a trusted channel
- Article/documentation URL

Resources surface read-only in the TopicNode notes panel under a
'Conteúdo base / Gerado pela IA' section. User notes remain fully
editable and separate. Old topics with null fields show nothing.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"

git push origin main
```

---

## Self-Review

**Spec coverage:**
- ✅ Two new nullable DB columns (`explanation`, `article_url`) — Task 1
- ✅ Migration generated and applied — Task 1
- ✅ Zod schema extended with optional `resourceUrl`, `articleUrl`, `explanation` — Task 2
- ✅ Prompt extended to request all three fields per topic — Task 2
- ✅ Mock data updated with real-looking resource content — Task 2
- ✅ INSERT in path generation persists new fields — Task 2
- ✅ Regenerate route also updated — Task 2
- ✅ `TopicNode` renders "Conteúdo base" section read-only — Task 3
- ✅ Section hidden when both fields are null — Task 3
- ✅ `explanation`, `articleUrl` added to all three `Topic` interfaces — Task 3
- ✅ User notes remain independent and editable — Task 3
- ✅ E2E verified with MOCK_AI — Task 4

**Placeholder scan:** No TBD, no TODO, no "similar to task N", all code blocks complete.

**Type consistency:** `explanation: string | null`, `articleUrl: string | null` used consistently across schema.ts, generate.ts, TopicNode.tsx, PathTimeline.tsx, and path/page.tsx.
