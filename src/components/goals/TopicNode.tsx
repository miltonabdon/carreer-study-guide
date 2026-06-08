"use client";

import { useState } from "react";
import { ExternalLink, StickyNote, SkipForward, Undo2, Clock, Zap, Play, CheckCircle, BookCheck, BellRing, GraduationCap } from "lucide-react";
import { getYouTubeVideoId } from "@/lib/utils";
import { AssessmentModal } from "@/components/assessments/AssessmentModal";

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

interface TopicNodeProps {
  topic: Topic;
  onUpdate: (topicId: string, data: Partial<Pick<Topic, "status" | "resourceUrl" | "notes">>) => void;
  onComplete?: () => void;
}

const STATUS_STYLES: Record<Topic["status"], string> = {
  locked: "border-muted-foreground/30 bg-muted/50 text-muted-foreground",
  unlocked: "border-primary/50 bg-background",
  in_progress: "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-sm shadow-primary/10",
  complete: "border-success-border bg-success-subtle",
  skipped: "border-muted-foreground/20 bg-muted/30 text-muted-foreground",
  known: "border-info-border bg-info-subtle",
};

export function TopicNode({ topic, onUpdate, onComplete }: TopicNodeProps) {
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState(topic.notes ?? "");
  const [resourceUrl, setResourceUrl] = useState(topic.resourceUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [showEmbed, setShowEmbed] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [completeDuration, setCompleteDuration] = useState(topic.estimatedMinutes);
  const [completeConfidence, setCompleteConfidence] = useState(3);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState<string | null>(null);

  const ytVideoId = topic.resourceUrl ? getYouTubeVideoId(topic.resourceUrl) : null;

  const isOverdue =
    topic.nextReviewAt && topic.status === "complete" && new Date(topic.nextReviewAt) < new Date();

  async function saveNotes() {
    setSaving(true);
    await onUpdate(topic.id, {
      notes: notes || null,
      resourceUrl: resourceUrl || null,
    });
    setSaving(false);
    setShowNotes(false);
  }

  async function toggleSkip() {
    const newStatus = topic.status === "skipped" ? "unlocked" : "skipped";
    await onUpdate(topic.id, { status: newStatus });
  }

  async function handleMarkKnown() {
    setMarkingKnown(true);
    try {
      const res = await fetch(`/api/topics/${topic.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "known" }),
      });
      if (res.ok) onComplete?.();
    } finally {
      setMarkingKnown(false);
    }
  }

  async function handleComplete() {
    setCompleting(true);
    setCompleteError(null);
    try {
      const res = await fetch(`/api/topics/${topic.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          durationMinutes: completeDuration,
          confidenceRating: completeConfidence,
        }),
      });
      if (res.ok) {
        setShowComplete(false);
        onComplete?.();
      } else {
        const data = await res.json().catch(() => ({}));
        setCompleteError(data.error ?? `Erro ${res.status}`);
      }
    } catch {
      setCompleteError("Erro de rede. Tente novamente.");
    } finally {
      setCompleting(false);
    }
  }

  const canInteract = topic.status !== "locked";
  const canComplete = topic.status === "unlocked" || topic.status === "in_progress";
  const canBoost = topic.status === "complete" || topic.status === "known";
  const canAssess = topic.status === "complete" || topic.status === "known";
  const [markingKnown, setMarkingKnown] = useState(false);
  const [boosting, setBoosting] = useState(false);
  const [assessmentData, setAssessmentData] = useState<Parameters<typeof AssessmentModal>[0]["data"] | null>(null);
  const [requestingAssessment, setRequestingAssessment] = useState(false);

  async function handleRequestAssessment() {
    setRequestingAssessment(true);
    try {
      const res = await fetch(`/api/topics/${topic.id}/assessment`, { method: "POST" });
      if (res.ok || res.status === 201) {
        const data = await res.json();
        setAssessmentData({ ...data, topicTitle: topic.title });
      }
    } finally {
      setRequestingAssessment(false);
    }
  }

  async function handleReviewBoost() {
    setBoosting(true);
    try {
      const res = await fetch(`/api/topics/${topic.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewBoost: true }),
      });
      if (res.ok) onComplete?.();
    } finally {
      setBoosting(false);
    }
  }

  return (
    <div className={`relative rounded-lg border-2 p-4 transition-all ${STATUS_STYLES[topic.status]}`}>
      {/* Connector line (shown by parent PathTimeline) */}

      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground">#{topic.orderIndex + 1}</span>
            <h3 className={`font-medium text-sm ${topic.status === "locked" ? "text-muted-foreground" : ""}`}>
              {topic.title}
            </h3>
            {topic.status === "in_progress" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                Em andamento
              </span>
            )}
            {topic.status === "complete" && (
              <span className="rounded-full bg-success-subtle text-success-text border border-success-border px-2 py-0.5 text-xs font-medium">
                Concluído
              </span>
            )}
            {topic.status === "known" && (
              <span className="rounded-full bg-info-subtle text-info-text border border-info-border px-2 py-0.5 text-xs font-medium">
                Já sei
              </span>
            )}
            {isOverdue && (
              <span className="rounded-full bg-warning-subtle text-warning-text border border-warning-border px-2 py-0.5 text-xs font-medium">
                Revisão pendente
              </span>
            )}
          </div>

          {topic.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{topic.description}</p>
          )}

          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {topic.estimatedMinutes} min
            </span>
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {"★".repeat(topic.complexity)}{"☆".repeat(5 - topic.complexity)}
            </span>
          </div>
        </div>

        {canInteract && (
          <div className="flex gap-1 shrink-0">
            {topic.resourceUrl && ytVideoId && (
              <button
                onClick={() => setShowEmbed(!showEmbed)}
                className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
                title={showEmbed ? "Hide video" : "Play video"}
              >
                <Play className="h-4 w-4" />
              </button>
            )}
            {topic.resourceUrl && !ytVideoId && (
              <a
                href={topic.resourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
                title="Open resource"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            <button
              onClick={() => setShowNotes(!showNotes)}
              className={`rounded p-1.5 hover:bg-muted ${showNotes || topic.notes ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              title="Notes & resource URL"
            >
              <StickyNote className="h-4 w-4" />
            </button>
            {canComplete && (
              <button
                onClick={() => setShowComplete(!showComplete)}
                className={`rounded p-1.5 ${showComplete ? "text-success bg-success-subtle" : "text-muted-foreground hover:text-success hover:bg-success-subtle"}`}
                title="Concluir tópico"
              >
                <CheckCircle className="h-4 w-4" />
              </button>
            )}
            {canComplete && (
              <button
                onClick={handleMarkKnown}
                disabled={markingKnown}
                className="rounded p-1.5 text-muted-foreground hover:text-info hover:bg-info-subtle disabled:opacity-50"
                title="Já sei este tópico (pular estudo, manter revisão)"
              >
                <BookCheck className="h-4 w-4" />
              </button>
            )}
            {canBoost && (
              <button
                onClick={handleReviewBoost}
                disabled={boosting}
                className="rounded p-1.5 text-muted-foreground hover:text-warning hover:bg-warning-subtle disabled:opacity-50"
                title="Precisa de atenção — adiantar próxima revisão para amanhã"
              >
                <BellRing className="h-4 w-4" />
              </button>
            )}
            {canAssess && (
              <button
                onClick={handleRequestAssessment}
                disabled={requestingAssessment}
                className="rounded p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-50"
                title="Solicitar Avaliação"
              >
                <GraduationCap className="h-4 w-4" />
              </button>
            )}
            {topic.status !== "complete" && topic.status !== "in_progress" && topic.status !== "known" && (
              <button
                onClick={toggleSkip}
                className="rounded p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted"
                title={topic.status === "skipped" ? "Unskip" : "Skip"}
              >
                {topic.status === "skipped" ? (
                  <Undo2 className="h-4 w-4" />
                ) : (
                  <SkipForward className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* YouTube embed */}
      {ytVideoId && showEmbed && (
        <div className="mt-3 rounded-md overflow-hidden aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${ytVideoId}?autoplay=1`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      )}

      {ytVideoId && !showEmbed && topic.resourceUrl && (
        <button
          onClick={() => setShowEmbed(true)}
          className="mt-3 relative w-full rounded-md overflow-hidden aspect-video bg-black group"
          title="Play video"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://img.youtube.com/vi/${ytVideoId}/hqdefault.jpg`}
            alt="Video thumbnail"
            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-full bg-black/70 p-3 group-hover:bg-black/90 transition-colors">
              <Play className="h-6 w-6 text-white fill-white" />
            </div>
          </div>
        </button>
      )}

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

      {showComplete && (
        <div className="mt-3 space-y-3 border-t border-success-border pt-3 bg-success-subtle/50 rounded-b-lg -mx-4 -mb-4 px-4 pb-4">
          <p className="text-xs font-medium text-success-text">Registrar conclusão</p>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground block mb-1">Tempo estudado (min)</label>
              <input
                type="number"
                min={1}
                max={480}
                value={completeDuration}
                onChange={(e) => setCompleteDuration(Number(e.target.value))}
                className="w-full rounded border px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-success bg-background text-foreground"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground block mb-1">Confiança (1–5)</label>
              <div className="flex gap-1 mt-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setCompleteConfidence(n)}
                    className={`w-7 h-7 rounded text-xs font-bold transition-colors ${
                      completeConfidence === n
                        ? "bg-success text-success-foreground"
                        : "bg-background border border-border text-muted-foreground hover:border-success"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {completeError && (
            <p className="text-xs text-destructive font-medium">{completeError}</p>
          )}
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowComplete(false); setCompleteError(null); }}
              className="text-xs px-3 py-1 rounded border hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              onClick={handleComplete}
              disabled={completing}
              className="text-xs px-3 py-1.5 rounded bg-success text-success-foreground hover:bg-success/90 disabled:opacity-50 font-medium"
            >
              {completing ? "Salvando…" : "Concluir tópico"}
            </button>
          </div>
        </div>
      )}

      {assessmentData && (
        <AssessmentModal
          data={assessmentData}
          onClose={() => setAssessmentData(null)}
        />
      )}
    </div>
  );
}
