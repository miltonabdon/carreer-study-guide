"use client";

import { useState } from "react";
import { Clock, BookOpen, RotateCcw, CheckCircle2, SkipForward } from "lucide-react";

interface PlanTask {
  id: string;
  topicId: string;
  taskType: "new_learning" | "review";
  suggestedMinutes: number;
  orderIndex: number;
  status: "pending" | "completed" | "skipped";
  topicTitle: string;
  topicDescription: string | null;
  topicNextReviewAt: string | null;
  goalTitle: string;
}

interface TaskItemProps {
  task: PlanTask;
  onComplete: (taskId: string, data: { status: "completed" | "skipped"; durationMinutes?: number; confidenceRating?: number; notes?: string }) => Promise<void>;
}

export function TaskItem({ task, onComplete }: TaskItemProps) {
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isOverdue =
    task.taskType === "review" &&
    task.topicNextReviewAt &&
    new Date(task.topicNextReviewAt) < new Date();

  async function handleComplete() {
    if (rating === 0) return;
    setSubmitting(true);
    await onComplete(task.id, {
      status: "completed",
      durationMinutes: task.suggestedMinutes,
      confidenceRating: rating,
      notes: notes || undefined,
    });
    setSubmitting(false);
    setShowRating(false);
  }

  async function handleSkip() {
    setSubmitting(true);
    await onComplete(task.id, { status: "skipped" });
    setSubmitting(false);
  }

  if (task.status !== "pending") {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3 text-muted-foreground">
        {task.status === "completed" ? (
          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
        ) : (
          <SkipForward className="h-4 w-4 shrink-0" />
        )}
        <span className="text-sm line-through">{task.topicTitle}</span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">
          {task.taskType === "review" ? (
            <RotateCcw className="h-4 w-4 text-blue-500" />
          ) : (
            <BookOpen className="h-4 w-4 text-primary" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm">{task.topicTitle}</p>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                task.taskType === "review"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {task.taskType === "review" ? "Review" : "New"}
            </span>
            {isOverdue && (
              <span className="rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-xs font-medium">
                Overdue
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-0.5">{task.goalTitle}</p>

          <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {task.suggestedMinutes} min suggested
          </div>
        </div>

        {!showRating && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleSkip}
              disabled={submitting}
              className="rounded px-2.5 py-1.5 text-xs border hover:bg-muted disabled:opacity-50"
            >
              Skip
            </button>
            <button
              onClick={() => setShowRating(true)}
              className="rounded px-2.5 py-1.5 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Complete
            </button>
          </div>
        )}
      </div>

      {showRating && (
        <div className="mt-4 border-t pt-3 space-y-3">
          <p className="text-sm font-medium">How confident do you feel?</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((r) => (
              <button
                key={r}
                onClick={() => setRating(r)}
                className={`flex-1 rounded py-2 text-sm font-medium border transition-colors ${
                  rating === r
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-muted"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            1 = Forgot · 3 = Remembered · 5 = Perfect recall
          </p>

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes…"
            rows={2}
            className="w-full rounded border px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowRating(false); setRating(0); }}
              className="text-xs px-3 py-1.5 rounded border hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleComplete}
              disabled={rating === 0 || submitting}
              className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Submit"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
