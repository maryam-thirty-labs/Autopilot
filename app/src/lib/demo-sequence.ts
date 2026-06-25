// The scripted T-102 sequence — the spine of the demo (Phase 3).
// One source of truth, played two ways:
//   • client player (demo mode): drips steps into dashboard state on a timer
//   • /api/agents/run-demo (live mode): inserts the same steps into Supabase
//
// Each step carries the agent_run to emit, plus optional side effects: a status
// transition on T-102, a payment row, and safety flags.

import type { Payment, RunStatus, SafetyFlag, TicketStatus } from "./types";

export interface DemoStep {
  delayMs: number; // gap AFTER the previous step
  agent_name: string;
  action: string;
  tool_used: string;
  status: RunStatus;
  requires_approval?: boolean;
  setStatus?: TicketStatus; // advance the T-102 ticket
  addPayment?: Pick<Payment, "amount" | "currency" | "checkout_url" | "status">;
  addFlags?: Pick<SafetyFlag, "flag_type" | "severity" | "description" | "requires_approval" | "resolved">[];
}

export const DEMO_TICKET_REF = "T-102";

export const DEMO_SEQUENCE: DemoStep[] = [
  {
    delayMs: 0, agent_name: "Front Desk", tool_used: "Wassit", status: "ok",
    action: "Wassit intake — captured Lovable+Supabase issue: signup ok, dashboard crashes",
    setStatus: "diagnosing",
  },
  {
    delayMs: 1600, agent_name: "Operator", tool_used: "Manus AI", status: "ok",
    action: "Picked up T-102, scored intent 86/100, routed to diagnosis",
  },
  {
    delayMs: 1600, agent_name: "Diagnoser", tool_used: "Manus AI + Supabase", status: "ok",
    action: "Classified as Auth/RLS — missing INSERT policy on profiles table",
  },
  {
    delayMs: 1600, agent_name: "Diagnoser", tool_used: "Manus AI", status: "ok",
    action: "Root cause confirmed: no row inserted into profiles after signup — confidence 86%",
  },
  {
    delayMs: 1800, agent_name: "Repair Engineer", tool_used: "Cursor", status: "ok",
    action: "Generated SQL patch in Cursor — RLS insert policy + handle_new_user trigger",
    setStatus: "patch_ready",
  },
  {
    delayMs: 1800, agent_name: "QA Guard", tool_used: "Modal", status: "ok",
    action: "Modal sandbox: npm run build passed in 38s, no secrets detected",
    setStatus: "qa_passed",
    addFlags: [
      { flag_type: "secret_detected", severity: "info", description: "No secrets found in submitted scope", requires_approval: false, resolved: true },
    ],
  },
  {
    delayMs: 1800, agent_name: "Finance Clerk", tool_used: "PayPal", status: "ok",
    action: "Created £99 Auth Rescue PayPal sandbox checkout — logged to Supabase",
    setStatus: "payment",
    addPayment: { amount: 99, currency: "GBP", checkout_url: "https://sandbox.paypal.com/checkoutnow?token=DEMO102", status: "created" },
  },
  {
    delayMs: 2000, agent_name: "Operator", tool_used: "Manus AI", status: "gate",
    requires_approval: true,
    action: "Trust boundary reached — production deploy + client delivery need human approval",
    setStatus: "approval",
    addFlags: [
      { flag_type: "production_db_access", severity: "high", description: "Patch is a production database change", requires_approval: true, resolved: false },
      { flag_type: "client_delivery", severity: "high", description: "Delivering the fix to the customer requires approval", requires_approval: true, resolved: false },
    ],
  },
];
