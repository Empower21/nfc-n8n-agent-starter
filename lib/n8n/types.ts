import { z } from "zod";

// ---------- Core value objects ----------

export const complexitySchema = z.enum(["beginner", "intermediate", "advanced"]);
export type Complexity = z.infer<typeof complexitySchema>;

export const difficultySchema = z.enum(["easy", "moderate", "hard"]);
export type Difficulty = z.infer<typeof difficultySchema>;

export const quickReplySchema = z.object({
  label: z.string().min(1).max(60),
  value: z.string().min(1).max(200),
});
export type QuickReply = z.infer<typeof quickReplySchema>;

// Every step declares whether it is deterministic workflow logic, an AI
// reasoning step, or a human approval gate — the spec's core teaching point.
export const stepKindSchema = z.enum(["deterministic", "ai", "human"]);
export type StepKind = z.infer<typeof stepKindSchema>;

export const automationStepSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().min(1).max(400),
  kind: stepKindSchema,
});
export type AutomationStep = z.infer<typeof automationStepSchema>;

export const integrationRecommendationSchema = z.object({
  name: z.string().min(1).max(60),
  role: z.string().min(1).max(200),
});
export type IntegrationRecommendation = z.infer<
  typeof integrationRecommendationSchema
>;

export const automationBlueprintSchema = z.object({
  name: z.string().min(1).max(120),
  problem: z.string().min(1).max(600),
  trigger: z.string().min(1).max(200),
  inputs: z.array(z.string().min(1).max(200)).min(1),
  steps: z.array(automationStepSchema).min(2),
  integrations: z.array(integrationRecommendationSchema).min(1),
  exceptions: z.array(z.string().min(1).max(300)).default([]),
  outputs: z.array(z.string().min(1).max(200)).min(1),
  complexity: complexitySchema,
  difficulty: difficultySchema,
  estimatedHoursSavedPerWeek: z.number().min(0).max(80).nullable(),
  assumptions: z.array(z.string().min(1).max(300)).default([]),
});
export type AutomationBlueprint = z.infer<typeof automationBlueprintSchema>;

// ---------- Agent response contract ----------

export const agentResponseSchema = z
  .object({
    status: z.enum(["question", "blueprint"]),
    message: z.string().min(1).max(2000),
    quickReplies: z.array(quickReplySchema).max(6).optional(),
    blueprint: automationBlueprintSchema.optional(),
  })
  .refine((r) => r.status !== "blueprint" || r.blueprint !== undefined, {
    message: "status=blueprint requires a blueprint object",
    path: ["blueprint"],
  });
export type AgentResponse = z.infer<typeof agentResponseSchema>;

// ---------- Request contract (browser → API → adapter → n8n) ----------

export const discoverySessionSchema = z.object({
  sessionId: z.string().min(8).max(64),
  cardId: z.string().min(1).max(32),
  source: z.string().max(64).optional(),
  campaign: z.string().max(64).optional(),
});
export type DiscoverySession = z.infer<typeof discoverySessionSchema>;

export const agentTurnSchema = z.object({
  role: z.enum(["user", "agent"]),
  content: z.string().min(1).max(2000),
});
export type AgentTurn = z.infer<typeof agentTurnSchema>;

export const agentRequestSchema = z.object({
  session: discoverySessionSchema,
  history: z.array(agentTurnSchema).max(40).default([]),
  message: z.string().min(3).max(2000),
});
export type AgentRequest = z.infer<typeof agentRequestSchema>;

// ---------- Lead contract ----------

export const leadRequestSchema = z.object({
  session: discoverySessionSchema,
  firstName: z.string().min(1).max(80),
  email: z.string().email().max(200),
  blueprintName: z.string().max(120).optional(),
  action: z.enum(["send-blueprint", "build-request"]).default("send-blueprint"),
});
export type LeadRequest = z.infer<typeof leadRequestSchema>;

// ---------- Parsing helpers ----------

export class AgentContractError extends Error {
  constructor(message: string, public readonly issues?: unknown) {
    super(message);
    this.name = "AgentContractError";
  }
}

/**
 * Validate anything claiming to be an agent response (n8n output, demo
 * engine output). Throws AgentContractError so callers can map it to a
 * graceful 502 instead of leaking malformed model output to the browser.
 */
export function parseAgentResponse(raw: unknown): AgentResponse {
  const result = agentResponseSchema.safeParse(raw);
  if (!result.success) {
    throw new AgentContractError(
      "Agent returned a response that does not match the contract",
      result.error.issues
    );
  }
  return result.data;
}
