import { getSupabaseServer, isSupabaseConfigured } from "@/lib/supabase";

interface Body {
  ticket_ref?: string;
  ticket_id?: string;
  agent_name: string;
  action: string;
  tool_used?: string;
  status?: string;
  requires_approval?: boolean;
  output?: Record<string, unknown>;
}

// Generic agent-event logger — lets Manus / scripts / webhooks append to the feed.
export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.agent_name || !body.action) {
    return Response.json({ error: "agent_name and action are required" }, { status: 400 });
  }
  if (!isSupabaseConfigured) {
    return Response.json({ ok: true, demo: true });
  }
  const sb = getSupabaseServer();
  if (!sb) return Response.json({ error: "Supabase unavailable" }, { status: 500 });

  // resolve ticket_id from ref if needed
  let ticketId = body.ticket_id ?? null;
  if (!ticketId && body.ticket_ref) {
    const { data } = await sb.from("tickets").select("id").eq("ref", body.ticket_ref).maybeSingle();
    ticketId = data?.id ?? null;
  }

  const { error } = await sb.from("agent_runs").insert({
    ticket_id: ticketId,
    ticket_ref: body.ticket_ref ?? null,
    agent_name: body.agent_name,
    action: body.action,
    tool_used: body.tool_used ?? null,
    status: body.status ?? "ok",
    requires_approval: body.requires_approval ?? false,
    output: body.output ?? null,
  });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, demo: false });
}
