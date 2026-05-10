"use client";

import { useState, useRef, useEffect } from "react";
import { TaskItem } from "./TaskItem";
import { Brain, Pencil, Check, X } from "lucide-react";

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

interface DailyPlanCardProps {
  plan: {
    id: string;
    planDate: string;
    availableMinutes: number;
    aiRationale: string | null;
    completionPercent: number;
    tasks: PlanTask[];
  };
  onTaskComplete: (taskId: string, data: { status: "completed" | "skipped"; durationMinutes?: number; confidenceRating?: number; notes?: string }) => Promise<void>;
  onRegenerate?: (minutes: number) => Promise<void>;
}

export function DailyPlanCard({ plan, onTaskComplete, onRegenerate }: DailyPlanCardProps) {
  const [editingMinutes, setEditingMinutes] = useState(false);
  const [minutesInput, setMinutesInput] = useState(String(plan.availableMinutes));
  const [regenerating, setRegenerating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const completed = plan.tasks.filter((t) => t.status === "completed").length;
  const total = plan.tasks.length;

  const date = new Date(plan.planDate + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  useEffect(() => {
    if (editingMinutes) inputRef.current?.focus();
  }, [editingMinutes]);

  async function confirmMinutes() {
    const parsed = parseInt(minutesInput, 10);
    if (!onRegenerate || isNaN(parsed) || parsed < 5 || parsed > 480) {
      setEditingMinutes(false);
      setMinutesInput(String(plan.availableMinutes));
      return;
    }
    if (parsed === plan.availableMinutes) {
      setEditingMinutes(false);
      return;
    }
    setRegenerating(true);
    setEditingMinutes(false);
    await onRegenerate(parsed);
    setRegenerating(false);
  }

  function cancelEdit() {
    setEditingMinutes(false);
    setMinutesInput(String(plan.availableMinutes));
  }

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Today&apos;s Plan</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{date}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium">{completed}/{total} tasks</p>

            {/* Editable minutes */}
            {editingMinutes ? (
              <div className="flex items-center gap-1 mt-0.5 justify-end">
                <input
                  ref={inputRef}
                  type="number"
                  min={5}
                  max={480}
                  value={minutesInput}
                  onChange={(e) => setMinutesInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") confirmMinutes(); if (e.key === "Escape") cancelEdit(); }}
                  className="w-16 text-xs border rounded px-1.5 py-0.5 text-right bg-background"
                />
                <span className="text-xs text-muted-foreground">min</span>
                <button onClick={confirmMinutes} className="p-0.5 text-green-600 hover:text-green-700">
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button onClick={cancelEdit} className="p-0.5 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setMinutesInput(String(plan.availableMinutes)); setEditingMinutes(true); }}
                disabled={regenerating}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-0.5 ml-auto disabled:opacity-50"
                title="Adjust today's available time"
              >
                {regenerating ? "Updating…" : `${plan.availableMinutes} min available`}
                {!regenerating && onRegenerate && <Pencil className="h-3 w-3" />}
              </button>
            )}
          </div>
        </div>

        {total > 0 && (
          <div className="mt-3">
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${plan.completionPercent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tasks */}
      <div className="p-4 space-y-3">
        {plan.tasks.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p className="text-sm">No tasks for today.</p>
            <p className="text-xs mt-1">Create a learning goal to get started.</p>
          </div>
        ) : (
          plan.tasks.map((task) => (
            <TaskItem key={task.id} task={task} onComplete={onTaskComplete} />
          ))
        )}
      </div>

      {/* AI Rationale */}
      {plan.aiRationale && (
        <div className="px-4 pb-4">
          <div className="flex items-start gap-2 rounded-md bg-muted/50 px-3 py-2.5">
            <Brain className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">{plan.aiRationale}</p>
          </div>
        </div>
      )}
    </div>
  );
}
