"use client";

import type { AutomationBlueprint, DiscoverySession } from "@/lib/n8n/types";
import { WorkflowDiagram } from "@/components/WorkflowDiagram";
import { ImpactCard } from "@/components/ImpactCard";
import { LeadForm } from "@/components/LeadForm";

interface Props {
  blueprint: AutomationBlueprint;
  revealMessage: string;
  session: DiscoverySession;
}

export function BlueprintReveal({ blueprint, revealMessage, session }: Props) {
  return (
    <main className="mx-auto w-full max-w-xl px-5 pb-16 pt-6">
      <header className="flex items-center justify-between">
        <span className="font-telemetry">card {session.cardId}</span>
        <span className="font-telemetry">blueprint ready</span>
      </header>

      <section className="reveal-block mt-10" style={{ animationDelay: "0.05s" }}>
        <span className="font-telemetry" style={{ color: "var(--pulse)" }}>
          your automation
        </span>
        <h1 className="font-display mt-2 text-3xl font-bold leading-tight tracking-tight">
          {blueprint.name}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--ink-soft)]">
          {revealMessage}
        </p>
      </section>

      <section className="reveal-block mt-8" style={{ animationDelay: "0.2s" }}>
        <h2 className="font-telemetry">the problem</h2>
        <p className="mt-1.5 text-[15px] leading-relaxed">{blueprint.problem}</p>
      </section>

      <section className="reveal-block mt-8" style={{ animationDelay: "0.35s" }}>
        <h2 className="font-telemetry">how it runs</h2>
        <div className="mt-3">
          <WorkflowDiagram blueprint={blueprint} />
        </div>
      </section>

      <section className="reveal-block mt-8" style={{ animationDelay: "0.5s" }}>
        <h2 className="font-telemetry">inputs it needs</h2>
        <ul className="mt-1.5 flex flex-wrap gap-2">
          {blueprint.inputs.map((input, index) => (
            <li
              key={index}
              className="rounded-full border border-[var(--line)] px-3 py-1 text-sm"
            >
              {input}
            </li>
          ))}
        </ul>
      </section>

      <div className="reveal-block mt-8" style={{ animationDelay: "0.6s" }}>
        <ImpactCard blueprint={blueprint} />
      </div>

      <section className="reveal-block mt-8" style={{ animationDelay: "0.7s" }}>
        <h2 className="font-telemetry">what each tool does</h2>
        <dl className="mt-2 flex flex-col gap-2">
          {blueprint.integrations.map((integration, index) => (
            <div key={index} className="flex gap-3 text-sm">
              <dt className="w-32 shrink-0 font-medium">{integration.name}</dt>
              <dd className="text-[var(--ink-soft)]">{integration.role}</dd>
            </div>
          ))}
        </dl>
      </section>

      {blueprint.assumptions.length > 0 && (
        <section className="reveal-block mt-8" style={{ animationDelay: "0.8s" }}>
          <h2 className="font-telemetry">assumptions</h2>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {blueprint.assumptions.map((assumption, index) => (
              <li
                key={index}
                className="text-sm leading-relaxed text-[var(--ink-soft)]"
              >
                — {assumption}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="reveal-block mt-10" style={{ animationDelay: "0.9s" }}>
        <LeadForm blueprint={blueprint} session={session} />
      </div>
    </main>
  );
}
