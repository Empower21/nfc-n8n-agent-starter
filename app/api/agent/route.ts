import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/n8n/adapter";
import { AgentContractError, agentRequestSchema } from "@/lib/n8n/types";
import { check } from "@/lib/rate-limit";

export async function POST(request: Request): Promise<NextResponse> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!check(`agent:${ip}`).allowed) {
    return NextResponse.json(
      { error: "Too many requests. Give the Agent a moment." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = agentRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please describe the task in a sentence or two." },
      { status: 400 }
    );
  }

  try {
    const response = await getAdapter().send(parsed.data);
    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof AgentContractError) {
      console.error("[api/agent] contract error:", error.message, error.issues);
      return NextResponse.json(
        { error: "The Agent sent back something unexpected. Try again." },
        { status: 502 }
      );
    }
    console.error("[api/agent] failure:", error);
    return NextResponse.json(
      { error: "Could not reach the Agent. Try again in a moment." },
      { status: 502 }
    );
  }
}
