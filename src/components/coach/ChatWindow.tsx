"use client";

import { useEffect, useRef } from "react";
import { Brain } from "lucide-react";
import { MessageBubble } from "./MessageBubble";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  onSuggest?: (text: string) => void;
}

export function ChatWindow({ messages, isLoading, onSuggest }: ChatWindowProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.length === 0 && !isLoading && (
        <div className="flex flex-col items-center justify-center h-full gap-6 px-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Brain className="h-7 w-7 text-primary" />
          </div>
          <div className="text-center space-y-1">
            <p className="font-display font-semibold text-base">Seu coach de IA</p>
            <p className="text-sm text-muted-foreground">Tire dúvidas sobre qualquer tópico do seu plano de estudos.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 max-w-sm">
            {[
              "Como funciona o FSRS?",
              "Explique RAG em termos práticos",
              "Diferença entre LoRA e full fine-tuning",
              "Como estruturar um multi-agent system?",
            ].map((q, index) => (
              <button
                key={q}
                onClick={() => onSuggest?.(q)}
                className="text-xs px-3 py-1.5 rounded-full border border-border/80 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5 transition-all animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-250"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.map((msg) => (
        <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
      ))}

      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-muted/80 rounded-xl rounded-bl-sm px-4 py-3">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
