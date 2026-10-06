"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentTurn, QuickReply } from "@/lib/n8n/types";

interface Props {
  turns: AgentTurn[];
  quickReplies: QuickReply[];
  thinking: boolean;
  error: string | null;
  onSend: (message: string) => void;
  onRetry: () => void;
}

export function Conversation({
  turns,
  quickReplies,
  thinking,
  error,
  onSend,
  onRetry,
}: Props) {
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, thinking, error]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    onSend(draft);
    setDraft("");
  };

  return (
    <section
      className="flex flex-1 flex-col pt-8"
      aria-label="Conversation with the automation discovery agent"
    >
      <ol className="flex flex-1 flex-col gap-5" aria-live="polite">
        {turns.map((turn, index) => (
          <li
            key={index}
            className={turn.role === "user" ? "flex justify-end" : "flex"}
          >
            {turn.role === "user" ? (
              <p className="max-w-[85%] rounded-2xl rounded-br-md bg-[var(--pulse-soft)] px-4 py-3 text-[15px] leading-relaxed">
                {turn.content}
              </p>
            ) : (
              <div className="max-w-[92%]">
                <span className="font-telemetry">agent</span>
                <p className="mt-1 text-[15px] leading-relaxed">
                  {turn.content}
                </p>
              </div>
            )}
          </li>
        ))}

        {thinking && (
          <li aria-label="The agent is thinking">
            <span className="font-telemetry">agent</span>
            <span className="arc-beat mt-1 flex items-center gap-1 text-[var(--pulse)]">
              <span className="text-lg leading-none">)</span>
              <span className="text-lg leading-none">)</span>
              <span className="text-lg leading-none">)</span>
            </span>
          </li>
        )}

        {error && (
          <li>
            <div className="rounded-xl border border-[var(--line-strong)] bg-[var(--surface)] p-4 text-sm">
              <p>{error}</p>
              <button
                type="button"
                onClick={onRetry}
                className="mt-2 font-medium text-[var(--pulse)] underline-offset-4 hover:underline"
              >
                Try again
              </button>
            </div>
          </li>
        )}
        <div ref={endRef} />
      </ol>

      {quickReplies.length > 0 && !thinking && (
        <div className="mt-4 flex flex-wrap gap-2">
          {quickReplies.map((reply) => (
            <button
              key={reply.value}
              type="button"
              onClick={() => onSend(reply.value)}
              className="rounded-full border border-[var(--line-strong)] px-4 py-2 text-sm transition-colors hover:border-[var(--pulse)] hover:text-[var(--pulse)]"
            >
              {reply.label}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="sticky bottom-0 mt-5 bg-[var(--paper)] pb-2 pt-2">
        <div className="flex items-end gap-2">
          <label htmlFor="composer" className="sr-only">
            Your answer
          </label>
          <textarea
            id="composer"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            rows={1}
            placeholder="Type your answer…"
            disabled={thinking}
            className="max-h-32 min-h-[52px] flex-1 resize-none rounded-2xl border border-[var(--line-strong)] bg-[var(--surface)] px-4 py-3.5 text-[15px] leading-snug placeholder:text-[var(--ink-soft)]/60 focus:border-[var(--pulse)] focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={thinking || !draft.trim()}
            aria-label="Send answer"
            className="h-[52px] rounded-full bg-[var(--pulse)] px-5 font-display text-sm font-semibold text-white transition-opacity disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </form>
    </section>
  );
}
