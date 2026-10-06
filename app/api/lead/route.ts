import { NextResponse } from "next/server";
import { leadRequestSchema } from "@/lib/n8n/types";
import { check } from "@/lib/rate-limit";

/**
 * Lead capture + "build this for me" requests.
 *
 * V1: forwards to an optional n8n lead webhook when configured, otherwise
 * records server-side only. Never creates or activates workflows — a
 * build-request is a specification request, nothing more.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!check(`lead:${ip}`, 10).allowed) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = leadRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please provide a first name and a valid email." },
      { status: 400 }
    );
  }

  const lead = parsed.data;
  const leadWebhookUrl = process.env.N8N_LEAD_WEBHOOK_URL;

  if (leadWebhookUrl) {
    try {
      await fetch(leadWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.N8N_WEBHOOK_SECRET
            ? { "x-webhook-secret": process.env.N8N_WEBHOOK_SECRET }
            : {}),
        },
        body: JSON.stringify({ ...lead, capturedAt: new Date().toISOString() }),
      });
    } catch (error) {
      // The visitor experience should not fail because CRM plumbing did.
      console.error("[api/lead] webhook forward failed:", error);
    }
  } else {
    console.log(
      "[api/lead] captured (no webhook configured):",
      JSON.stringify({ ...lead, email: lead.email.replace(/(.).+(@.*)/, "$1***$2") })
    );
  }

  return NextResponse.json({ ok: true });
}
