import { describe, expect, it } from "vitest";
import { MockAgentAdapter } from "@/lib/n8n/mock-adapter";
import type { AgentRequest, AgentResponse, AgentTurn } from "@/lib/n8n/types";

const session = { sessionId: "test-session-01", cardId: "N8N001" };

function req(message: string, history: AgentTurn[] = []): AgentRequest {
  return { session, history, message };
}

/** Drive a full conversation: answer every question until a blueprint appears. */
async function runConversation(
  adapter: MockAgentAdapter,
  firstMessage: string,
  answer: (turn: number) => string,
  maxTurns = 8
): Promise<{ final: AgentResponse; questionCount: number }> {
  const history: AgentTurn[] = [];
  let message = firstMessage;
  for (let turn = 0; turn < maxTurns; turn++) {
    const response = await adapter.send(req(message, history));
    if (response.status === "blueprint") {
      return { final: response, questionCount: turn };
    }
    history.push({ role: "user", content: message });
    history.push({ role: "agent", content: response.message });
    message = answer(turn);
  }
  throw new Error("Conversation never produced a blueprint");
}

describe("MockAgentAdapter", () => {
  const adapter = new MockAgentAdapter();

  it("asks a contextual question with quick replies for a gmail-ish task", async () => {
    const response = await adapter.send(
      req("Every morning I manually copy customer enquiries from email into Excel.")
    );
    expect(response.status).toBe("question");
    expect(response.quickReplies?.length).toBeGreaterThan(0);
    expect(response.quickReplies?.map((q) => q.label)).toContain("Gmail");
  });

  it("reaches a gmail blueprint after the scripted follow-ups", async () => {
    const { final, questionCount } = await runConversation(
      adapter,
      "Every morning I manually copy customer enquiries from email into Excel.",
      () => "Gmail, and it should end up in Google Sheets"
    );
    expect(questionCount).toBeGreaterThanOrEqual(2);
    expect(questionCount).toBeLessThanOrEqual(5);
    expect(final.blueprint?.name).toBe("Inbox-to-Sheet Autopilot");
    const kinds = final.blueprint!.steps.map((s) => s.kind);
    expect(kinds).toContain("ai");
    expect(kinds).toContain("human");
    expect(kinds).toContain("deterministic");
  });

  it("matches the invoice and CRM scenarios", async () => {
    const invoice = await runConversation(
      adapter,
      "We reconcile invoices manually every Friday and it takes hours.",
      () => "PDF invoices against the bank statement, alert finance"
    );
    expect(invoice.final.blueprint?.name).toBe("Friday Reconciliation Robot");

    const crm = await runConversation(
      adapter,
      "Website leads get typed into our CRM by hand.",
      () => "Website form into HubSpot, qualify them first"
    );
    expect(crm.final.blueprint?.name).toBe("Lead Flow Fastlane");
  });

  it("falls back to a generic flow and still reaches a blueprint by turn 4", async () => {
    const { final, questionCount } = await runConversation(
      adapter,
      "I spend ages renaming photos from our site surveys.",
      (turn) => ["It starts when something arrives", "A spreadsheet", "It is the same steps every time"][turn]
    );
    expect(questionCount).toBeLessThanOrEqual(3);
    expect(final.blueprint?.name).toBe("Custom Task Autopilot");
    // "Same steps every time" answer → no AI step, per the deterministic-first principle.
    expect(final.blueprint!.steps.map((s) => s.kind)).not.toContain("ai");
    expect(final.blueprint!.estimatedHoursSavedPerWeek).toBeNull();
  });

  it("is deterministic: identical conversations produce identical output", async () => {
    const message = "Every morning I manually copy customer enquiries from email into Excel.";
    const a = await adapter.send(req(message));
    const b = await adapter.send(req(message));
    expect(a).toEqual(b);
  });
});
