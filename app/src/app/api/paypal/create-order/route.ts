import { getSupabaseServer, isSupabaseConfigured } from "@/lib/supabase";
import { createPaypalOrder, isPaypalConfigured } from "@/lib/integrations/paypal";

interface Body {
  ticket_ref?: string;
  ticket_id?: string;
  amount?: number;
  currency?: string;
  description?: string;
}

// Phase 5 — Finance Clerk creates a PayPal sandbox checkout for a ticket,
// writes a payments row, and logs the agent event. Works without keys (demo link).
export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sb = isSupabaseConfigured ? getSupabaseServer() : null;

  // resolve ticket + amount from Supabase when possible
  let ticketId = body.ticket_id ?? null;
  let ref = body.ticket_ref ?? null;
  let amount = body.amount ?? null;
  let currency = body.currency ?? "GBP";

  if (sb && (ref || ticketId)) {
    const q = ref ? { col: "ref", val: ref } : { col: "id", val: ticketId! };
    const { data } = await sb
      .from("tickets")
      .select("id, ref, suggested_price, currency")
      .eq(q.col, q.val)
      .maybeSingle();
    if (data) {
      ticketId = data.id;
      ref = data.ref;
      amount = amount ?? data.suggested_price;
      currency = data.currency ?? currency;
    }
  }

  if (!ref) ref = "T-000";
  if (amount == null) amount = 99;

  let order;
  try {
    order = await createPaypalOrder({
      amount,
      currency,
      reference: ref,
      description: body.description ?? `Thirty Labs repair — ${ref}`,
    });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "PayPal error" }, { status: 502 });
  }

  // persist the payment + Finance Clerk event (live mode only)
  if (sb && ticketId) {
    await sb.from("payments").insert({
      ticket_id: ticketId,
      provider: "PayPal",
      amount,
      currency,
      checkout_url: order.approveUrl,
      status: "created",
    });
    await sb.from("agent_runs").insert({
      ticket_id: ticketId,
      ticket_ref: ref,
      agent_name: "Finance Clerk",
      action: `Created ${currency === "GBP" ? "£" : ""}${amount} PayPal ${order.demo ? "(demo)" : "sandbox"} checkout`,
      tool_used: "PayPal",
      status: "ok",
      requires_approval: false,
    });
  }

  return Response.json({
    checkout_url: order.approveUrl,
    order_id: order.orderId,
    amount,
    currency,
    paypal_live: isPaypalConfigured,
    demo: order.demo,
  });
}
