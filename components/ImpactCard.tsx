import type { AutomationBlueprint } from "@/lib/n8n/types";

const COMPLEXITY_LABEL: Record<AutomationBlueprint["complexity"], string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const DIFFICULTY_LABEL: Record<AutomationBlueprint["difficulty"], string> = {
  easy: "Easy build",
  moderate: "Moderate build",
  hard: "Ambitious build",
};

export function ImpactCard({ blueprint }: { blueprint: AutomationBlueprint }) {
  return (
    <section
      aria-label="Estimated impact"
      className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"
    >
      <span className="font-telemetry">estimated impact</span>

      <p className="font-display mt-2 text-3xl font-bold tracking-tight">
        {blueprint.estimatedHoursSavedPerWeek !== null ? (
          <>
            {blueprint.estimatedHoursSavedPerWeek} hrs/week
            <span className="block text-sm font-medium text-[var(--ink-soft)]">
              potentially saved — estimate, not a measurement
            </span>
          </>
        ) : (
          <span className="text-xl font-semibold">
            Time saved depends on volume
            <span className="block text-sm font-medium text-[var(--ink-soft)]">
              a quick conversation will size it
            </span>
          </span>
        )}
      </p>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="font-telemetry">complexity</dt>
          <dd className="mt-0.5 font-medium">
            {COMPLEXITY_LABEL[blueprint.complexity]}
          </dd>
        </div>
        <div>
          <dt className="font-telemetry">difficulty</dt>
          <dd className="mt-0.5 font-medium">
            {DIFFICULTY_LABEL[blueprint.difficulty]}
          </dd>
        </div>
      </dl>

      <div className="mt-4 border-t border-[var(--line)] pt-3">
        <span className="font-telemetry">recommended stack</span>
        <p className="mt-1 text-sm font-medium">
          {blueprint.integrations.map((i) => i.name).join(" • ")}
        </p>
      </div>
    </section>
  );
}
