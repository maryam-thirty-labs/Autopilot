import { getSupabaseServer, isSupabaseConfigured } from "./supabase";
import {
  DEMO_PAYMENTS,
  DEMO_REPAIRS,
  DEMO_RUNS,
  DEMO_SAFETY_FLAGS,
  DEMO_TICKETS,
} from "./demo-data";
import type {
  AgentRun,
  Payment,
  RepairPlan,
  SafetyFlag,
  Ticket,
} from "./types";

export interface TicketBundle {
  ticket: Ticket;
  runs: AgentRun[];
  repair: RepairPlan | null;
  payment: Payment | null;
  flags: SafetyFlag[];
}

/** Look up a ticket + everything attached to it, by ref ("T-102") or uuid. Works in live and demo modes. */
export async function getTicketBundle(idOrRef: string): Promise<TicketBundle | null> {
  if (isSupabaseConfigured) {
    const sb = getSupabaseServer();
    if (sb) {
      const { data: ticket } = await sb
        .from("tickets")
        .select("*")
        .or(`ref.eq.${idOrRef},id.eq.${idOrRef}`)
        .maybeSingle();
      if (ticket) {
        const id = (ticket as Ticket).id;
        const [runs, repair, payment, flags] = await Promise.all([
          sb.from("agent_runs").select("*").eq("ticket_id", id).order("created_at"),
          sb.from("repair_plans").select("*").eq("ticket_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
          sb.from("payments").select("*").eq("ticket_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
          sb.from("safety_flags").select("*").eq("ticket_id", id).order("created_at"),
        ]);
        return {
          ticket: ticket as Ticket,
          runs: (runs.data as AgentRun[]) ?? [],
          repair: (repair.data as RepairPlan) ?? null,
          payment: (payment.data as Payment) ?? null,
          flags: (flags.data as SafetyFlag[]) ?? [],
        };
      }
    }
  }

  // demo fallback
  const ticket = DEMO_TICKETS.find((t) => t.ref === idOrRef || t.id === idOrRef);
  if (!ticket) return null;
  return {
    ticket,
    runs: DEMO_RUNS.filter((r) => r.ticket_id === ticket.id),
    repair: DEMO_REPAIRS.find((r) => r.ticket_id === ticket.id) ?? null,
    payment: DEMO_PAYMENTS.find((p) => p.ticket_id === ticket.id) ?? null,
    flags: DEMO_SAFETY_FLAGS.filter((f) => f.ticket_id === ticket.id),
  };
}
