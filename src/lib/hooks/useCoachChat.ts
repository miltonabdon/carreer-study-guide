"use client";

import { useChat } from "ai/react";
import type { Message } from "ai/react";

export function useCoachChat(topicId?: string, initialMessages?: Message[]) {
  return useChat({
    api: "/api/coach",
    body: { topicId },
    initialMessages,
    onError: (err) => {
      console.error("Coach chat error:", err);
    },
  });
}
