"use client";

import { useState } from "react";
import type { AutomationBlueprint, DiscoverySession } from "@/lib/n8n/types";
import { blueprintToMarkdown } from "@/lib/blueprint-markdown";

interface Props {
  blueprint: AutomationBlueprint;
  session: DiscoverySession;
}

type SendState = "idle" | "sending" | "sent" | "error";

export function LeadForm({ blueprint, session }: Props) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [sendState, setSendState] = useState<SendState>("idle");
  const [copied, setCopied] = useState(false);
  const [buildState, setBuildState] = useState<
    "idle" | "confirming" | "requested"
  >("idle");

  const submitLead = async (event: React.FormEvent) => {
    event.preventDefault();
    setSendState("sending");
    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session,
          firstName,
          email,
          blueprintName: blueprint.name,
          action: "send-blueprint",
        }),
      });
      if (!response.ok) throw new Error();
      setSendState("sent");
    } catch {
      setSendState("error");
    }
  };

  const copyBlueprint = async () => {
    try {
      await navigator.clipboard.writeText(blueprintToMarkdown(blueprint));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard unavailable (permissions / http) — leave button as-is.
    }
  };

  const requestBuild = async () => {
    // Explicit confirmation gate: a build request records interest only —
    // it never creates or activates workflows.
    setBuildState("requested");
    await fetch("/api/lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session,
        firstName: firstName || "Not provided",
        email: email || "pending@follow.up",
        blueprintName: blueprint.name,
        action: "build-request",
      }),
    }).catch(() => undefined);
  };

  return (
    <section aria-label="Keep this automation" className="flex flex-col gap-4">
      {sendState === "sent" ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5 text-sm">
          <p className="font-display font-semibold">Blueprint on its way.</p>
          <p className="mt-1 text-[var(--ink-soft)]">
            Check {email} shortly. The estimate figures stay estimates until we
            see your real volumes.
          </p>
        </div>
      ) : (
        <form
          onSubmit={submitLead}
          className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"
        >
          <p className="font-display text-sm font-semibold tracking-wide">
            SEND THIS AUTOMATION TO ME
          </p>
          <div className="mt-3 flex flex-col gap-2.5">
            <label htmlFor="lead-name" className="sr-only">
              First name
            </label>
            <input
              id="lead-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              maxLength={80}
              placeholder="First name"
              autoComplete="given-name"
              className="rounded-xl border border-[var(--line-strong)] bg-[var(--paper)] px-4 py-3 text-sm focus:border-[var(--pulse)] focus:outline-none"
            />
            <label htmlFor="lead-email" className="sr-only">
              Email
            </label>
            <input
              id="lead-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={200}
              placeholder="Email"
              autoComplete="email"
              className="rounded-xl border border-[var(--line-strong)] bg-[var(--paper)] px-4 py-3 text-sm focus:border-[var(--pulse)] focus:outline-none"
            />
          </div>
          {sendState === "error" && (
            <p className="mt-2 text-sm text-[var(--pulse)]">
              That didn&rsquo;t go through. Check the email address and try
              again.
            </p>
          )}
          <button
            type="submit"
            disabled={sendState === "sending"}
            className="mt-3 w-full rounded-full bg-[var(--pulse)] py-3 font-display text-sm font-semibold text-white transition-opacity disabled:opacity-50"
          >
            {sendState === "sending" ? "Sending…" : "Send it to me"}
          </button>
        </form>
      )}

      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={copyBlueprint}
          className="flex-1 rounded-full border border-[var(--line-strong)] py-3 text-sm font-medium transition-colors hover:border-[var(--pulse)] hover:text-[var(--pulse)]"
        >
          {copied ? "Copied" : "Copy blueprint"}
        </button>

        {buildState === "requested" ? (
          <span className="flex flex-1 items-center justify-center rounded-full border border-[var(--line)] py-3 text-center text-sm text-[var(--ink-soft)]">
            Request noted — we&rsquo;ll follow up
          </span>
        ) : buildState === "confirming" ? (
          <button
            type="button"
            onClick={requestBuild}
            className="flex-1 rounded-full border border-[var(--pulse)] py-3 text-sm font-semibold text-[var(--pulse)]"
          >
            Confirm request
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setBuildState("confirming")}
            className="flex-1 rounded-full border border-[var(--line-strong)] py-3 text-sm font-medium transition-colors hover:border-[var(--pulse)] hover:text-[var(--pulse)]"
          >
            Build this for me
          </button>
        )}
      </div>
      {buildState === "confirming" && (
        <p className="text-xs leading-relaxed text-[var(--ink-soft)]">
          This sends a build request with your blueprint attached. Nothing is
          created or switched on until a human designs it with you.
        </p>
      )}
    </section>
  );
}
