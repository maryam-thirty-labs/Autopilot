import { getSupabaseServer, isSupabaseConfigured } from "@/lib/supabase";
import {
  DEMO_PAYMENTS,
  DEMO_REPAIRS,
  DEMO_RUNS,
  DEMO_SAFETY_FLAGS,
  DEMO_TICKETS,
} from "@/lib/demo-data";

// Reset the demo board: wipe everything and re-seed the canonical T-102 story.
// Clears any tickets created during rehearsal (T-108, T-109, …).
const ZERO = "00000000-0000-0000-0000-000000000000";

export async function POST() {
  if (!isSupabaseConfigured) return Response.json({ ok: true, demo: true });
  const sb = getSupabaseServer();
  if (!sb) return Response.json({ error: "Supabase unavailable" }, { status: 500 });

  // wipe (children first; tickets has ON DELETE CASCADE but explicit is safe)
  for (const t of ["agent_runs", "payments", "safety_flags", "tool_events", "repair_plans", "tickets"]) {
    await sb.from(t).delete().neq("id", ZERO);
  }

  // re-seed tickets (per-row: objects have non-uniform keys)
  const idByRef: Record<string, string> = {};
  for (const t of DEMO_TICKETS) {
    const { id: _drop, ...row } = t;
    void _drop;
    const { data } = await sb.from("tickets").insert(row).select("id, ref").single();
    if (data) idByRef[data.ref] = data.id as string;
  }
  const refByOldId = Object.fromEntries(DEMO_TICKETS.map((t) => [t.id, t.ref]));

  await sb.from("agent_runs").insert(
    DEMO_RUNS.map((r) => ({
      ticket_id: r.ticket_ref ? idByRef[r.ticket_ref] : null,
      ticket_ref: r.ticket_ref,
      agent_name: r.agent_name,
      action: r.action,
      tool_used: r.tool_used,
      status: r.status,
      requires_approval: r.requires_approval,
      created_at: r.created_at,
    })),
  );

  await sb.from("repair_plans").insert(
    DEMO_REPAIRS.map((rp) => ({
      ticket_id: rp.ticket_id ? idByRef[refByOldId[rp.ticket_id]] : null,
      diagnosis: rp.diagnosis,
      repair_steps: rp.repair_steps,
      patch_summary: rp.patch_summary,
      patch_diff: rp.patch_diff,
      risk_level: rp.risk_level,
      created_at: rp.created_at,
    })),
  );

  await sb.from("payments").insert(
    DEMO_PAYMENTS.map((p) => ({
      ticket_id: p.ticket_id ? idByRef[refByOldId[p.ticket_id]] : null,
      provider: p.provider,
      amount: p.amount,
      currency: p.currency,
      checkout_url: p.checkout_url,
      status: p.status,
      created_at: p.created_at,
    })),
  );

  await sb.from("safety_flags").insert(
    DEMO_SAFETY_FLAGS.map((f) => ({
      ticket_id: f.ticket_id ? idByRef[refByOldId[f.ticket_id]] : null,
      flag_type: f.flag_type,
      severity: f.severity,
      description: f.description,
      requires_approval: f.requires_approval,
      resolved: f.resolved,
      created_at: f.created_at,
    })),
  );

  return Response.json({ ok: true, tickets: DEMO_TICKETS.length });
}
