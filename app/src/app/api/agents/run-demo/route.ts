import { getSupabaseServer, isSupabaseConfigured } from "@/lib/supabase";
import { DEMO_SEQUENCE, DEMO_TICKET_REF } from "@/lib/demo-sequence";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// scale the scripted gaps down a bit so the whole run fits comfortably in a request
const SPEED = 0.55;

// Phase 3 demo harness (live mode): drip the T-102 sequence into Supabase so the
// dashboard streams it via realtime. In demo mode the client player handles this instead.
export async function POST() {
  if (!isSupabaseConfigured) {
    return Response.json({ ok: true, demo: true });
  }
  const sb = getSupabaseServer();
  if (!sb) return Response.json({ error: "Supabase unavailable" }, { status: 500 });

  const { data: ticket } = await sb
    .from("tickets")
    .select("id")
    .eq("ref", DEMO_TICKET_REF)
    .maybeSingle();
  if (!ticket) {
    return Response.json({ error: `Ticket ${DEMO_TICKET_REF} not found — run seed.sql` }, { status: 404 });
  }
  const tid = ticket.id as string;

  // clean slate for a clean replay
  await sb.from("agent_runs").delete().eq("ticket_id", tid);
  await sb.from("payments").delete().eq("ticket_id", tid);
  await sb.from("safety_flags").delete().eq("ticket_id", tid);
  await sb.from("tickets").update({ status: "new" }).eq("id", tid);

  for (const step of DEMO_SEQUENCE) {
    await sleep(step.delayMs * SPEED);

    await sb.from("agent_runs").insert({
      ticket_id: tid,
      ticket_ref: DEMO_TICKET_REF,
      agent_name: step.agent_name,
      action: step.action,
      tool_used: step.tool_used,
      status: step.status,
      requires_approval: step.requires_approval ?? false,
    });

    if (step.setStatus) {
      await sb.from("tickets").update({ status: step.setStatus }).eq("id", tid);
    }
    if (step.addPayment) {
      await sb.from("payments").insert({ ticket_id: tid, provider: "PayPal", ...step.addPayment });
    }
    if (step.addFlags) {
      await sb.from("safety_flags").insert(step.addFlags.map((f) => ({ ticket_id: tid, ...f })));
    }
  }

  return Response.json({ ok: true, demo: false, steps: DEMO_SEQUENCE.length });
}
