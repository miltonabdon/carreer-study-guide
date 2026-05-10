"use client";

import { useEffect, useState } from "react";
import { ChatWindow } from "@/components/coach/ChatWindow";
import { InputBar } from "@/components/coach/InputBar";
import { useCoachChat } from "@/lib/hooks/useCoachChat";
import { Brain } from "lucide-react";

interface Topic {
  id: string;
  title: string;
  goalTitle: string;
}

export default function CoachPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useCoachChat(
    selectedTopicId || undefined
  );

  useEffect(() => {
    // Fetch active topics from all goals
    fetch("/api/goals")
      .then((r) => r.json())
      .then(async (goals: { id: string; title: string }[]) => {
        const topicPromises = goals.map((g) =>
          fetch(`/api/goals/${g.id}/path`)
            .then((r) => r.json())
            .then((data) =>
              (data.topics ?? [])
                .filter((t: { status: string }) =>
                  ["unlocked", "in_progress", "complete"].includes(t.status)
                )
                .map((t: { id: string; title: string }) => ({
                  id: t.id,
                  title: t.title,
                  goalTitle: g.title,
                }))
            )
            .catch(() => [])
        );
        const nested = await Promise.all(topicPromises);
        setTopics(nested.flat());
      })
      .catch(() => {});
  }, []);

  function onSubmit() {
    handleSubmit(new Event("submit") as unknown as React.FormEvent<HTMLFormElement>);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 border-b px-4 py-3 bg-background">
        <Brain className="h-5 w-5 text-primary" />
        <h1 className="font-semibold">AI Study Coach</h1>

        {topics.length > 0 && (
          <select
            value={selectedTopicId}
            onChange={(e) => setSelectedTopicId(e.target.value)}
            className="ml-auto rounded-md border px-2 py-1 text-sm bg-background max-w-[220px]"
          >
            <option value="">No topic context</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        )}
      </div>

      <ChatWindow
        messages={messages.map((m) => ({ id: m.id, role: m.role as "user" | "assistant", content: m.content }))}
        isLoading={isLoading}
      />

      <InputBar
        value={input}
        onChange={(v) => handleInputChange({ target: { value: v } } as React.ChangeEvent<HTMLInputElement>)}
        onSubmit={onSubmit}
        disabled={isLoading}
      />
    </div>
  );
}
