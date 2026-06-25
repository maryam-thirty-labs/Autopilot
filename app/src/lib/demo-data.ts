// Local demo dataset used when Supabase isn't configured (and as the seed for supabase/seed.sql).
// Everything is a Supabase-shaped row so the dashboard renders identically in both modes.
// Fixed ids + ISO timestamps (no Date.now / Math.random) to keep SSR hydration deterministic.

import type {
  AgentRun,
  Payment,
  RepairPlan,
  SafetyFlag,
  Ticket,
  ToolEvent,
} from "./types";

const D = "2026-06-25";
const at = (hhmm: string) => `${D}T${hhmm}:00Z`;

/** "2026-06-25T18:04:00Z" -> "18:04" (deterministic, locale-free). */
export function hhmm(iso: string): string {
  return iso.slice(11, 16);
}

export const DEMO_TICKETS: Ticket[] = [
  {
    id: "demo-t-102",
    ref: "T-102",
    source: "Wassit",
    customer_name: "Priya N.",
    customer_email: "priya@launchpad.app",
    tool_used: "Lovable + Supabase",
    issue_summary: "Signup works, but the dashboard crashes — no profile row is created",
    expected_behavior:
      "After signup a row should be inserted into profiles, and the dashboard should load the user's profile.",
    repo_url: "https://github.com/launchpad/app",
    app_url: "https://launchpad.vercel.app",
    error_message: "TypeError: Cannot read properties of null (reading 'full_name') — profiles row missing",
    urgency: "high",
    status: "approval",
    issue_category: "Auth / RLS",
    confidence_score: 86,
    suggested_package: "Supabase / Auth Rescue",
    suggested_price: 99,
    currency: "GBP",
    risk_level: "high",
    approval_required: true,
    approval_reason: "Patch is a production database change + client delivery — requires human approval.",
    trust_boundary: "Production deploy and client delivery require approval",
    created_at: at("18:02"),
  },
  {
    id: "demo-l-201",
    ref: "L-201",
    source: "Operator (Manus AI)",
    customer_name: null,
    customer_email: null,
    tool_used: "Bolt + Vercel",
    issue_summary: "Vercel deploy failing after Bolt changes",
    expected_behavior: null,
    repo_url: null,
    app_url: null,
    error_message: null,
    urgency: "medium",
    status: "new",
    issue_category: "Deploy / Config",
    confidence_score: 71,
    suggested_package: null,
    suggested_price: null,
    currency: "GBP",
    risk_level: "low",
    approval_required: false,
    approval_reason: null,
    trust_boundary: null,
    created_at: at("18:33"),
  },
  {
    id: "demo-l-202",
    ref: "L-202",
    source: "Operator (Manus AI)",
    customer_name: null,
    customer_email: null,
    tool_used: "Supabase",
    issue_summary: "Supabase storage not uploading files",
    expected_behavior: null,
    repo_url: null,
    app_url: null,
    error_message: null,
    urgency: "low",
    status: "new",
    issue_category: "Storage",
    confidence_score: 64,
    suggested_package: null,
    suggested_price: null,
    currency: "GBP",
    risk_level: "low",
    approval_required: false,
    approval_reason: null,
    trust_boundary: null,
    created_at: at("18:31"),
  },
  {
    id: "demo-t-103",
    ref: "T-103",
    source: "Submit form",
    customer_name: "Marcus",
    customer_email: "marcus@indie.dev",
    tool_used: "Lovable",
    issue_summary: "Lovable auth — users not persisting on refresh",
    expected_behavior: "Session should persist across reloads.",
    repo_url: null,
    app_url: null,
    error_message: null,
    urgency: "medium",
    status: "qualified",
    issue_category: "Auth / Session",
    confidence_score: 79,
    suggested_package: null,
    suggested_price: null,
    currency: "GBP",
    risk_level: "low",
    approval_required: false,
    approval_reason: null,
    trust_boundary: null,
    created_at: at("17:58"),
  },
  {
    id: "demo-t-104",
    ref: "T-104",
    source: "Submit form",
    customer_name: "Dana",
    customer_email: "dana@shopkit.io",
    tool_used: "v0 + Stripe",
    issue_summary: "v0 + Stripe webhooks not firing on prod",
    expected_behavior: "Subscription state should update after checkout.",
    repo_url: null,
    app_url: null,
    error_message: null,
    urgency: "high",
    status: "diagnosing",
    issue_category: "Payments / Webhooks",
    confidence_score: 68,
    suggested_package: null,
    suggested_price: null,
    currency: "GBP",
    risk_level: "medium",
    approval_required: false,
    approval_reason: null,
    trust_boundary: null,
    created_at: at("17:46"),
  },
  {
    id: "demo-t-105",
    ref: "T-105",
    source: "Submit form",
    customer_name: "Ife",
    customer_email: "ife@boltbuild.app",
    tool_used: "Bolt + Supabase",
    issue_summary: "Bolt + Supabase — RLS blocks all reads on orders",
    expected_behavior: "Users should read their own orders.",
    repo_url: null,
    app_url: null,
    error_message: null,
    urgency: "medium",
    status: "patch_ready",
    issue_category: "Auth / RLS",
    confidence_score: 81,
    suggested_package: "Supabase / Auth Rescue",
    suggested_price: 99,
    currency: "GBP",
    risk_level: "medium",
    approval_required: true,
    approval_reason: "Touches RLS policies — review before apply.",
    trust_boundary: "Production deploy requires approval",
    created_at: at("17:30"),
  },
  {
    id: "demo-t-106",
    ref: "T-106",
    source: "Submit form",
    customer_name: "Sam",
    customer_email: "sam@edgeapp.dev",
    tool_used: "Vercel",
    issue_summary: "Deploy Rescue — Vercel env config drift",
    expected_behavior: "Build should pick up Supabase env vars.",
    repo_url: null,
    app_url: null,
    error_message: null,
    urgency: "medium",
    status: "payment",
    issue_category: "Deploy / Config",
    confidence_score: 88,
    suggested_package: "Deploy Rescue",
    suggested_price: 49,
    currency: "GBP",
    risk_level: "low",
    approval_required: false,
    approval_reason: null,
    trust_boundary: null,
    created_at: at("17:12"),
  },
  {
    id: "demo-t-100",
    ref: "T-100",
    source: "Submit form",
    customer_name: "Lena",
    customer_email: "lena@cursorbuild.dev",
    tool_used: "Cursor + Supabase",
    issue_summary: "Cursor/Supabase — schema migration drift",
    expected_behavior: "Migrations should match production schema.",
    repo_url: null,
    app_url: null,
    error_message: null,
    urgency: "low",
    status: "delivered",
    issue_category: "Database",
    confidence_score: 90,
    suggested_package: "MVP Rescue",
    suggested_price: 99,
    currency: "GBP",
    risk_level: "low",
    approval_required: false,
    approval_reason: null,
    trust_boundary: null,
    created_at: at("14:05"),
  },
];

// Agent feed — the T-102 eight-step sequence is the spine of the demo.
// Ordered oldest → newest; the dashboard reverses for display.
export const DEMO_RUNS: AgentRun[] = [
  {
    id: "r1", ticket_id: "demo-t-102", ticket_ref: "T-102", agent_name: "Front Desk",
    action: "Wassit intake — captured Lovable+Supabase issue: signup ok, dashboard crashes",
    tool_used: "Wassit", status: "ok", output: null, requires_approval: false, created_at: at("18:02"),
  },
  {
    id: "r2", ticket_id: "demo-t-102", ticket_ref: "T-102", agent_name: "Operator",
    action: "Picked up T-102, scored intent 86/100, routed to diagnosis",
    tool_used: "Manus AI", status: "ok", output: null, requires_approval: false, created_at: at("18:04"),
  },
  {
    id: "r3", ticket_id: "demo-t-102", ticket_ref: "T-102", agent_name: "Diagnoser",
    action: "Classified as Auth/RLS — missing INSERT policy on profiles table",
    tool_used: "Manus AI + Supabase", status: "ok", output: null, requires_approval: false, created_at: at("18:07"),
  },
  {
    id: "r4", ticket_id: "demo-t-102", ticket_ref: "T-102", agent_name: "Diagnoser",
    action: "Root cause confirmed: no row inserted into profiles after signup — confidence 86%",
    tool_used: "Manus AI", status: "ok", output: null, requires_approval: false, created_at: at("18:09"),
  },
  {
    id: "r5", ticket_id: "demo-t-102", ticket_ref: "T-102", agent_name: "Repair Engineer",
    action: "Generated SQL patch in Cursor — RLS insert policy + handle_new_user trigger",
    tool_used: "Cursor", status: "ok", output: null, requires_approval: false, created_at: at("18:13"),
  },
  {
    id: "r6", ticket_id: "demo-t-102", ticket_ref: "T-102", agent_name: "QA Guard",
    action: "Modal sandbox: npm run build passed in 38s, no secrets detected",
    tool_used: "Modal", status: "ok", output: null, requires_approval: false, created_at: at("18:18"),
  },
  {
    id: "r7", ticket_id: "demo-t-102", ticket_ref: "T-102", agent_name: "Finance Clerk",
    action: "Created £99 Auth Rescue PayPal sandbox checkout — logged to Supabase",
    tool_used: "PayPal", status: "ok", output: null, requires_approval: false, created_at: at("18:22"),
  },
  {
    id: "r8", ticket_id: "demo-t-102", ticket_ref: "T-102", agent_name: "Operator",
    action: "Trust boundary reached — production deploy + client delivery need human approval",
    tool_used: "Manus AI", status: "gate", output: null, requires_approval: true, created_at: at("18:25"),
  },
  // surrounding activity
  {
    id: "r9", ticket_id: "demo-t-104", ticket_ref: "T-104", agent_name: "Diagnoser",
    action: "T-104 diagnosing — Stripe webhook endpoint not registered on prod",
    tool_used: "Manus AI", status: "run", output: null, requires_approval: false, created_at: at("18:28"),
  },
  {
    id: "r10", ticket_id: "demo-l-201", ticket_ref: "L-201", agent_name: "Operator",
    action: "New lead L-201 found — Bolt rebuild broke Vercel deploy",
    tool_used: "Manus AI", status: "ok", output: null, requires_approval: false, created_at: at("18:33"),
  },
];

export const DEMO_REPAIRS: RepairPlan[] = [
  {
    id: "rp-102",
    ticket_id: "demo-t-102",
    diagnosis:
      "Signup creates an auth.users row but nothing inserts into profiles. The profiles table has RLS enabled with no INSERT policy, so the client insert is silently rejected and the dashboard reads null.",
    repair_steps: [
      "Add an INSERT policy on profiles scoped to auth.uid() = id",
      "Add an UPDATE policy on profiles for the owner",
      "Add a handle_new_user trigger to auto-create the profile row on signup",
    ],
    patch_summary: "2 RLS policies + auth.users → profiles trigger",
    patch_diff: `-- T-102 · Repair Engineer · generated in Cursor
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- auto-create a profile row whenever a user signs up
CREATE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- Modal sandbox: npm run build -> passed`,
    risk_level: "high",
    created_at: at("18:13"),
  },
];

export const DEMO_PAYMENTS: Payment[] = [
  {
    id: "pay-102", ticket_id: "demo-t-102", provider: "PayPal", amount: 99,
    currency: "GBP", checkout_url: "https://sandbox.paypal.com/checkoutnow?token=DEMO102",
    status: "created", created_at: at("18:22"),
  },
  {
    id: "pay-106", ticket_id: "demo-t-106", provider: "PayPal", amount: 49,
    currency: "GBP", checkout_url: "https://sandbox.paypal.com/checkoutnow?token=DEMO106",
    status: "created", created_at: at("17:12"),
  },
  {
    id: "pay-100", ticket_id: "demo-t-100", provider: "PayPal", amount: 99,
    currency: "GBP", checkout_url: "https://sandbox.paypal.com/checkoutnow?token=DEMO100",
    status: "paid", created_at: at("14:05"),
  },
];

export const DEMO_SAFETY_FLAGS: SafetyFlag[] = [
  {
    id: "sf-102-1", ticket_id: "demo-t-102", flag_type: "secret_detected", severity: "info",
    description: "No secrets found in submitted scope", requires_approval: false, resolved: true,
    created_at: at("18:18"),
  },
  {
    id: "sf-102-2", ticket_id: "demo-t-102", flag_type: "production_db_access", severity: "high",
    description: "Patch is a production database change", requires_approval: true, resolved: false,
    created_at: at("18:19"),
  },
  {
    id: "sf-102-3", ticket_id: "demo-t-102", flag_type: "client_delivery", severity: "high",
    description: "Delivering the fix to the customer requires approval", requires_approval: true, resolved: false,
    created_at: at("18:25"),
  },
];

export const DEMO_TOOL_EVENTS: ToolEvent[] = [
  { id: "te-1", ticket_id: "demo-t-102", tool_name: "Wassit", event_summary: "Intake captured — T-102 created", status: "ok", created_at: at("18:02") },
  { id: "te-2", ticket_id: "demo-t-102", tool_name: "Cursor", event_summary: "SQL patch generated", status: "ok", created_at: at("18:13") },
  { id: "te-3", ticket_id: "demo-t-102", tool_name: "Modal", event_summary: "Sandbox build check passed (38s)", status: "ok", created_at: at("18:18") },
  { id: "te-4", ticket_id: "demo-t-102", tool_name: "PayPal", event_summary: "£99 checkout created", status: "warn", created_at: at("18:22") },
];

// Per-partner status for the dashboard's right-hand "Tool Stack" panel.
export interface ToolStatus {
  name: string;
  action: string;
  ticket: string;
  ts: string;
  state: "active" | "idle" | "warn";
}

export const DEMO_TOOL_STATUS: ToolStatus[] = [
  { name: "Wassit", action: "Front desk intake active", ticket: "T-102", ts: "18:02", state: "active" },
  { name: "Manus AI", action: "Orchestrating 6-agent workflow", ticket: "T-104", ts: "18:28", state: "active" },
  { name: "Supabase", action: "Storing tickets, logs, payments", ticket: "All", ts: "18:33", state: "active" },
  { name: "Cursor", action: "SQL patch generated", ticket: "T-102", ts: "18:13", state: "active" },
  { name: "Modal", action: "Sandbox build check: passed", ticket: "T-102", ts: "18:18", state: "active" },
  { name: "PayPal", action: "£99 checkout link ready", ticket: "T-102", ts: "18:22", state: "warn" },
];
