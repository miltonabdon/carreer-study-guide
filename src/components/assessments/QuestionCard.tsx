"use client";

import type { AssessmentQuestion } from "@/lib/ai/generate";

interface QuestionCardProps {
  question: AssessmentQuestion & { isCorrect?: boolean };
  selectedAnswer: "a" | "b" | "c" | "d" | null;
  onSelect: (answer: "a" | "b" | "c" | "d") => void;
  revealed: boolean;
  questionIndex: number;
  totalQuestions: number;
}

const OPTIONS = ["a", "b", "c", "d"] as const;

const DIMENSION_LABELS: Record<string, string> = {
  recall: "Memorização",
  application: "Aplicação",
  analysis: "Análise",
};

export function QuestionCard({
  question,
  selectedAnswer,
  onSelect,
  revealed,
  questionIndex,
  totalQuestions,
}: QuestionCardProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {DIMENSION_LABELS[question.dimension] ?? question.dimension}
        </span>
        <span className="text-xs text-muted-foreground">
          {questionIndex + 1} / {totalQuestions}
        </span>
      </div>

      <p className="text-base font-medium leading-relaxed">{question.text}</p>

      <div className="flex flex-col gap-2">
        {OPTIONS.map((opt) => {
          const optText = question.options[opt];
          const isSelected = selectedAnswer === opt;
          const isCorrect = revealed && question.correct === opt;
          const isWrong = revealed && isSelected && !isCorrect;

          let variant = "border-border bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground";
          if (!revealed && isSelected) {
            variant = "border-primary bg-primary/10 text-primary";
          } else if (isCorrect) {
            variant = "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400";
          } else if (isWrong) {
            variant = "border-destructive bg-destructive/10 text-destructive";
          }

          return (
            <button
              key={opt}
              type="button"
              disabled={revealed}
              onClick={() => !revealed && onSelect(opt)}
              className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors cursor-pointer disabled:cursor-default ${variant}`}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs font-semibold uppercase">
                {opt}
              </span>
              <span className="leading-relaxed">{optText}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
