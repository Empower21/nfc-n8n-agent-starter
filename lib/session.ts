import type { DiscoverySession } from "@/lib/n8n/types";

const STORAGE_KEY = "tap-to-automate:session";

export interface EntryParams {
  cardId: string;
  source?: string;
  campaign?: string;
}

/**
 * Create or restore the visitor's discovery session (client-side only).
 * A refresh mid-conversation keeps the same session ID; a new card tap
 * starts a fresh one.
 */
export function getOrCreateSession(params: EntryParams): DiscoverySession {
  if (typeof window === "undefined") {
    return { sessionId: "server-render", ...params };
  }

  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as DiscoverySession;
      if (parsed.cardId === params.cardId && parsed.sessionId) {
        return parsed;
      }
    }
  } catch {
    // Corrupt storage — fall through to a fresh session.
  }

  const session: DiscoverySession = {
    sessionId:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    cardId: params.cardId,
    source: params.source,
    campaign: params.campaign,
  };

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Private mode etc. — session just won't survive a refresh.
  }

  return session;
}
