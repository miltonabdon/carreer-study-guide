"use client";

import { TopicNode } from "./TopicNode";

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

interface PathTimelineProps {
  topics: Topic[];
  onTopicUpdate: (topicId: string, data: Partial<Pick<Topic, "status" | "resourceUrl" | "notes">>) => void;
  onTopicComplete?: () => void;
}

export function PathTimeline({ topics, onTopicUpdate, onTopicComplete }: PathTimelineProps) {
  const ordered = [...topics].sort((a, b) => a.orderIndex - b.orderIndex);

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[1.1rem] top-6 bottom-6 w-px bg-border" />

      <div className="space-y-3 pl-10">
        {ordered.map((topic) => (
          <div key={topic.id} className="relative">
            {/* Dot */}
            <div
              className={`absolute -left-[2.35rem] top-4 h-3 w-3 rounded-full border-2 border-background ring-2 z-10 ${
                topic.status === "complete"
                  ? "bg-success ring-success"
                  : topic.status === "known"
                    ? "bg-info ring-info"
                    : topic.status === "in_progress"
                      ? "bg-primary ring-primary"
                      : topic.status === "unlocked"
                        ? "bg-primary/50 ring-primary/50"
                        : topic.status === "skipped"
                          ? "bg-muted-foreground ring-muted-foreground"
                          : "bg-muted ring-muted-foreground/30"
              }`}
            />
            <TopicNode topic={topic} onUpdate={onTopicUpdate} onComplete={onTopicComplete} />
          </div>
        ))}
      </div>
    </div>
  );
}
