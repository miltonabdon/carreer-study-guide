"use client";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-200 ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-primary text-primary-foreground rounded-xl rounded-br-sm"
            : "bg-muted text-foreground rounded-xl rounded-bl-sm"
        }`}
      >
        {content}
      </div>
    </div>
  );
}
