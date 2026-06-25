import { getSupabaseServer, isSupabaseConfigured } from "@/lib/supabase";
import { isModalConfigured, runModalCheck } from "@/lib/integrations/modal";

interface Body {
  ticket_ref?: string;
  ticket_id?: string;
  repo_url?: string;
  code?: string;
}

// Phase 6 — QA Guard runs a sandboxed build + safety check on Modal, writes a
// tool_event + agent_run, and returns the result. Works without a Modal URL (demo).
export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sb = isSupabaseConfigured ? getSupabaseServer() : null;

  // resolve ticket id + repo from Supabase when possible
  let ticketId = body.ticket_id ?? null;
  let ref = body.ticket_ref ?? null;
  let repoUrl = body.repo_url ?? null;
  if (sb && (ref || ticketId)) {
    const q = ref ? { col: "ref", val: ref } : { col: "id", val: ticketId! };
    const { data } = await sb
      .from("tickets")
      .select("id, ref, repo_url")
      .eq(q.col, q.val)
      .maybeSingle();
    if (data) {
      ticketId = data.id;
      ref = data.ref;
      repoUrl = repoUrl ?? data.repo_url;
    }
  }

  let out;
  try {
    out = await runModalCheck({ ticket_ref: ref ?? undefined, repo_url: repoUrl ?? undefined, code: body.code });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Modal error" }, { status: 502 });
  }
  const { result, demo } = out;

  if (sb && ticketId) {
    const summary = `Modal sandbox: ${result.command} — ${result.status} in ${result.duration}, ${
      result.secrets_detected ? "secrets found" : "no secrets"
    }`;
    await sb.from("tool_events").insert({
      ticket_id: ticketId,
      tool_name: "Modal",
      event_summary: summary,
      status: result.status === "passed" ? "ok" : "warn",
    });
    await sb.from("agent_runs").insert({
      ticket_id: ticketId,
      ticket_ref: ref,
      agent_name: "QA Guard",
      action: summary + (demo ? " (demo)" : ""),
      tool_used: "Modal",
      status: result.status === "passed" ? "ok" : "warn",
      requires_approval: false,
    });
  }

  return Response.json({ result, demo, modal_live: isModalConfigured });
}
