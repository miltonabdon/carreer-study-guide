"use client";

import { useRef, KeyboardEvent, ChangeEvent } from "react";
import { Send } from "lucide-react";

interface InputBarProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}

export function InputBar({ value, onChange, onSubmit, disabled }: InputBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && value.trim()) onSubmit();
    }
  }

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    onChange(e.target.value);
    // Auto-resize
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
    }
  }

  return (
    <div className="border-t bg-background p-3">
      <div className="flex items-end gap-2 rounded-lg border bg-muted/30 px-3 py-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Ask your coach… (Enter to send, Shift+Enter for newline)"
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm focus:outline-none disabled:opacity-50 min-h-[24px] max-h-40"
        />
        <button
          onClick={() => value.trim() && onSubmit()}
          disabled={disabled || !value.trim()}
          className="shrink-0 rounded-md bg-primary p-1.5 text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
      <p className="text-xs text-muted-foreground mt-1 text-center">
        Shift+Enter for new line
      </p>
    </div>
  );
}
