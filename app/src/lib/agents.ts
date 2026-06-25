// The six visible agents and the six partner tools.
// Kept deliberately small (6, not 11) so the dashboard reads as a real company.

export type AgentName =
  | "Front Desk"
  | "Operator"
  | "Diagnoser"
  | "Repair Engineer"
  | "QA Guard"
  | "Finance Clerk";

export interface AgentDef {
  name: AgentName;
  color: string;
  partner: string;
  job: string;
}

export const AGENTS: Record<AgentName, AgentDef> = {
  "Front Desk": {
    name: "Front Desk",
    color: "#60A5FA",
    partner: "Wassit",
    job: "Collects the customer issue at intake",
  },
  Operator: {
    name: "Operator",
    color: "#A78BFA",
    partner: "Manus AI",
    job: "Orchestrates the workflow end to end",
  },
  Diagnoser: {
    name: "Diagnoser",
    color: "#F59E0B",
    partner: "Manus AI + Supabase",
    job: "Classifies and root-causes the issue",
  },
  "Repair Engineer": {
    name: "Repair Engineer",
    color: "#34D399",
    partner: "Cursor",
    job: "Generates the code / SQL patch",
  },
  "QA Guard": {
    name: "QA Guard",
    color: "#34D399",
    partner: "Modal",
    job: "Runs the sandbox check + safety scan",
  },
  "Finance Clerk": {
    name: "Finance Clerk",
    color: "#F59E0B",
    partner: "PayPal",
    job: "Creates checkout + logs the payment",
  },
};

export function agentColor(name: string): string {
  return (AGENTS as Record<string, AgentDef>)[name]?.color ?? "#FFFFFF";
}

// The six sponsor partners, in demo order.
export interface PartnerDef {
  name: string;
  role: string;
}

export const PARTNERS: PartnerDef[] = [
  { name: "Wassit", role: "Customer chat — autonomous front desk" },
  { name: "Manus AI", role: "Lead scouting, agent orchestration and workflow" },
  { name: "Supabase", role: "Source of truth — tickets, logs, payments" },
  { name: "Cursor", role: "Repair workspace — patch generation" },
  { name: "Modal", role: "Sandboxed build checks + secret scans" },
  { name: "PayPal", role: "Sandbox checkout + payment loop" },
];
