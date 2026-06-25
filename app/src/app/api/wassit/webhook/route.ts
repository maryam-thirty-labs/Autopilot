import { getSupabaseServer, isSupabaseConfigured } from "@/lib/supabase";
import { parseWassitPayload } from "@/lib/integrations/wassit";

// Phase 7 — Wassit front-desk webhook. Receives a chat payload and opens a
// ticket (source = Wassit). Works in demo mode (returns a demo ref) so it's
// testable before the real Wassit account is connected.
export async function POST(request: Request) {
  let raw: Record<string, unknown>;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const intake = parseWassitPayload(raw);
  if (!intake) {
    return Response.json({ error: "Could not parse a message from the payload" }, { status: 400 });
  }

  if (!isSupabaseConfigured) {
    const ref = `T-${100 + Math.floor(Date.now() / 1000) % 900}`;
    return Response.json({ ref, demo: true, source: "Wassit" });
  }

  const sb = getSupabaseServer();
  if (!sb) return Response.json({ error: "Supabase unavailable" }, { status: 500 });

  const { count } = await sb.from("tickets").select("*", { count: "exact", head: true });
  const ref = `T-${100 + (count ?? 0)}`;

  const { data, error } = await sb
    .from("tickets")
    .insert({
      ref,
      source: "Wassit",
      customer_name: intake.customer_name ?? null,
      customer_email: intake.customer_email ?? null,
      tool_used: intake.tool_used ?? null,
      error_message: intake.message,
      issue_summary: intake.message.slice(0, 120),
      status: "new",
      risk_level: "low",
      approval_required: false,
    })
    .select("id, ref")
    .single();

  if (error) return Response.json({ error: error.message }, { status: 500 });

  await sb.from("agent_runs").insert({
    ticket_id: data.id,
    ticket_ref: data.ref,
    agent_name: "Front Desk",
    action: "Wassit chat intake — new ticket opened",
    tool_used: "Wassit",
    status: "ok",
    requires_approval: false,
  });

  return Response.json({ ref: data.ref, id: data.id, demo: false, source: "Wassit" });
}
