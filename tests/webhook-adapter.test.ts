import { afterEach, describe, expect, it, vi } from "vitest";
import { WebhookAgentAdapter } from "@/lib/n8n/webhook-adapter";
import { AgentContractError, type AgentRequest } from "@/lib/n8n/types";

const request: AgentRequest = {
  session: { sessionId: "test-session-01", cardId: "N8N001" },
  history: [],
  message: "Every morning I copy enquiries from email into Excel.",
};

const questionResponse = {
  status: "question",
  message: "How do those enquiries usually arrive?",
  quickReplies: [{ label: "Gmail", value: "gmail" }],
};

function mockFetch(status: number, body: unknown, asText = false) {
  return vi.fn(async () =>
    new Response(asText ? String(body) : JSON.stringify(body), {
      status,
      headers: { "Content-Type": asText ? "text/plain" : "application/json" },
    })
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("WebhookAgentAdapter", () => {
  const adapter = new WebhookAgentAdapter({
    webhookUrl: "https://n8n.example.com/webhook/tap-to-automate",
    secret: "s3cret",
  });

  it("posts the request and parses a valid response", async () => {
    const fetchMock = mockFetch(200, questionResponse);
    vi.stubGlobal("fetch", fetchMock);

    const response = await adapter.send(request);
    expect(response.status).toBe("question");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/webhook/tap-to-automate");
    expect((init.headers as Record<string, string>)["x-webhook-secret"]).toBe("s3cret");
    expect(JSON.parse(init.body as string).message).toBe(request.message);
  });

  it("unwraps array-wrapped n8n output", async () => {
    vi.stubGlobal("fetch", mockFetch(200, [questionResponse]));
    const response = await adapter.send(request);
    expect(response.message).toContain("enquiries");
  });

  it("throws AgentContractError on non-200", async () => {
    vi.stubGlobal("fetch", mockFetch(500, { message: "boom" }));
    await expect(adapter.send(request)).rejects.toThrow(AgentContractError);
  });

  it("throws AgentContractError on non-JSON output", async () => {
    vi.stubGlobal("fetch", mockFetch(200, "Workflow was started", true));
    await expect(adapter.send(request)).rejects.toThrow(AgentContractError);
  });

  it("throws AgentContractError on contract-violating JSON", async () => {
    vi.stubGlobal("fetch", mockFetch(200, { reply: "hello there" }));
    await expect(adapter.send(request)).rejects.toThrow(AgentContractError);
  });

  it("throws when the webhook URL is missing", async () => {
    const unconfigured = new WebhookAgentAdapter({ webhookUrl: "" });
    await expect(unconfigured.send(request)).rejects.toThrow(
      /N8N_WEBHOOK_URL/
    );
  });
});
