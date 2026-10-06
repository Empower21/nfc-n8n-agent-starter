import type { AutomationBlueprint } from "@/lib/n8n/types";

const KIND_LABEL: Record<string, string> = {
  deterministic: "Workflow step",
  ai: "AI reasoning",
  human: "Human approval",
};

/** Render a blueprint as shareable markdown for COPY BLUEPRINT. */
export function blueprintToMarkdown(blueprint: AutomationBlueprint): string {
  const lines: string[] = [
    `# ${blueprint.name}`,
    "",
    `**Problem:** ${blueprint.problem}`,
    "",
    `**Trigger:** ${blueprint.trigger}`,
    "",
    "## Inputs",
    ...blueprint.inputs.map((input) => `- ${input}`),
    "",
    "## Steps",
    ...blueprint.steps.map(
      (step, index) =>
        `${index + 1}. **${step.title}** _(${KIND_LABEL[step.kind]})_ — ${step.description}`
    ),
    "",
    "## Recommended stack",
    ...blueprint.integrations.map((i) => `- **${i.name}** — ${i.role}`),
    "",
    "## Exception handling",
    ...(blueprint.exceptions.length
      ? blueprint.exceptions.map((e) => `- ${e}`)
      : ["- None identified yet"]),
    "",
    "## Outputs",
    ...blueprint.outputs.map((o) => `- ${o}`),
    "",
    `**Complexity:** ${blueprint.complexity} · **Build difficulty:** ${blueprint.difficulty}`,
    blueprint.estimatedHoursSavedPerWeek !== null
      ? `**Estimated time saved:** ~${blueprint.estimatedHoursSavedPerWeek} hrs/week (estimate)`
      : "**Estimated time saved:** needs a quick volume conversation",
    "",
    "## Assumptions",
    ...(blueprint.assumptions.length
      ? blueprint.assumptions.map((a) => `- ${a}`)
      : ["- None recorded"]),
    "",
    "_Designed by the Tap to Automate n8n Agent. Figures are estimates, not measurements._",
  ];
  return lines.join("\n");
}
