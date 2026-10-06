import type { AutomationBlueprint, StepKind } from "@/lib/n8n/types";

const KIND_META: Record<
  StepKind,
  { label: string; dot: string; chip: string }
> = {
  deterministic: {
    label: "Workflow step",
    dot: "bg-[var(--ink-soft)]",
    chip: "text-[var(--ink-soft)] border-[var(--line)]",
  },
  ai: {
    label: "AI reasoning",
    dot: "bg-[var(--pulse)]",
    chip: "text-[var(--pulse)] border-[var(--pulse)]/40 bg-[var(--pulse-soft)]",
  },
  human: {
    label: "Human approval",
    dot: "bg-[var(--human)]",
    chip: "text-[var(--human)] border-[var(--human)]/40 bg-[var(--human-soft)]",
  },
};

/**
 * The visual climax: the blueprint rendered as a vertical n8n-style flow.
 * The spine and node connectors reuse the NFC arc language — the tap
 * literally becomes the workflow.
 */
export function WorkflowDiagram({ blueprint }: { blueprint: AutomationBlueprint }) {
  return (
    <figure aria-label={`Workflow diagram for ${blueprint.name}`}>
      <div className="relative">
        <div
          className="diagram-spine absolute bottom-4 left-[11px] top-4 w-px bg-[var(--line-strong)]"
          aria-hidden="true"
        />
        <ol className="flex flex-col gap-4">
          <li className="relative flex items-start gap-4">
            <span
              className="relative z-10 mt-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--pulse)] bg-[var(--paper)]"
              aria-hidden="true"
            >
              <span className="h-2 w-2 rounded-full bg-[var(--pulse)]" />
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <span className="font-telemetry">trigger</span>
              <p className="mt-0.5 font-display text-[15px] font-semibold leading-snug">
                {blueprint.trigger}
              </p>
            </div>
          </li>

          {blueprint.steps.map((step, index) => {
            const meta = KIND_META[step.kind];
            return (
              <li key={index} className="relative flex items-start gap-4">
                <span
                  className="relative z-10 mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--paper)]"
                  aria-hidden="true"
                >
                  <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                </span>
                <div className="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-display text-[15px] font-semibold leading-snug">
                      {step.title}
                    </h4>
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${meta.chip}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--ink-soft)]">
                    {step.description}
                  </p>
                </div>
              </li>
            );
          })}

          {blueprint.exceptions.length > 0 && (
            <li className="relative flex items-start gap-4">
              <span
                className="relative z-10 mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--paper)]"
                aria-hidden="true"
              >
                <span className="h-2.5 w-2.5 rotate-45 bg-[var(--human)]" />
              </span>
              <div className="min-w-0 flex-1 rounded-xl border border-dashed border-[var(--human)]/50 p-4">
                <span className="font-telemetry" style={{ color: "var(--human)" }}>
                  exception path
                </span>
                <ul className="mt-1.5 flex flex-col gap-1.5">
                  {blueprint.exceptions.map((exception, index) => (
                    <li
                      key={index}
                      className="text-sm leading-relaxed text-[var(--ink-soft)]"
                    >
                      {exception}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          )}

          <li className="relative flex items-start gap-4">
            <span
              className="relative z-10 mt-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[var(--ok,#2c7a4b)] bg-[var(--paper)]"
              aria-hidden="true"
            >
              <span className="h-2 w-2 rounded-full bg-[var(--ok,#2c7a4b)]" />
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <span className="font-telemetry">output</span>
              <p className="mt-0.5 text-sm leading-relaxed">
                {blueprint.outputs.join(" · ")}
              </p>
            </div>
          </li>
        </ol>
      </div>

      <figcaption className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
        {(Object.keys(KIND_META) as StepKind[]).map((kind) => (
          <span key={kind} className="flex items-center gap-1.5 text-[11px] text-[var(--ink-soft)]">
            <span className={`h-2 w-2 rounded-full ${KIND_META[kind].dot}`} />
            {KIND_META[kind].label}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
