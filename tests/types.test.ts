import { describe, expect, it } from "vitest";
import {
  AgentContractError,
  agentRequestSchema,
  parseAgentResponse,
} from "@/lib/n8n/types";

const validBlueprint = {
  name: "Inbox to Sheet Autopilot",
  problem: "Customer enquiries are copied from Gmail into Excel by hand.",
  trigger: "New email arrives in Gmail matching enquiry keywords",
  inputs: ["Sender", "Subject", "Enquiry details"],
  steps: [
    { title: "Gmail Trigger", description: "Watch the inbox for enquiries.", kind: "deterministic" },
    { title: "Extract fields", description: "AI pulls name, need, urgency from messy text.", kind: "ai" },
    { title: "Append row", description: "Write the structured row to Google Sheets.", kind: "deterministic" },
  ],
  integrations: [{ name: "Gmail", role: "Source of enquiries" }],
  exceptions: ["Emails missing an order number are routed to a human."],
  outputs: ["New row in Google Sheets", "Confirmation email"],
  complexity: "beginner",
  difficulty: "easy",
  estimatedHoursSavedPerWeek: 5,
  assumptions: ["Enquiries arrive in a single shared inbox"],
};

describe("agentResponseSchema", () => {
  it("accepts a question response with quick replies", () => {
    const parsed = parseAgentResponse({
      status: "question",
      message: "How do those enquiries usually arrive?",
      quickReplies: [
        { label: "Gmail", value: "gmail" },
        { label: "Outlook", value: "outlook" },
      ],
    });
    expect(parsed.status).toBe("question");
    expect(parsed.quickReplies).toHaveLength(2);
  });

  it("accepts a blueprint response", () => {
    const parsed = parseAgentResponse({
      status: "blueprint",
      message: "Here is your automation blueprint.",
      blueprint: validBlueprint,
    });
    expect(parsed.blueprint?.steps.length).toBeGreaterThanOrEqual(3);
  });

  it("rejects status=blueprint without a blueprint object", () => {
    expect(() =>
      parseAgentResponse({ status: "blueprint", message: "missing" })
    ).toThrow(AgentContractError);
  });

  it("rejects junk", () => {
    expect(() => parseAgentResponse({ reply: "hello" })).toThrow(
      AgentContractError
    );
    expect(() => parseAgentResponse("just text")).toThrow(AgentContractError);
    expect(() => parseAgentResponse(null)).toThrow(AgentContractError);
  });

  it("rejects a blueprint with an out-of-range estimate", () => {
    expect(() =>
      parseAgentResponse({
        status: "blueprint",
        message: "bad estimate",
        blueprint: { ...validBlueprint, estimatedHoursSavedPerWeek: 900 },
      })
    ).toThrow(AgentContractError);
  });
});

describe("agentRequestSchema", () => {
  const session = { sessionId: "0f9c2c4e-1234", cardId: "N8N001" };

  it("accepts a first message with empty history", () => {
    const parsed = agentRequestSchema.parse({
      session,
      history: [],
      message: "Every morning I copy enquiries from email into Excel.",
    });
    expect(parsed.session.cardId).toBe("N8N001");
  });

  it("rejects a too-short message", () => {
    expect(() =>
      agentRequestSchema.parse({ session, history: [], message: "hi" })
    ).toThrow();
  });

  it("rejects a missing session", () => {
    expect(() =>
      agentRequestSchema.parse({ history: [], message: "long enough message" })
    ).toThrow();
  });
});
