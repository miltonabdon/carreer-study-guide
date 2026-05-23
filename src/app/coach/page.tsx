"use client";

import { useEffect, useState } from "react";
import type { Message } from "ai/react";
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
  const [initialMessages, setInitialMessages] = useState<Message[] | undefined>(undefined);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Load persisted conversation history on mount
  useEffect(() => {
    fetch("/api/coach/history")
      .then((r) => r.json())
      .then((data: { messages: { id: string; role: string; content: string; createdAt: string }[] }) => {
        const msgs: Message[] = (data.messages ?? []).map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          createdAt: new Date(m.createdAt),
        }));
        setInitialMessages(msgs);
      })
      .catch(() => setInitialMessages([]))
      .finally(() => setHistoryLoaded(true));
  }, []);

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useCoachChat(
    selectedTopicId || undefined,
    initialMessages
  );

  useEffect(() => {
    fetch("/api/goals")
      .then((r) => r.json())
      .then(async (goalsData: { goals?: { id: string; title: string }[] } | { id: string; title: string }[]) => {
        const goals = Array.isArray(goalsData) ? goalsData : (goalsData.goals ?? []);
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

  if (!historyLoaded) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <p className="text-muted-foreground text-sm">Carregando conversa…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <Brain className="h-4 w-4 text-primary" />
        </div>
        <h1 className="font-display font-semibold text-sm">Coach IA</h1>

        {topics.length > 0 && (
          <select
            value={selectedTopicId}
            onChange={(e) => setSelectedTopicId(e.target.value)}
            className="ml-auto border-0 bg-muted rounded-lg px-3 py-1.5 text-sm max-w-[220px]"
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
        onSuggest={(q) => {
          handleInputChange({ target: { value: q } } as React.ChangeEvent<HTMLInputElement>);
        }}
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
