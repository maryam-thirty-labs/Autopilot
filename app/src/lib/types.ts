// DB row types — mirror supabase/schema.sql. Supabase is the single source of truth;
// the dashboard does not care whether a row came from a real agent, a webhook, or the demo harness.

export type TicketStatus =
  | "new"
  | "qualified"
  | "diagnosing"
  | "patch_ready"
  | "qa_passed"
  | "approval"
  | "payment"
  | "delivered";

export type RiskLevel = "low" | "medium" | "high";

// status of a single agent event in the feed
export type RunStatus = "ok" | "warn" | "err" | "run" | "gate";

export interface Ticket {
  id: string;
  ref: string; // human id, e.g. "T-102"
  source: string | null; // Wassit / Submit form / Manual
  customer_name: string | null;
  customer_email: string | null;
  tool_used: string | null;
  issue_summary: string | null;
  expected_behavior: string | null;
  repo_url: string | null;
  app_url: string | null;
  error_message: string | null;
  urgency: string | null;
  status: TicketStatus;
  issue_category: string | null;
  confidence_score: number | null;
  suggested_package: string | null;
  suggested_price: number | null;
  currency: string;
  // safety model — present from the start, not bolted on later
  risk_level: RiskLevel | null;
  approval_required: boolean;
  approval_reason: string | null;
  trust_boundary: string | null;
  created_at: string;
}

export interface AgentRun {
  id: string;
  ticket_id: string | null;
  ticket_ref: string | null;
  agent_name: string;
  action: string;
  tool_used: string | null;
  status: RunStatus;
  output: Record<string, unknown> | null;
  requires_approval: boolean;
  created_at: string;
}

export interface RepairPlan {
  id: string;
  ticket_id: string | null;
  diagnosis: string | null;
  repair_steps: string[] | null;
  patch_summary: string | null;
  patch_diff: string | null;
  risk_level: RiskLevel | null;
  created_at: string;
}

export interface Payment {
  id: string;
  ticket_id: string | null;
  provider: string;
  amount: number | null;
  currency: string;
  checkout_url: string | null;
  status: string | null;
  created_at: string;
}

export interface SafetyFlag {
  id: string;
  ticket_id: string | null;
  flag_type: string;
  severity: string | null;
  description: string | null;
  requires_approval: boolean;
  resolved: boolean;
  created_at: string;
}

export interface ToolEvent {
  id: string;
  ticket_id: string | null;
  tool_name: string;
  event_summary: string | null;
  status: string | null;
  created_at: string;
}

// ── Lead Scout (Phase 3.5) ──
// Proof that the company finds demand by itself: Scout finds posts about broken
// apps, Qualifier scores them, Outreach drafts a reply, a human gate blocks the
// send, and an approved lead converts into a ticket.
export type LeadStatus = "found" | "qualified" | "drafted" | "approval" | "converted";

export interface Lead {
  id: string;
  ref: string; // L-018
  platform: string; // Reddit / X / Discord
  signal: string; // the public post text
  likely_issue: string;
  intent_score: number;
  suggested_package: string;
  suggested_price: number;
  currency: string;
  outreach_draft: string;
  status: LeadStatus;
  converted_ref?: string;
}

// ── Kanban column model ──
export const STATUS_COLUMNS: { status: TicketStatus; label: string }[] = [
  { status: "new", label: "New Leads" },
  { status: "qualified", label: "Qualified" },
  { status: "diagnosing", label: "Diagnosing" },
  { status: "patch_ready", label: "Patch Ready" },
  { status: "qa_passed", label: "QA Passed" },
  { status: "approval", label: "Approval Needed" },
  { status: "payment", label: "Payment Created" },
  { status: "delivered", label: "Delivered" },
];

export const STATUS_LABEL: Record<TicketStatus, string> = Object.fromEntries(
  STATUS_COLUMNS.map((c) => [c.status, c.label]),
) as Record<TicketStatus, string>;
