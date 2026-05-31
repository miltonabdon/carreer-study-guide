"use client";

import { useState } from "react";
import { X, CheckCircle, AlertTriangle, Loader2, ChevronRight } from "lucide-react";
import { QuestionCard } from "./QuestionCard";
import type { AssessmentQuestion } from "@/lib/ai/generate";

interface AssessmentData {
  assessmentId: string;
  topicTitle: string;
  generatedAt?: string;
  alreadyGeneratedToday?: boolean;
  submittedAt?: string | null;
  score?: number | null;
  questions: Array<
    Omit<AssessmentQuestion, "correct"> & {
      correct?: string;
      isCorrect?: boolean;
    }
  >;
}

interface AssessmentModalProps {
  data: AssessmentData;
  onClose: () => void;
}

export function AssessmentModal({ data, onClose }: AssessmentModalProps) {
  const alreadySubmitted = data.submittedAt !== null && data.submittedAt !== undefined;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, "a" | "b" | "c" | "d">>(() => {
    if (alreadySubmitted) {
      return Object.fromEntries(
        data.questions.flatMap((q) => (q.userAnswer ? [[q.id, q.userAnswer]] : []))
      );
    }
    return {};
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    reinforcementNeeded: boolean;
    fsrsAction: string;
    questions: Array<AssessmentQuestion & { isCorrect: boolean }>;
  } | null>(
    alreadySubmitted && data.score !== null && data.score !== undefined
      ? {
          score: data.score,
          reinforcementNeeded: data.score < 50,
          fsrsAction: "",
          questions: data.questions as Array<AssessmentQuestion & { isCorrect: boolean }>,
        }
      : null
  );

  const questions = data.questions as AssessmentQuestion[];
  const currentQuestion = questions[currentIndex];
  const selectedAnswer = answers[currentQuestion?.id] ?? null;
  const isLastQuestion = currentIndex === questions.length - 1;

  function handleSelect(answer: "a" | "b" | "c" | "d") {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: answer }));
  }

  function handleNext() {
    if (isLastQuestion) {
      handleSubmit();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/assessments/${data.assessmentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: Object.entries(answers).map(([questionId, answer]) => ({
            questionId,
            answer,
          })),
        }),
      });

      const json = await res.json();
      if (res.ok || res.status === 409) {
        setResult({
          score: json.score,
          reinforcementNeeded: json.reinforcementNeeded ?? json.score < 50,
          fsrsAction: json.fsrsAction ?? "",
          questions: json.questions,
        });
      }
    } catch {
      // silent — user can retry
    } finally {
      setSubmitting(false);
    }
  }

  const canAdvance = selectedAnswer !== null && !result;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-xl border bg-card shadow-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-5 py-4 shrink-0">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Avaliação de Conhecimento
            </p>
            <h2 className="text-sm font-semibold mt-0.5 line-clamp-1">{data.topicTitle}</h2>
            {data.alreadyGeneratedToday && data.generatedAt && (
              <p className="text-xs text-muted-foreground mt-0.5">{data.generatedAt}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {result ? (
            <div className="flex flex-col gap-5">
              {/* Score header */}
              <div className="flex flex-col items-center gap-2 py-4">
                {result.reinforcementNeeded ? (
                  <AlertTriangle className="h-8 w-8 text-amber-500" />
                ) : (
                  <CheckCircle className="h-8 w-8 text-green-500" />
                )}
                <p className="text-3xl font-bold">{result.score}%</p>
                {result.reinforcementNeeded ? (
                  <span className="rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-3 py-0.5 text-xs font-medium">
                    Revisão reforçada agendada
                  </span>
                ) : (
                  <span className="rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-3 py-0.5 text-xs font-medium">
                    {result.fsrsAction === "extended" ? "Próxima revisão estendida" : "Revisão mantida"}
                  </span>
                )}
              </div>

              {/* Question review */}
              <div className="flex flex-col gap-4">
                {result.questions.map((q, i) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    selectedAnswer={q.userAnswer ?? null}
                    onSelect={() => {}}
                    revealed
                    questionIndex={i}
                    totalQuestions={result.questions.length}
                  />
                ))}
              </div>
            </div>
          ) : (
            <QuestionCard
              question={currentQuestion}
              selectedAnswer={selectedAnswer}
              onSelect={handleSelect}
              revealed={false}
              questionIndex={currentIndex}
              totalQuestions={questions.length}
            />
          )}
        </div>

        {/* Footer */}
        {!result && (
          <div className="border-t px-5 py-4 shrink-0">
            <button
              onClick={handleNext}
              disabled={!canAdvance || submitting}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-2.5 text-sm font-medium transition-opacity disabled:opacity-40"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {isLastQuestion ? "Enviar" : "Confirmar Resposta"}
                  {!isLastQuestion && <ChevronRight className="h-4 w-4" />}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
