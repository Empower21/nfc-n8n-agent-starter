import type { AgentRequest, AgentResponse } from "./types";
import { MockAgentAdapter } from "./mock-adapter";
import { WebhookAgentAdapter } from "./webhook-adapter";

/**
 * Server-side boundary between the app and whatever provides agent
 * intelligence. The browser only ever talks to /api/agent; this adapter
 * decides whether that means a deterministic engine or a real n8n Agent.
 */
export interface AgentAdapter {
  send(request: AgentRequest): Promise<AgentResponse>;
}

export type N8nMode = "mock" | "demo" | "real";

export function resolveMode(raw: string | undefined): N8nMode {
  if (raw === "real" || raw === "mock" || raw === "demo") return raw;
  return "demo";
}

let cached: { mode: N8nMode; adapter: AgentAdapter } | null = null;

export function getAdapter(): AgentAdapter {
  const mode = resolveMode(process.env.N8N_MODE);
  if (cached?.mode === mode) return cached.adapter;

  const adapter: AgentAdapter =
    mode === "real"
      ? new WebhookAgentAdapter({
          webhookUrl: process.env.N8N_WEBHOOK_URL ?? "",
          secret: process.env.N8N_WEBHOOK_SECRET,
        })
      : new MockAgentAdapter();

  cached = { mode, adapter };
  return adapter;
}
