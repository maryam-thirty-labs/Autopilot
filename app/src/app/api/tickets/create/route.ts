import { getSupabaseServer, isSupabaseConfigured } from "@/lib/supabase";

interface Body {
  customer_name?: string;
  customer_email?: string;
  tool_used?: string | null;
  app_url?: string;
  repo_url?: string;
  error_message?: string;
  expected_behavior?: string;
  urgency?: string;
  source?: string;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.customer_email || !body.error_message) {
    return Response.json(
      { error: "email and error_message are required" },
      { status: 400 },
    );
  }

  // ── DEMO MODE: no Supabase configured ──
  if (!isSupabaseConfigured) {
    const ref = `T-${100 + Math.floor(Date.now() / 1000) % 900}`;
    return Response.json({ ref, demo: true });
  }

  const sb = getSupabaseServer();
  if (!sb) {
    return Response.json({ error: "Supabase server client unavailable" }, { status: 500 });
  }

  // human ref = T-(100 + current ticket count)
  const { count } = await sb.from("tickets").select("*", { count: "exact", head: true });
  const ref = `T-${100 + (count ?? 0)}`;

  const { data, error } = await sb
    .from("tickets")
    .insert({
      ref,
      source: body.source ?? "Submit form",
      customer_name: body.customer_name ?? null,
      customer_email: body.customer_email,
      tool_used: body.tool_used ?? null,
      app_url: body.app_url ?? null,
      repo_url: body.repo_url ?? null,
      error_message: body.error_message,
      expected_behavior: body.expected_behavior ?? null,
      issue_summary: body.error_message.slice(0, 120),
      urgency: body.urgency ?? "medium",
      status: "new",
      risk_level: "low",
      approval_required: false,
    })
    .select("id, ref")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // log the Front Desk intake event so the dashboard feed reflects it immediately
  await sb.from("agent_runs").insert({
    ticket_id: data.id,
    ticket_ref: data.ref,
    agent_name: "Front Desk",
    action: `Intake captured — ${body.tool_used ?? "app"} issue submitted`,
    tool_used: body.source === "Wassit" ? "Wassit" : "Submit form",
    status: "ok",
    requires_approval: false,
  });

  return Response.json({ ref: data.ref, id: data.id, demo: false });
}
