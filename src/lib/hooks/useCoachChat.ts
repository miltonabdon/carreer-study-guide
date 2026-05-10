"use client";

import { useChat } from "ai/react";

export function useCoachChat(topicId?: string) {
  return useChat({
    api: "/api/coach",
    body: { topicId },
    onError: (err) => {
      console.error("Coach chat error:", err);
    },
  });
}
