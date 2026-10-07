import { codeNodeSource } from "../../scripts/build-n8n-templates.mjs";

export type Json = Record<string, unknown>;

/**
 * Run an n8n Code node body (top-level return, `$input`, `$('Node')`) with a
 * single input item, the way n8n executes "Run Once for All Items".
 */
export function runCodeNode(file: string, input: Json, nodes: Record<string, Json> = {}): Json {
  const run = new Function("$input", "$", "Buffer", codeNodeSource(file)) as (
    input: unknown,
    lookup: unknown,
    buffer: typeof Buffer
  ) => { json: Json }[];
  const lookup = (name: string) => {
    if (!(name in nodes)) throw new Error(`Unexpected node lookup: ${name}`);
    return { first: () => ({ json: nodes[name] }) };
  };
  const out = run({ first: () => ({ json: input }), all: () => [{ json: input }] }, lookup, Buffer);
  if (!Array.isArray(out) || out.length !== 1) throw new Error(`${file} must return exactly one item`);
  return out[0].json;
}

export const SAMPLE_BLUEPRINT = {
  name: "Email enquiries to Sheets",
  problem: "Every morning the visitor copies customer enquiries from Gmail into a spreadsheet by hand.",
  trigger: "A new email arrives in the Gmail inbox with the label Enquiry",
  inputs: ["Enquiry email", "Customer name and company"],
  steps: [
    { title: "Watch the inbox", description: "Trigger when a labelled enquiry email arrives.", kind: "deterministic" as const },
    { title: "Extract details", description: "Pull name, company and request from the email body.", kind: "ai" as const },
    { title: "Append the row", description: "Add the enquiry to the Enquiries sheet.", kind: "deterministic" as const },
  ],
  integrations: [
    { name: "Gmail", role: "Receives enquiries" },
    { name: "Google Sheets", role: "Stores one row per enquiry" },
  ],
  exceptions: ["Unclear emails go to a human for review"],
  outputs: ["One spreadsheet row per enquiry"],
  complexity: "beginner" as const,
  difficulty: "easy" as const,
  estimatedHoursSavedPerWeek: 3,
  assumptions: ["Enquiries are labelled consistently"],
};
