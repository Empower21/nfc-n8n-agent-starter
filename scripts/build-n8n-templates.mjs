// Builds n8n Creator Hub submissions from the production workflow export.
//
//   node scripts/build-n8n-templates.mjs
//
// Production (n8n/discovery-agent-workflow.json) stays the source of truth.
// This script derives credential-free, personal-data-free templates with the
// sticky notes the Creator Hub requires, and writes them to n8n/templates/.
// The Markdown descriptions in n8n/templates/*.md double as the yellow
// overview sticky, so the submitted description and the canvas never drift.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = resolve(ROOT, "n8n/discovery-agent-workflow.json");
const OUT_DIR = resolve(ROOT, "n8n/templates");

// n8n sticky colors: 1 = yellow (overview), 3 = red (warning),
// 7 = white/neutral (sections).
const OVERVIEW_COLOR = 1;
const WARNING_COLOR = 3;
const SECTION_COLOR = 7;

export const TEMPLATES = {
  "discovery-agent": {
    name: "Turn repetitive tasks into n8n automation blueprints with a Claude discovery agent",
  },
  "blueprint-delivery": {
    name: "Email HTML automation blueprints with n8n workflow attachments via Gmail",
  },
};

function readDescription(slug) {
  // Normalize CRLF so Windows checkouts (core.autocrlf) build identical stickies.
  return readFileSync(resolve(OUT_DIR, `${slug}.md`), "utf8").replace(/\r\n/g, "\n").trim();
}

// The overview sticky is the description with headings demoted one level, as
// the sticky note guidelines ask for `### How it works` / `### Setup`.
export function overviewContent(slug) {
  const body = readDescription(slug).replace(/^## /gm, "### ");
  return `## ${TEMPLATES[slug].name}\n\n${body}`;
}

function sourceNodes() {
  const workflow = JSON.parse(readFileSync(SOURCE, "utf8"));
  return new Map(workflow.nodes.map((node) => [node.name, node]));
}

function take(nodes, name, overrides = {}) {
  const node = nodes.get(name);
  if (!node) throw new Error(`Source workflow is missing node: ${name}`);
  const copy = structuredClone(node);
  delete copy.credentials;
  return { ...copy, ...overrides };
}

function sticky(id, name, content, position, width, height, color) {
  return {
    id,
    name,
    type: "n8n-nodes-base.stickyNote",
    typeVersion: 1,
    position,
    parameters: { content, width, height, color },
  };
}

function configuration(id, position, assignments) {
  return {
    id,
    name: "Configuration",
    type: "n8n-nodes-base.set",
    typeVersion: 3.4,
    position,
    parameters: {
      mode: "manual",
      includeOtherFields: true,
      assignments: {
        assignments: assignments.map(([assignmentId, name, type, value]) => ({
          id: assignmentId,
          name,
          type,
          value,
        })),
      },
      options: {},
    },
  };
}

function replaceOrThrow(text, pattern, replacement, label) {
  const next = text.replace(pattern, replacement);
  if (next === text) throw new Error(`Template transform did not apply: ${label}`);
  return next;
}

function main(target, index = 0) {
  return { node: target, type: "main", index };
}

function buildDiscoveryAgent(nodes) {
  const webhook = take(nodes, "Discovery Webhook", { position: [540, 240] });
  webhook.parameters = {
    ...webhook.parameters,
    path: "automation-discovery",
    authentication: "headerAuth",
  };

  const prompt = take(nodes, "Validate Request", {
    name: "Build Agent Prompt",
    position: [980, 240],
  });
  const [, , , promptAssignment] = prompt.parameters.assignments.assignments;
  prompt.parameters.assignments.assignments = [
    {
      id: "4b416991-b2c6-48ab-a385-e61f73786d17",
      name: "valid",
      type: "boolean",
      value: "={{ String(($json.body || {}).message || '').trim().length >= 3 }}",
    },
    { id: "c759478a-0944-4216-86e7-cd3ac2400df4", name: "statusCode", type: "number", value: 400 },
    { id: "a35d0138-4f46-4aef-81e4-4e41f78cd6bb", name: "error", type: "string", value: "A message is required." },
    {
      ...promptAssignment,
      value: replaceOrThrow(
        promptAssignment.value,
        "var max = 5;",
        "var max = Number($json.maxFollowUps) || 5;",
        "maxFollowUps"
      ),
    },
  ];

  const gate = take(nodes, "Authorized?", { name: "Message Present?", position: [1200, 240] });
  gate.parameters.conditions.conditions[0].leftValue = "={{ $json.valid }}";

  const agent = take(nodes, "Discovery Agent", { position: [1720, 240] });
  agent.parameters.options.systemMessage = replaceOrThrow(
    agent.parameters.options.systemMessage,
    "tapped an NFC card and told you",
    "told you",
    "system message NFC reference"
  );

  const guard = take(nodes, "Enforce Contract", { position: [2280, 240] });
  guard.parameters.jsCode = replaceOrThrow(
    guard.parameters.jsCode,
    "// an object that satisfies agentResponseSchema in lib/n8n/types.ts.",
    "// an object that matches the Structured Output schema.",
    "contract comment"
  );

  const workflowNodes = [
    sticky("0b1f3c52-8a51-4b0e-9a61-1d2f7c000001", "Overview", overviewContent("discovery-agent"), [0, -100], 460, 940, OVERVIEW_COLOR),
    sticky("0b1f3c52-8a51-4b0e-9a61-1d2f7c000002", "Section: Receive and validate", "## 1. Receive and validate\nThe webhook checks the secret header, then builds the prompt from the message and history.", [480, -100], 1100, 560, SECTION_COLOR),
    sticky("0b1f3c52-8a51-4b0e-9a61-1d2f7c000003", "Section: Discovery agent", "## 2. Discovery agent\nClaude asks one question per turn, then returns a structured blueprint.", [1620, -100], 560, 940, SECTION_COLOR),
    sticky("0b1f3c52-8a51-4b0e-9a61-1d2f7c000004", "Section: Guard and respond", "## 3. Guard and respond\nThe response always matches one contract, even when the model misbehaves.", [2220, -100], 500, 560, SECTION_COLOR),
    webhook,
    configuration("0b1f3c52-8a51-4b0e-9a61-1d2f7c000010", [760, 240], [
      ["0b1f3c52-8a51-4b0e-9a61-1d2f7c000011", "maxFollowUps", "number", 5],
    ]),
    prompt,
    gate,
    take(nodes, "Reject", { name: "Reject Empty Message", position: [1420, 40] }),
    agent,
    take(nodes, "Anthropic Chat Model", { position: [1660, 520] }),
    take(nodes, "Structured Output", { position: [1900, 520] }),
    take(nodes, "Fixer Model", { position: [1980, 680] }),
    guard,
    take(nodes, "Respond", { position: [2500, 240] }),
  ];

  return {
    name: TEMPLATES["discovery-agent"].name,
    active: false,
    nodes: workflowNodes,
    connections: {
      "Discovery Webhook": { main: [[main("Configuration")]] },
      Configuration: { main: [[main("Build Agent Prompt")]] },
      "Build Agent Prompt": { main: [[main("Message Present?")]] },
      "Message Present?": { main: [[main("Discovery Agent")], [main("Reject Empty Message")]] },
      "Discovery Agent": { main: [[main("Enforce Contract")]] },
      "Enforce Contract": { main: [[main("Respond")]] },
      "Anthropic Chat Model": { ai_languageModel: [[{ node: "Discovery Agent", type: "ai_languageModel", index: 0 }]] },
      "Structured Output": { ai_outputParser: [[{ node: "Discovery Agent", type: "ai_outputParser", index: 0 }]] },
      "Fixer Model": { ai_languageModel: [[{ node: "Structured Output", type: "ai_languageModel", index: 0 }]] },
    },
    pinData: {
      "Discovery Webhook": [
        {
          json: {
            headers: {},
            params: {},
            query: {},
            body: {
              message: "Every morning I manually copy customer enquiries from email into Excel.",
              history: [],
            },
          },
        },
      ],
    },
    settings: { executionOrder: "v1" },
  };
}

// Defense in depth for caller-supplied HTML. The caller must still build the
// HTML server-side with every value escaped; this strips what would turn the
// owner's Gmail into a phishing relay if that contract is broken.
export const SANITIZE_HTML_SOURCE = `function sanitizeHtml(html) {
  const blocked = 'script|iframe|frame|frameset|object|embed|applet|form|input|button|textarea|select|base';
  return String(html)
    .replace(new RegExp('<\\\\s*(' + blocked + ')\\\\b[\\\\s\\\\S]*?<\\\\s*\\\\/\\\\s*\\\\1\\\\s*>', 'gi'), '')
    .replace(new RegExp('<\\\\s*\\\\/?\\\\s*(' + blocked + ')\\\\b[^>]*>', 'gi'), '')
    .replace(/<\\s*meta\\b[^>]*http-equiv[^>]*>/gi, '')
    .replace(/\\s+on[a-z]+\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)/gi, '')
    .replace(/\\b(href|src|action|formaction)\\s*=\\s*(["']?)\\s*(?:javascript|vbscript|data):[^"'\\s>]*\\2/gi, '$1="#"');
}`;

const VALIDATE_LEAD_CODE = `${SANITIZE_HTML_SOURCE}

const input = $input.first().json;
const body = input.body || {};
const fail = function (statusCode, error) { return [{ json: { valid: false, statusCode: statusCode, error: error } }]; };
const EMAIL = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;

const ownerEmail = String(input.ownerEmail || '').trim().toLowerCase();
if (!EMAIL.test(ownerEmail) || ownerEmail === 'you@example.com') {
  return fail(500, 'Set ownerEmail in the Configuration node.');
}

if (!body || typeof body !== 'object') {
  return fail(400, 'Invalid request body.');
}

const action = body.action;
if (action !== 'send-blueprint' && action !== 'build-request') {
  return fail(400, 'Invalid action.');
}

const firstName = String(body.firstName || '').trim().replace(/[\\r\\n]+/g, ' ');
const email = String(body.email || '').trim().toLowerCase();
const blueprintName = String(body.blueprintName || (body.blueprint && body.blueprint.name) || '').trim().replace(/[\\r\\n]+/g, ' ');
const blueprintMarkdown = String(body.blueprintMarkdown || '').trim();

if (!firstName || firstName.length > 80) {
  return fail(400, 'Invalid first name.');
}
if (!EMAIL.test(email) || email.length > 200) {
  return fail(400, 'Invalid email.');
}
if (!blueprintName || blueprintName.length > 120 || blueprintMarkdown.length < 20 || blueprintMarkdown.length > 30000) {
  return fail(400, 'Complete blueprint content is required.');
}
if (typeof body.blueprintHtml !== 'string' || body.blueprintHtml.length < 50 || body.blueprintHtml.length > 200000) {
  return fail(400, 'Complete blueprint content is required.');
}
const blueprintHtml = sanitizeHtml(body.blueprintHtml);

// Optional: where the request came from (a form, a QR code, an NFC tag, ...).
const sourceId = String((body.session && body.session.cardId) || body.source || 'unknown');
const capturedAt = String(body.capturedAt || new Date().toISOString());
const recipient = action === 'send-blueprint' ? email : ownerEmail;
const subject = action === 'send-blueprint'
  ? 'Your automation blueprint: ' + blueprintName
  : 'Build request: ' + firstName + ' (' + blueprintName + ')';
const message = action === 'send-blueprint'
  ? 'Hi ' + firstName + ',\\n\\nHere is the automation blueprint you requested.\\n\\n' + blueprintMarkdown + '\\n\\nSource: ' + sourceId + '\\nRequested: ' + capturedAt + '\\n\\nReply to this email if you would like help building it.'
  : 'Action: Build request\\nName: ' + firstName + '\\nEmail: ' + email + '\\nBlueprint: ' + blueprintName + '\\nSource: ' + sourceId + '\\nCaptured: ' + capturedAt + '\\n\\n' + blueprintMarkdown;

return [{ json: {
  valid: true,
  statusCode: 200,
  action: action,
  firstName: firstName,
  email: email,
  blueprintName: blueprintName,
  blueprintMarkdown: blueprintMarkdown,
  blueprintHtml: blueprintHtml,
  ownerEmail: ownerEmail,
  recipient: recipient,
  subject: subject,
  message: message,
  sourceId: sourceId,
  capturedAt: capturedAt
} }];`;

function buildBlueprintDelivery(nodes) {
  const webhook = take(nodes, "Lead Webhook", { position: [540, 200] });
  webhook.parameters = {
    ...webhook.parameters,
    path: "blueprint-delivery",
    authentication: "headerAuth",
  };

  const validate = take(nodes, "Validate + Format Lead", { position: [980, 200] });
  validate.parameters.jsCode = VALIDATE_LEAD_CODE;

  const senderName = "={{ $('Configuration').first().json.senderName }}";
  const gmail = (name, position) => {
    const node = take(nodes, name, { position });
    // Send the sanitized copy, never the raw request body.
    node.parameters.message = "={{ $('Validate + Format Lead').first().json.blueprintHtml }}";
    node.parameters.options = { ...node.parameters.options, senderName };
    return node;
  };

  const workflowNodes = [
    sticky("5c2e9d14-3f7a-4c61-8b20-6e4a9b000001", "Overview", overviewContent("blueprint-delivery"), [0, -100], 460, 960, OVERVIEW_COLOR),
    sticky("5c2e9d14-3f7a-4c61-8b20-6e4a9b000002", "Section: Receive and validate", "## 1. Receive and validate\nChecks the secret header and every field, then picks the recipient.", [480, -100], 900, 560, SECTION_COLOR),
    sticky("5c2e9d14-3f7a-4c61-8b20-6e4a9b000003", "Section: Build the attachment", "## 2. Build the attachment\nOnly inactive, importable workflow JSON becomes a file.", [1420, -100], 700, 620, SECTION_COLOR),
    sticky("5c2e9d14-3f7a-4c61-8b20-6e4a9b000005", "Warning: Server-side only", "## Server-side only\nCall this webhook from your backend, never from a browser. Escape every value in `blueprintHtml` before sending.", [500, -60], 240, 420, WARNING_COLOR),
    sticky("5c2e9d14-3f7a-4c61-8b20-6e4a9b000004", "Section: Send and confirm", "## 3. Send and confirm\nVisitor gets the blueprint (you are BCC'd). Build requests go only to you.", [2160, -100], 920, 620, SECTION_COLOR),
    webhook,
    configuration("5c2e9d14-3f7a-4c61-8b20-6e4a9b000010", [760, 200], [
      ["5c2e9d14-3f7a-4c61-8b20-6e4a9b000011", "ownerEmail", "string", "you@example.com"],
      ["5c2e9d14-3f7a-4c61-8b20-6e4a9b000012", "senderName", "string", "Automation Blueprints"],
    ]),
    validate,
    take(nodes, "Valid Request?", { position: [1200, 200] }),
    take(nodes, "Create Workflow Attachment", { position: [1460, 120] }),
    take(nodes, "Attachment Valid?", { position: [1680, 120] }),
    take(nodes, "Workflow JSON to File", { position: [1900, 0] }),
    take(nodes, "Reject Request", { position: [1900, 340] }),
    take(nodes, "Merge Email + File", { position: [2200, 120] }),
    take(nodes, "Send Blueprint?", { position: [2420, 120] }),
    gmail("Email Blueprint to Visitor", [2640, 0]),
    gmail("Email Build Request to Owner", [2640, 260]),
    take(nodes, "Confirm Blueprint Delivery", { position: [2880, 0] }),
    take(nodes, "Confirm Build Request", { position: [2880, 260] }),
  ];

  return {
    name: TEMPLATES["blueprint-delivery"].name,
    active: false,
    nodes: workflowNodes,
    connections: {
      "Lead Webhook": { main: [[main("Configuration")]] },
      Configuration: { main: [[main("Validate + Format Lead")]] },
      "Validate + Format Lead": { main: [[main("Valid Request?")]] },
      "Valid Request?": { main: [[main("Create Workflow Attachment")], [main("Reject Request")]] },
      "Create Workflow Attachment": { main: [[main("Attachment Valid?")]] },
      "Attachment Valid?": {
        main: [[main("Workflow JSON to File"), main("Merge Email + File")], [main("Reject Request")]],
      },
      "Workflow JSON to File": { main: [[main("Merge Email + File", 1)]] },
      "Merge Email + File": { main: [[main("Send Blueprint?")]] },
      "Send Blueprint?": { main: [[main("Email Blueprint to Visitor")], [main("Email Build Request to Owner")]] },
      "Email Blueprint to Visitor": { main: [[main("Confirm Blueprint Delivery")]] },
      "Email Build Request to Owner": { main: [[main("Confirm Build Request")]] },
    },
    settings: { executionOrder: "v1" },
  };
}

export function buildTemplates() {
  const nodes = sourceNodes();
  return {
    "discovery-agent": buildDiscoveryAgent(nodes),
    "blueprint-delivery": buildBlueprintDelivery(nodes),
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  for (const [slug, workflow] of Object.entries(buildTemplates())) {
    const file = resolve(OUT_DIR, `${slug}.json`);
    writeFileSync(file, `${JSON.stringify(workflow, null, 2)}\n`, "utf8");
    console.log(`wrote ${file}`);
  }
}
