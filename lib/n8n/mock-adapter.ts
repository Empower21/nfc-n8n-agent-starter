import type { AgentAdapter } from "./adapter";
import {
  buildGenericBlueprint,
  GENERIC_QUESTIONS,
  matchScenario,
} from "./scenarios";
import { parseAgentResponse, type AgentRequest, type AgentResponse } from "./types";

/**
 * Deterministic agent engine for mock and demo modes.
 *
 * Stateless by design: the conversation position is derived from the
 * request history on every call, so the server keeps no session state and
 * a page refresh mid-demo cannot corrupt anything.
 */
export class MockAgentAdapter implements AgentAdapter {
  async send(request: AgentRequest): Promise<AgentResponse> {
    const priorUserMessages = request.history
      .filter((turn) => turn.role === "user")
      .map((turn) => turn.content);
    const allUserMessages = [...priorUserMessages, request.message];

    const firstMessage = allUserMessages[0];
    const followUpAnswers = allUserMessages.slice(1);

    const scenario = matchScenario(firstMessage);
    const questions = scenario ? scenario.questions : GENERIC_QUESTIONS;

    let response: AgentResponse;
    if (followUpAnswers.length < questions.length) {
      const next = questions[followUpAnswers.length];
      response = {
        status: "question",
        message: next.message,
        quickReplies: next.quickReplies,
      };
    } else if (scenario) {
      response = {
        status: "blueprint",
        message: scenario.revealMessage,
        blueprint: scenario.blueprint,
      };
    } else {
      response = {
        status: "blueprint",
        message:
          "That's enough to design a first version. Here's the automation I'd build — simplest reliable architecture first.",
        blueprint: buildGenericBlueprint(firstMessage, followUpAnswers),
      };
    }

    // The demo engine honors the same contract we enforce on real n8n output.
    return parseAgentResponse(response);
  }
}
