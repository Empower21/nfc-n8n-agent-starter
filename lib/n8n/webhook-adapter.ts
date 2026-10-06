import type { AgentAdapter } from "./adapter";
import {
  AgentContractError,
  parseAgentResponse,
  type AgentRequest,
  type AgentResponse,
} from "./types";

export interface WebhookAdapterConfig {
  webhookUrl: string;
  secret?: string;
  /** Milliseconds before the agent call is abandoned. */
  timeoutMs?: number;
}

/**
 * Real-mode adapter: forwards the conversation to the n8n Agent webhook
 * and validates the response against the shared contract. Only documented
 * n8n interfaces are used — a production Webhook node URL that the
 * workflow answers via Respond to Webhook.
 */
export class WebhookAgentAdapter implements AgentAdapter {
  constructor(private readonly config: WebhookAdapterConfig) {}

  async send(request: AgentRequest): Promise<AgentResponse> {
    if (!this.config.webhookUrl) {
      throw new AgentContractError(
        "N8N_WEBHOOK_URL is not configured but N8N_MODE=real"
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      this.config.timeoutMs ?? 20_000
    );

    try {
      const response = await fetch(this.config.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.config.secret
            ? { "x-webhook-secret": this.config.secret }
            : {}),
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new AgentContractError(
          `n8n webhook responded with HTTP ${response.status}`
        );
      }

      let raw: unknown;
      try {
        raw = await response.json();
      } catch {
        throw new AgentContractError("n8n webhook returned non-JSON output");
      }

      // n8n's Respond to Webhook node often wraps output in an array.
      const candidate = Array.isArray(raw) ? raw[0] : raw;
      return parseAgentResponse(candidate);
    } finally {
      clearTimeout(timeout);
    }
  }
}
