import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildTemplates,
  overviewContent,
  SANITIZE_HTML_SOURCE,
} from "../scripts/build-n8n-templates.mjs";

// Rules from the n8n Creator Hub template submission and sticky note guidelines.

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

const SLUGS = ["discovery-agent", "blueprint-delivery"] as const;
const STICKY = "n8n-nodes-base.stickyNote";

function load(slug: string): WorkflowExport {
  return JSON.parse(
    readFileSync(resolve(process.cwd(), `n8n/templates/${slug}.json`), "utf8")
  ) as WorkflowExport;
}

function words(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

describe.each(SLUGS)("n8n template: %s", (slug) => {
  const workflow = load(slug);
  const raw = JSON.stringify(workflow);
  const stickies = workflow.nodes.filter((n) => n.type === STICKY);
  const workNodes = workflow.nodes.filter((n) => n.type !== STICKY);
  const overviews = stickies.filter((n) => n.parameters.color === 1);
  const sections = stickies.filter((n) => n.parameters.color === 7);

  it("is up to date with the build script", () => {
    expect(workflow).toEqual(buildTemplates()[slug]);
  });

  it("is inactive and uses a sentence-style title without emojis", () => {
    expect(workflow.active).toBe(false);
    expect(workflow.name[0]).toMatch(/[A-Z]/);
    expect(workflow.name).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it("has exactly one top-left yellow overview sticky of 100-300 words", () => {
    expect(overviews).toHaveLength(1);
    const [overview] = overviews;
    const content = String(overview.parameters.content);
    expect(content).toBe(overviewContent(slug));
    expect(words(content)).toBeGreaterThanOrEqual(100);
    expect(words(content)).toBeLessThanOrEqual(300);
    expect(content).toContain("### How it works");
    expect(content).toContain("### Setup");
    for (const node of workflow.nodes) {
      expect(overview.position[0]).toBeLessThanOrEqual(node.position[0]);
      expect(overview.position[1]).toBeLessThanOrEqual(node.position[1]);
    }
  });

  it("groups nodes with short white section stickies", () => {
    expect(sections.length).toBeGreaterThan(0);
    for (const section of sections) {
      expect(words(String(section.parameters.content))).toBeLessThan(50);
    }
  });

  it("ships without credentials, secrets or personal identifiers", () => {
    for (const node of workflow.nodes) expect(node.credentials).toBeUndefined();
    const emails = raw.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/g) ?? [];
    expect(emails.filter((e) => !e.endsWith("@example.com"))).toEqual([]);
    expect(raw).not.toMatch(/TTA_SECRET|SHARED_SECRET|Tap to Automate|tapped an NFC card|lib\/n8n/i);
  });

  it("protects every webhook with Header Auth instead of an inline secret", () => {
    const webhooks = workNodes.filter((n) => n.type === "n8n-nodes-base.webhook");
    expect(webhooks.length).toBeGreaterThan(0);
    for (const webhook of webhooks) {
      expect(webhook.parameters.authentication).toBe("headerAuth");
    }
  });

  it("groups user settings in a Configuration Set node", () => {
    const config = workNodes.find((n) => n.name === "Configuration");
    expect(config?.type).toBe("n8n-nodes-base.set");
    expect(config?.parameters.includeOtherFields).toBe(true);
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

describe("blueprint-delivery template security", () => {
  const workflow = load("blueprint-delivery");
  const byName = (name: string) => {
    const match = workflow.nodes.find((n) => n.name === name);
    if (!match) throw new Error(`Missing node: ${name}`);
    return match;
  };
  const sanitizeHtml = new Function(
    `${SANITIZE_HTML_SOURCE}; return sanitizeHtml;`
  )() as (html: string) => string;
  // Runs the real Code node body with a stubbed $input, as n8n would.
  const runValidate = (json: Record<string, unknown>) =>
    (new Function("$input", String(byName("Validate + Format Lead").parameters.jsCode)) as (
      input: unknown
    ) => { json: Record<string, unknown> }[])({ first: () => ({ json }) })[0].json;
  const sample = JSON.parse(
    readFileSync(resolve(process.cwd(), "n8n/templates/blueprint-delivery.sample-request.json"), "utf8")
  ) as Record<string, unknown>;

  it("strips active content but keeps ordinary email markup", () => {
    const dirty =
      '<meta charset="utf-8"><p onclick="steal()" style="color:red">Hi</p>' +
      "<script>alert(1)</script><iframe src=\"https://evil.test\"></iframe>" +
      '<a href="javascript:alert(1)">bad</a><a href="https://ok.test">ok</a>' +
      '<meta http-equiv="refresh" content="0;url=https://evil.test">' +
      '<form action="https://evil.test"><input name="password"></form>';
    const clean = sanitizeHtml(dirty);
    expect(clean).not.toMatch(/<script|<iframe|<form|<input|onclick|javascript:|http-equiv/i);
    expect(clean).toContain('<meta charset="utf-8">');
    expect(clean).toContain('<p style="color:red">Hi</p>');
    expect(clean).toContain('<a href="https://ok.test">ok</a>');
  });

  it("emails only the sanitized HTML, never the raw request body", () => {
    for (const name of ["Email Blueprint to Visitor", "Email Build Request to Owner"]) {
      expect(byName(name).parameters.message).toBe(
        "={{ $('Validate + Format Lead').first().json.blueprintHtml }}"
      );
    }
  });

  it("warns users with a red sticky to call the webhook server-side only", () => {
    const warning = workflow.nodes.find(
      (n) => n.type === STICKY && n.parameters.color === 3
    );
    expect(String(warning?.parameters.content)).toMatch(/never from a browser/i);
  });

  it("refuses to run until ownerEmail is configured", () => {
    expect(runValidate({ ownerEmail: "you@example.com", body: sample })).toMatchObject({
      valid: false,
      statusCode: 500,
    });
  });

  it("accepts the bundled sample request and sanitizes its HTML", () => {
    const result = runValidate({
      ownerEmail: "owner@example.com",
      body: { ...sample, blueprintHtml: `${String(sample.blueprintHtml)}<script>x()</script>` },
    });
    expect(result).toMatchObject({
      valid: true,
      action: "send-blueprint",
      recipient: sample.email,
      ownerEmail: "owner@example.com",
    });
    expect(result.blueprintHtml).not.toContain("<script");
  });
});
