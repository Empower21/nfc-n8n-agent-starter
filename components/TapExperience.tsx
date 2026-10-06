"use client";

import { useCallback, useRef, useState } from "react";
import type {
  AgentResponse,
  AgentTurn,
  AutomationBlueprint,
  DiscoverySession,
  QuickReply,
} from "@/lib/n8n/types";
import { getOrCreateSession } from "@/lib/session";
import { NfcPulse } from "@/components/NfcPulse";
import { Conversation } from "@/components/Conversation";
import { BlueprintReveal } from "@/components/BlueprintReveal";

type Phase = "entry" | "chat" | "reveal";

interface Props {
  cardId: string;
  cardMissing: boolean;
  source?: string;
  campaign?: string;
}

const MIN_THINK_MS = 900;

export function TapExperience({ cardId, cardMissing, source, campaign }: Props) {
  const sessionRef = useRef<DiscoverySession | null>(null);
  const getSession = useCallback((): DiscoverySession => {
    // Lazy client-side init: only ever called from event handlers, so
    // sessionStorage/crypto are safe and SSR never sees a session.
    if (!sessionRef.current) {
      sessionRef.current = getOrCreateSession({ cardId, source, campaign });
    }
    return sessionRef.current;
  }, [cardId, source, campaign]);
  const [phase, setPhase] = useState<Phase>("entry");
  const [session, setSession] = useState<DiscoverySession | null>(null);
  const [task, setTask] = useState("");
  const [turns, setTurns] = useState<AgentTurn[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blueprint, setBlueprint] = useState<AutomationBlueprint | null>(null);
  const [revealMessage, setRevealMessage] = useState("");
  const lastMessageRef = useRef<string | null>(null);

  const callAgent = useCallback(
    async (message: string, history: AgentTurn[]) => {
      const session = getSession();
      setThinking(true);
      setError(null);
      setQuickReplies([]);
      lastMessageRef.current = message;

      const started = Date.now();
      try {
        const response = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session, history, message }),
        });

        // Keep a natural thinking rhythm even when the engine is instant.
        const elapsed = Date.now() - started;
        if (elapsed < MIN_THINK_MS) {
          await new Promise((r) => setTimeout(r, MIN_THINK_MS - elapsed));
        }

        if (!response.ok) {
          const data = await response.json().catch(() => null);
          throw new Error(
            data?.error ?? "The Agent could not be reached. Try again."
          );
        }

        const data = (await response.json()) as AgentResponse;

        if (data.status === "blueprint" && data.blueprint) {
          setTurns((prev) => [...prev, { role: "agent", content: data.message }]);
          setRevealMessage(data.message);
          setBlueprint(data.blueprint);
          // Let the final agent line land before the reveal takes over.
          setTimeout(() => setPhase("reveal"), 1400);
        } else {
          setTurns((prev) => [...prev, { role: "agent", content: data.message }]);
          setQuickReplies(data.quickReplies ?? []);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "The Agent could not be reached. Try again."
        );
      } finally {
        setThinking(false);
      }
    },
    [getSession]
  );

  const sendMessage = useCallback(
    (message: string) => {
      const trimmed = message.trim();
      if (!trimmed || thinking) return;
      const history = turns;
      setTurns((prev) => [...prev, { role: "user", content: trimmed }]);
      void callAgent(trimmed, history);
    },
    [turns, thinking, callAgent]
  );

  const retry = useCallback(() => {
    if (!lastMessageRef.current) return;
    // The failed user turn is already displayed; re-send with history
    // excluding it so the server sees the same conversation position.
    void callAgent(lastMessageRef.current, turns.slice(0, -1));
  }, [turns, callAgent]);

  const beginDiscovery = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = task.trim();
    if (trimmed.length < 8) return;
    setSession(getSession());
    setPhase("chat");
    setTurns([{ role: "user", content: trimmed }]);
    void callAgent(trimmed, []);
  };

  if (phase === "reveal" && blueprint && session) {
    return (
      <BlueprintReveal
        blueprint={blueprint}
        revealMessage={revealMessage}
        session={session}
      />
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-5 pb-10 pt-6">
      <header className="flex items-center justify-between">
        <span className="font-telemetry">
          card {cardId}
          {cardMissing ? " · preview" : " · nfc link active"}
        </span>
        <span className="font-telemetry">n8n agent</span>
      </header>

      {phase === "entry" ? (
        <section className="flex flex-1 flex-col justify-center py-10">
          <div className="rise rise-1">
            <NfcPulse />
          </div>
          <h1 className="rise rise-2 font-display mt-8 text-[2.6rem] font-bold leading-[1.05] tracking-tight">
            TAP TO
            <br />
            AUTOMATE
          </h1>
          <p className="rise rise-3 font-display mt-5 text-lg font-medium text-[var(--ink)]">
            What&rsquo;s one thing you hate doing repeatedly?
          </p>
          <p className="rise rise-3 mt-2 max-w-md text-sm leading-relaxed text-[var(--ink-soft)]">
            Tell my n8n Agent what wastes your time. It will design an
            automation for you.
          </p>

          <form onSubmit={beginDiscovery} className="rise rise-4 mt-8">
            <label htmlFor="task" className="sr-only">
              Describe the repetitive task
            </label>
            <textarea
              id="task"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              rows={3}
              minLength={8}
              required
              placeholder="Every morning I copy customer enquiries from email into a spreadsheet…"
              className="w-full resize-none rounded-2xl border border-[var(--line-strong)] bg-[var(--surface)] p-4 text-base leading-relaxed placeholder:text-[var(--ink-soft)]/60 focus:border-[var(--pulse)] focus:outline-none"
            />
            <button
              type="submit"
              disabled={task.trim().length < 8}
              className="mt-4 w-full rounded-full bg-[var(--pulse)] px-6 py-4 font-display text-base font-semibold tracking-wide text-white transition-opacity disabled:opacity-40"
            >
              AUTOMATE IT →
            </button>
          </form>
        </section>
      ) : (
        <Conversation
          turns={turns}
          quickReplies={quickReplies}
          thinking={thinking}
          error={error}
          onSend={sendMessage}
          onRetry={retry}
        />
      )}
    </main>
  );
}
