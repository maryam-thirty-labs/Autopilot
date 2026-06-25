// Phase 7 — Wassit integration (server-only).
// Wassit is the Front Desk: customer chat intake. The realistic minimum is a
// webhook that turns a chat conversation into a ticket — see
// /api/wassit/webhook, which is live and works in demo mode. This module just
// centralises config + (later) any outbound calls back to Wassit.

const WASSIT_API_KEY = process.env.WASSIT_API_KEY;

export const isWassitConfigured = Boolean(WASSIT_API_KEY);

export interface WassitIntake {
  customer_name?: string;
  customer_email?: string;
  tool_used?: string;
  message: string; // the customer's described problem
}

/**
 * Normalise a raw Wassit webhook payload into our intake shape. Adjust the
 * field mapping once the real Wassit payload format is confirmed.
 */
export function parseWassitPayload(body: Record<string, unknown>): WassitIntake | null {
  const message =
    (body.message as string) ?? (body.text as string) ?? (body.last_message as string);
  if (!message) return null;
  return {
    customer_name: (body.name as string) ?? (body.customer_name as string) ?? undefined,
    customer_email: (body.email as string) ?? (body.customer_email as string) ?? undefined,
    tool_used: (body.tool as string) ?? undefined,
    message,
  };
}
