import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildTemplates,
  LEAD_COLUMNS,
  overviewContent,
  SLUG,
  systemPrompt,
  TITLE,
} from "../scripts/build-n8n-templates.mjs";
import { codeNodeSource } from "../scripts/build-n8n-templates.mjs";
import { type Json, runCodeNode, SAMPLE_BLUEPRINT } from "./helpers/n8n-code-node";

// Rules from the n8n Creator Hub template submission and sticky note
// guidelines, plus behaviour tests that execute each Code node body the way
// n8n does (top-level return, $input / $ helpers).

interface WorkflowNode {
  name: string;
  type: string;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: unknown;
}

interface WorkflowExport {
  name: string;
  active: boolean;
  nodes: WorkflowNode[];
  connections: Record<string, Record<string, { node: string }[][]>>;
}

const STICKY = "n8n-nodes-base.stickyNote";
const workflow = JSON.parse(
  readFileSync(resolve(process.cwd(), `n8n/templates/${SLUG}.json`), "utf8")
) as WorkflowExport;
const raw = JSON.stringify(workflow);
const stickies = workflow.nodes.filter((n) => n.type === STICKY);
const workNodes = workflow.nodes.filter((n) => n.type !== STICKY);
const byName = (name: string) => {
  const match = workflow.nodes.find((n) => n.name === name);
  if (!match) throw new Error(`Missing node: ${name}`);
  return match;
};
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;
const assignmentNames = (name: string) =>
  (byName(name).parameters.assignments as { assignments: { name: string }[] }).assignments.map((a) => a.name);

describe(`n8n template: ${SLUG}`, () => {
  it("is up to date with the build script", () => {
    expect(workflow).toEqual(buildTemplates()[SLUG]);
  });

  it("is inactive and uses a sentence-style title without emojis", () => {
    expect(workflow.active).toBe(false);
    expect(workflow.name).toBe(TITLE);
    expect(workflow.name[0]).toMatch(/[A-Z]/);
    expect(workflow.name).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it("has exactly one top-left yellow overview sticky of 100-300 words", () => {
    const overviews = stickies.filter((n) => n.parameters.color === 1);
    expect(overviews).toHaveLength(1);
    const [overview] = overviews;
    const content = String(overview.parameters.content);
    expect(content).toBe(overviewContent());
    expect(words(content)).toBeGreaterThanOrEqual(100);
    expect(words(content)).toBeLessThanOrEqual(300);
    expect(content).toContain("### How it works");
    expect(content).toContain("### Setup");
    for (const n of workflow.nodes) {
      expect(overview.position[0]).toBeLessThanOrEqual(n.position[0]);
      expect(overview.position[1]).toBeLessThanOrEqual(n.position[1]);
    }
  });

  it("groups nodes with short white section stickies and one red warning", () => {
    const sections = stickies.filter((n) => n.parameters.color === 7);
    expect(sections.length).toBeGreaterThanOrEqual(4);
    for (const s of sections) expect(words(String(s.parameters.content))).toBeLessThan(50);
    const warnings = stickies.filter((n) => n.parameters.color === 3);
    expect(warnings).toHaveLength(1);
    expect(String(warnings[0].parameters.content)).toMatch(/anyone with the link/i);
  });

  it("is substantial enough to stand on its own", () => {
    expect(workNodes.length).toBeGreaterThanOrEqual(15);
    const types = new Set(workNodes.map((n) => n.type));
    for (const type of [
      "@n8n/n8n-nodes-langchain.chatTrigger",
      "@n8n/n8n-nodes-langchain.agent",
      "@n8n/n8n-nodes-langchain.memoryBufferWindow",
      "@n8n/n8n-nodes-langchain.outputParserStructured",
      "n8n-nodes-base.gmail",
      "n8n-nodes-base.googleSheets",
    ]) {
      expect(types).toContain(type);
    }
  });

  it("ships without credentials, secrets or personal identifiers", () => {
    for (const n of workflow.nodes) expect(n.credentials).toBeUndefined();
    const emails = raw.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/g) ?? [];
    expect(emails.filter((e) => !e.endsWith("@example.com"))).toEqual([]);
    expect(raw).not.toMatch(/TTA_SECRET|SHARED_SECRET|YOUR-INSTANCE|Tap to Automate|tapped an NFC card|lib\/n8n/i);
  });

  it("groups user settings in a Configuration Set node that passes the chat through", () => {
    expect(byName("Configuration").type).toBe("n8n-nodes-base.set");
    expect(byName("Configuration").parameters.includeOtherFields).toBe(true);
    expect(assignmentNames("Configuration")).toEqual(["ownerEmail", "senderName", "brandName", "maxFollowUps"]);
  });

  it("wires the agent's model, memory and parser on ai_* connections", () => {
    expect(workflow.connections["Anthropic Chat Model"].ai_languageModel[0][0].node).toBe("Discovery Agent");
    expect(workflow.connections["Simple Memory"].ai_memory[0][0].node).toBe("Discovery Agent");
    expect(workflow.connections["Structured Output"].ai_outputParser[0][0].node).toBe("Discovery Agent");
    expect(workflow.connections["Fixer Model"].ai_languageModel[0][0].node).toBe("Structured Output");
    expect(byName("Structured Output").parameters.autoFix).toBe(true);
    expect(byName("Simple Memory").parameters.contextWindowLength).toBeGreaterThan(5);
  });

  it("ends both branches in a node that returns `output` to the chat", () => {
    for (const name of ["Reply with Question", "Reply with Confirmation"]) {
      expect(assignmentNames(name)).toEqual(["output"]);
      expect(workflow.connections[name]).toBeUndefined();
    }
  });

  it("logs every lead column the description tells users to create", () => {
    const columns = byName("Log Lead in Google Sheets").parameters.columns as { value: Json; schema: { id: string }[] };
    expect(Object.keys(columns.value)).toEqual(LEAD_COLUMNS);
    expect(columns.schema.map((c) => c.id)).toEqual(LEAD_COLUMNS);
    expect(overviewContent()).toContain(LEAD_COLUMNS.join(", "));
    for (const column of LEAD_COLUMNS) {
      expect(columns.value[column]).toBe(`={{ $('Build Blueprint Email').first().json.leadRow['${column}'] }}`);
    }
  });

  it("writes Sheets values RAW so text can never run as a formula", () => {
    expect(byName("Log Lead in Google Sheets").parameters.options).toEqual({ cellFormat: "RAW" });
  });

  it("keeps AI and visitor text out of the email subject", () => {
    expect(codeNodeSource("build-blueprint-email")).toContain(
      "subject: 'Your automation blueprint and n8n workflow are ready'"
    );
  });

  it("only uses the intended expressions in the system prompt", () => {
    const prompt = systemPrompt();
    expect(prompt.match(/\{\{[^}]*\}\}/g)).toEqual([
      "{{ $now.toFormat('DDDD') }}",
      "{{ $('Configuration').first().json.maxFollowUps }}",
    ]);
    expect(prompt.replace(/\{\{[^}]*\}\}/g, "")).not.toMatch(/\{\{|\}\}/);
    expect(byName("Discovery Agent").parameters.options).toEqual({ systemMessage: `=${prompt}` });
  });

  it("wires every connection to a real node and leaves no node orphaned", () => {
    const names = new Set(workNodes.map((n) => n.name));
    const connected = new Set<string>();
    for (const [from, outputs] of Object.entries(workflow.connections)) {
      expect(names).toContain(from);
      connected.add(from);
      for (const branches of Object.values(outputs)) {
        for (const branch of branches) {
          for (const edge of branch) {
            expect(names).toContain(edge.node);
            connected.add(edge.node);
          }
        }
      }
    }
    expect([...names].filter((n) => !connected.has(n))).toEqual([]);
  });
});

describe("Code node: Enforce Contract", () => {
  const contact = { firstName: "Sam", email: "Sam@Example.com" };
  const chat = (sessionId = "session-a") => ({ "When chat message received": { sessionId } });

  it("turns a question into a chat reply that lists quick replies", () => {
    const out = runCodeNode("enforce-contract", {
      output: {
        status: "question",
        message: "Which inbox?",
        quickReplies: [{ label: "Gmail", value: "Gmail" }, { label: "Outlook", value: "Outlook" }],
      },
    });
    expect(out).toEqual({
      status: "question",
      message: "Which inbox?",
      chatReply: "Which inbox?\n\nYou could answer: Gmail · Outlook",
    });
  });

  it("passes a complete blueprint with a valid contact", () => {
    const out = runCodeNode(
      "enforce-contract",
      { output: { status: "blueprint", message: "Here it is.", contact, blueprint: SAMPLE_BLUEPRINT } },
      chat()
    );
    expect(out.status).toBe("blueprint");
    expect(out.contact).toEqual({ firstName: "Sam", email: "sam@example.com" });
    expect((out.blueprint as Json).name).toBe(SAMPLE_BLUEPRINT.name);
  });

  it("asks for contact details instead of delivering without them", () => {
    for (const badContact of [undefined, { firstName: "Sam" }, { firstName: "Sam", email: "not-an-email" }]) {
      const out = runCodeNode("enforce-contract", {
        output: { status: "blueprint", message: "x", contact: badContact, blueprint: SAMPLE_BLUEPRINT },
      });
      expect(out.status).toBe("question");
      expect(String(out.chatReply)).toMatch(/first name.*email/i);
    }
  });

  it("falls back to a safe question on agent errors or garbage", () => {
    for (const input of [
      { error: "boom" },
      { output: "not json" },
      { output: { status: "blueprint", contact, blueprint: { name: "x" } } },
    ]) {
      expect(runCodeNode("enforce-contract", input).status).toBe("question");
    }
  });

  it("limits emails to 2 per chat session and 3 per address per day", () => {
    const store: Json = {};
    const send = (sessionId: string, email = "sam@example.com") =>
      runCodeNode(
        "enforce-contract",
        { output: { status: "blueprint", message: "x", contact: { firstName: "Sam", email }, blueprint: SAMPLE_BLUEPRINT } },
        chat(sessionId),
        store
      ).status;
    expect([send("s1"), send("s1"), send("s1")]).toEqual(["blueprint", "blueprint", "question"]);
    expect(send("s2")).toBe("blueprint");
    expect(send("s3")).toBe("question");
    expect(send("s3", "other@example.com")).toBe("blueprint");
    expect(JSON.stringify(store)).not.toContain("example.com");
  });

  it("forgets sends older than 24 hours", () => {
    const store: Json = {
      blueprintSends: Array.from({ length: 3 }, () => ({ at: Date.now() - 25 * 60 * 60 * 1000, session: "old", recipient: "x" })),
    };
    const out = runCodeNode(
      "enforce-contract",
      { output: { status: "blueprint", message: "x", contact, blueprint: SAMPLE_BLUEPRINT } },
      chat("old"),
      store
    );
    expect(out.status).toBe("blueprint");
    expect((store.blueprintSends as unknown[]).length).toBe(1);
  });

  it("unwraps JSON the model returned as a fenced string", () => {
    const out = runCodeNode("enforce-contract", { output: '```json\n{"status":"question","message":"Hi?"}\n```' });
    expect(out.message).toBe("Hi?");
  });
});

describe("Code node: Build n8n Starter Workflow", () => {
  const out = runCodeNode("build-starter-workflow", { status: "blueprint", blueprint: SAMPLE_BLUEPRINT, contact: {} });
  const generated = JSON.parse(String(out.workflowJson));

  it("produces an inactive, credential-free, importable workflow", () => {
    expect(generated.active).toBe(false);
    expect(generated.name).toBe("Email enquiries to Sheets — n8n Starter");
    for (const n of generated.nodes) expect(n.credentials).toBeUndefined();
    expect(generated.nodes.map((n: WorkflowNode) => n.name)).toEqual([
      "START HERE",
      "Gmail Trigger",
      "1. Extract details",
      "2. Append the row",
    ]);
    expect(Object.keys(generated.connections)).toEqual(["Gmail Trigger", "1. Extract details"]);
  });

  it("attaches a matching base64 copy and filename", () => {
    expect(Buffer.from(String(out.workflowBase64), "base64").toString("utf8")).toBe(out.workflowJson);
    expect(out.workflowFilename).toBe("email-enquiries-to-sheets-n8n-workflow.json");
  });
});

describe("Code node: Build Blueprint Email", () => {
  const config = { ownerEmail: "owner@example.com", senderName: "Blueprints", brandName: "Acme Automations" };
  const nodes = { Configuration: config, "When chat message received": { sessionId: "session-a" } };
  const input = {
    status: "blueprint",
    blueprint: SAMPLE_BLUEPRINT,
    contact: { firstName: "Sam", email: "sam@example.com" },
    workflowFilename: "email-enquiries-to-sheets-n8n-workflow.json",
    capturedAt: "2026-10-06T12:00:00.000Z",
  };

  it("builds the email from validated fields with the configured brand", () => {
    const out = runCodeNode("build-blueprint-email", input, nodes);
    expect(out).toMatchObject({ recipient: "sam@example.com", ownerEmail: "owner@example.com", senderName: "Blueprints" });
    expect(out.subject).toBe("Your automation blueprint and n8n workflow are ready");
    expect(String(out.html)).toContain("Acme Automations");
    expect(String(out.html)).toContain("Hi Sam, here is the automation blueprint you requested.");
  });

  it("escapes agent and visitor text so it cannot inject markup", () => {
    const evil = {
      ...SAMPLE_BLUEPRINT,
      name: "<script>alert(1)</script>",
      problem: '<a href="https://evil.test">click</a>',
    };
    const out = runCodeNode(
      "build-blueprint-email",
      { ...input, blueprint: evil, contact: { firstName: "<b>Sam</b>", email: "sam@example.com" } },
      nodes
    );
    const html = String(out.html);
    expect(html).not.toMatch(/<script|<a href|<b>Sam/);
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });

  it("refuses to send until ownerEmail is configured", () => {
    expect(() =>
      runCodeNode("build-blueprint-email", input, { ...nodes, Configuration: { ...config, ownerEmail: "you@example.com" } })
    ).toThrow(/Set ownerEmail/);
  });

  it("builds a lead row with spreadsheet formulas defused", () => {
    const formula = '=IMPORTXML("https://evil.test","//a")';
    const evil = { ...SAMPLE_BLUEPRINT, name: formula, problem: "+1+1" };
    const out = runCodeNode(
      "build-blueprint-email",
      { ...input, blueprint: evil, contact: { firstName: "@SUM(A1)", email: "sam@example.com" } },
      nodes
    );
    const row = out.leadRow as Json;
    expect(Object.keys(row)).toEqual(LEAD_COLUMNS);
    expect(row["First Name"]).toBe("'@SUM(A1)");
    expect(row.Automation).toBe("'" + formula);
    expect(row.Problem).toBe("'+1+1");
    expect(row["Hours Saved per Week"]).toBe("3");
    expect(row["Session ID"]).toBe("session-a");
  });
});
