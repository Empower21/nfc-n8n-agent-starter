// Builds the n8n Creator Hub submission from tracked sources.
//
//   node scripts/build-n8n-templates.mjs
//
// Inputs:
//   n8n/discovery-agent-workflow.json   production export (model + schema settings)
//   n8n/templates/code/*.js             Code node bodies (tested in vitest)
//   n8n/templates/code/system-prompt.md agent system message
//   n8n/templates/<slug>.md             description, doubles as the overview sticky
// Output:
//   n8n/templates/<slug>.json           importable, credential-free template

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = resolve(ROOT, "n8n/discovery-agent-workflow.json");
const OUT_DIR = resolve(ROOT, "n8n/templates");
const CODE_DIR = resolve(OUT_DIR, "code");

// n8n sticky colors: 1 = yellow (overview), 3 = red (warning),
// 7 = white/neutral (sections).
const OVERVIEW_COLOR = 1;
const WARNING_COLOR = 3;
const SECTION_COLOR = 7;

export const SLUG = "ai-automation-consultant";
export const TITLE =
  "Turn chat conversations into n8n automation blueprints with Claude, Gmail and Google Sheets";

export const LEAD_COLUMNS = [
  "Date",
  "First Name",
  "Email",
  "Automation",
  "Problem",
  "Hours Saved per Week",
  "Complexity",
  "Session ID",
];

// Normalize CRLF so Windows checkouts (core.autocrlf) build identical output.
const read = (file) => readFileSync(file, "utf8").replace(/\r\n/g, "\n");

export function codeNodeSource(name) {
  return read(resolve(CODE_DIR, `${name}.js`));
}

export function systemPrompt() {
  return read(resolve(CODE_DIR, "system-prompt.md")).trim();
}

// The overview sticky is the description with headings demoted one level, as
// the sticky note guidelines ask for `### How it works` / `### Setup`.
export function overviewContent() {
  const body = read(resolve(OUT_DIR, `${SLUG}.md`)).trim().replace(/^## /gm, "### ");
  return `## ${TITLE}\n\n${body}`;
}

function sourceNodes() {
  const workflow = JSON.parse(read(SOURCE));
  return new Map(workflow.nodes.map((node) => [node.name, node]));
}

function take(nodes, name, overrides = {}) {
  const node = nodes.get(name);
  if (!node) throw new Error(`Source workflow is missing node: ${name}`);
  const copy = structuredClone(node);
  delete copy.credentials;
  return { ...copy, ...overrides };
}

let idCounter = 0;
const nextId = () => `7a3c1e90-5b2d-4f6a-9c84-${String(++idCounter).padStart(12, "0")}`;

function node(name, type, typeVersion, position, parameters, extra = {}) {
  return { id: nextId(), name, type, typeVersion, position, parameters, ...extra };
}

function sticky(name, content, position, width, height, color) {
  return node(name, "n8n-nodes-base.stickyNote", 1, position, { content, width, height, color });
}

function setNode(name, position, assignments, includeOtherFields) {
  return node(name, "n8n-nodes-base.set", 3.4, position, {
    mode: "manual",
    ...(includeOtherFields ? { includeOtherFields: true } : {}),
    assignments: {
      assignments: assignments.map(([field, type, value]) => ({ id: nextId(), name: field, type, value })),
    },
    options: {},
  });
}

function codeNode(name, position, file) {
  return node(name, "n8n-nodes-base.code", 2, position, { jsCode: codeNodeSource(file) });
}

const main = (target, index = 0) => ({ node: target, type: "main", index });
const ai = (target, type) => ({ node: target, type, index: 0 });

// Contact is required for delivery; Enforce Contract downgrades a blueprint
// without one to a question asking for it.
function outputSchema(nodes) {
  const schema = JSON.parse(take(nodes, "Structured Output").parameters.inputSchema);
  schema.properties.contact = {
    type: "object",
    description: "Required when status is blueprint: the visitor's first name and email.",
    properties: { firstName: { type: "string" }, email: { type: "string" } },
    required: ["firstName", "email"],
  };
  return JSON.stringify(schema, null, 2);
}

function buildConsultant(nodes) {
  idCounter = 0;
  const email = (field) => `={{ $('Build Blueprint Email').first().json.${field} }}`;

  const chatTrigger = node("When chat message received", "@n8n/n8n-nodes-langchain.chatTrigger", 1.4, [560, 200], {
    public: true,
    initialMessages:
      "Hi! Tell me one repetitive task you'd love to hand off, and I'll design an n8n automation for it.",
    options: {},
  }, { webhookId: "7a3c1e90-5b2d-4f6a-9c84-0000000000ff" });

  const agent = take(nodes, "Discovery Agent", { position: [1160, 200], onError: "continueRegularOutput" });
  agent.parameters = {
    ...agent.parameters,
    promptType: "define",
    text: "={{ $json.chatInput }}",
    hasOutputParser: true,
    options: { systemMessage: `=${systemPrompt()}` },
  };

  const parser = take(nodes, "Structured Output", { position: [1560, 460] });
  parser.parameters = { ...parser.parameters, inputSchema: outputSchema(nodes) };

  const workflowNodes = [
    sticky("Overview", overviewContent(), [0, -140], 480, 1060, OVERVIEW_COLOR),
    sticky("Section: Chat", "## 1. Chat\nHosted n8n chat. Settings live in Configuration.", [500, -140], 520, 600, SECTION_COLOR),
    sticky("Warning: Public chat", "## Public chat\nAnyone with the link can request an email. Turn on authentication or embed the chat on a page you control.", [520, -40], 220, 440, WARNING_COLOR),
    sticky("Section: Discovery agent", "## 2. Discovery agent\nClaude asks one question per turn, remembers the chat, and returns strict JSON.", [1060, -140], 760, 1000, SECTION_COLOR),
    sticky("Section: Reply or build", "## 3. Reply or build\nQuestions go back to the chat. A ready blueprint becomes a workflow file and an email.", [1860, -140], 700, 640, SECTION_COLOR),
    sticky("Section: Deliver and log", "## 4. Deliver and log\nEmail the visitor (you are BCC'd), log the lead, confirm in the chat.", [2600, -140], 960, 640, SECTION_COLOR),

    chatTrigger,
    setNode("Configuration", [800, 200], [
      ["ownerEmail", "string", "you@example.com"],
      ["senderName", "string", "Automation Blueprints"],
      ["brandName", "string", "Automation Blueprint"],
      ["maxFollowUps", "number", 5],
    ], true),
    agent,
    take(nodes, "Anthropic Chat Model", { position: [1100, 460] }),
    node("Simple Memory", "@n8n/n8n-nodes-langchain.memoryBufferWindow", 1.4, [1330, 460], { contextWindowLength: 30 }),
    parser,
    take(nodes, "Fixer Model", { position: [1640, 680] }),
    codeNode("Enforce Contract", [1600, 200], "enforce-contract"),

    node("Blueprint Ready?", "n8n-nodes-base.if", 2.2, [1900, 200], {
      conditions: {
        options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
        conditions: [{
          id: nextId(),
          leftValue: "={{ $json.status }}",
          rightValue: "blueprint",
          operator: { type: "string", operation: "equals" },
        }],
        combinator: "and",
      },
      options: {},
    }),
    setNode("Reply with Question", [2140, 340], [["output", "string", "={{ $json.chatReply }}"]], false),
    codeNode("Build n8n Starter Workflow", [2140, 80], "build-starter-workflow"),
    codeNode("Build Blueprint Email", [2360, 80], "build-blueprint-email"),

    node("Workflow JSON to File", "n8n-nodes-base.convertToFile", 1.1, [2660, 80], {
      operation: "toBinary",
      sourceProperty: "workflowBase64",
      binaryPropertyName: "workflow",
      options: { fileName: "={{ $json.workflowFilename }}", mimeType: "application/json" },
    }),
    node("Email Blueprint to Visitor", "n8n-nodes-base.gmail", 2.2, [2880, 80], {
      sendTo: email("recipient"),
      subject: email("subject"),
      emailType: "html",
      message: email("html"),
      options: {
        appendAttribution: false,
        bccList: email("ownerEmail"),
        attachmentsUi: { attachmentsBinary: [{ property: "workflow" }] },
        senderName: email("senderName"),
      },
    }),
    node("Log Lead in Google Sheets", "n8n-nodes-base.googleSheets", 4.7, [3100, 80], {
      operation: "append",
      documentId: { __rl: true, value: "", mode: "list", cachedResultName: "" },
      sheetName: { __rl: true, value: "", mode: "list", cachedResultName: "" },
      columns: {
        mappingMode: "defineBelow",
        value: {
          Date: email("capturedAt"),
          "First Name": email("contact.firstName"),
          Email: email("contact.email"),
          Automation: email("blueprint.name"),
          Problem: email("blueprint.problem"),
          "Hours Saved per Week": "={{ $('Build Blueprint Email').first().json.blueprint.estimatedHoursSavedPerWeek ?? 'Unknown' }}",
          Complexity: email("blueprint.complexity"),
          "Session ID": "={{ $('When chat message received').first().json.sessionId }}",
        },
        matchingColumns: [],
        schema: LEAD_COLUMNS.map((column) => ({
          id: column,
          displayName: column,
          required: false,
          defaultMatch: false,
          display: true,
          type: "string",
          canBeUsedToMatch: true,
        })),
        attemptToConvertTypes: false,
        convertFieldsToString: false,
      },
      options: {},
    }),
    setNode("Reply with Confirmation", [3320, 80], [[
      "output",
      "string",
      "=Done, {{ $('Build Blueprint Email').first().json.contact.firstName }}! I've emailed **{{ $('Build Blueprint Email').first().json.blueprint.name }}** to {{ $('Build Blueprint Email').first().json.contact.email }}, with an importable n8n workflow attached.\n\n**How it runs**\n{{ $('Build Blueprint Email').first().json.blueprint.steps.map((step, i) => (i + 1) + '. ' + step.title).join('\\n') }}\n\nWant to change anything? Just tell me.",
    ]], false),
  ];

  return {
    name: TITLE,
    active: false,
    nodes: workflowNodes,
    connections: {
      "When chat message received": { main: [[main("Configuration")]] },
      Configuration: { main: [[main("Discovery Agent")]] },
      "Discovery Agent": { main: [[main("Enforce Contract")]] },
      "Anthropic Chat Model": { ai_languageModel: [[ai("Discovery Agent", "ai_languageModel")]] },
      "Simple Memory": { ai_memory: [[ai("Discovery Agent", "ai_memory")]] },
      "Structured Output": { ai_outputParser: [[ai("Discovery Agent", "ai_outputParser")]] },
      "Fixer Model": { ai_languageModel: [[ai("Structured Output", "ai_languageModel")]] },
      "Enforce Contract": { main: [[main("Blueprint Ready?")]] },
      "Blueprint Ready?": { main: [[main("Build n8n Starter Workflow")], [main("Reply with Question")]] },
      "Build n8n Starter Workflow": { main: [[main("Build Blueprint Email")]] },
      "Build Blueprint Email": { main: [[main("Workflow JSON to File")]] },
      "Workflow JSON to File": { main: [[main("Email Blueprint to Visitor")]] },
      "Email Blueprint to Visitor": { main: [[main("Log Lead in Google Sheets")]] },
      "Log Lead in Google Sheets": { main: [[main("Reply with Confirmation")]] },
    },
    settings: { executionOrder: "v1" },
  };
}

export function buildTemplates() {
  return { [SLUG]: buildConsultant(sourceNodes()) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const [slug, workflow] of Object.entries(buildTemplates())) {
    const file = resolve(OUT_DIR, `${slug}.json`);
    writeFileSync(file, `${JSON.stringify(workflow, null, 2)}\n`, "utf8");
    console.log(`wrote ${file}`);
  }
}
