import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as agentPost } from "@/app/api/agent/route";
import { POST as leadPost } from "@/app/api/lead/route";
import { resetRateLimits } from "@/lib/rate-limit";

function jsonRequest(body: unknown, ip = "203.0.113.10"): Request {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify(body),
  });
}

const validAgentBody = {
  session: { sessionId: "test-session-01", cardId: "N8N001" },
  history: [],
  message: "Every morning I manually copy customer enquiries from email into Excel.",
};

beforeEach(() => {
  resetRateLimits();
  vi.unstubAllEnvs();
});

describe("POST /api/agent", () => {
  it("returns a validated agent response for a valid request", async () => {
    const response = await agentPost(jsonRequest(validAgentBody));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe("question");
    expect(typeof data.message).toBe("string");
  });

  it("rejects a too-short message with 400", async () => {
    const response = await agentPost(
      jsonRequest({ ...validAgentBody, message: "hi" })
    );
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeTruthy();
  });

  it("rejects invalid JSON with 400", async () => {
    const response = await agentPost(
      new Request("http://localhost/api/agent", {
        method: "POST",
        body: "not json",
      })
    );
    expect(response.status).toBe(400);
  });

  it("rate-limits abusive callers with 429", async () => {
    let last: Response | null = null;
    for (let i = 0; i < 31; i++) {
      last = await agentPost(jsonRequest(validAgentBody, "198.51.100.7"));
    }
    expect(last!.status).toBe(429);
  });
});

describe("POST /api/lead", () => {
  const validLead = {
    session: { sessionId: "test-session-01", cardId: "N8N001" },
    firstName: "Avery",
    email: "avery@example.com",
    blueprintName: "Inbox-to-Sheet Autopilot",
    action: "send-blueprint",
  };

  it("accepts a valid lead", async () => {
    const response = await leadPost(jsonRequest(validLead));
    expect(response.status).toBe(200);
    expect((await response.json()).ok).toBe(true);
  });

  it("rejects an invalid email with 400", async () => {
    const response = await leadPost(
      jsonRequest({ ...validLead, email: "not-an-email" })
    );
    expect(response.status).toBe(400);
  });

  it("rejects a missing first name with 400", async () => {
    const response = await leadPost(
      jsonRequest({ ...validLead, firstName: "" })
    );
    expect(response.status).toBe(400);
  });
});
