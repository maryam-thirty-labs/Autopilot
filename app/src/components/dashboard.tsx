"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAutopilot } from "@/lib/use-autopilot";
import { agentColor } from "@/lib/agents";
import { DEMO_REPAIRS, hhmm, type ToolStatus } from "@/lib/demo-data";
import {
  STATUS_COLUMNS,
  type AgentRun,
  type Payment,
  type RunStatus,
  type SafetyFlag,
  type Ticket,
} from "@/lib/types";

const RUN_CHIP: Record<RunStatus, { cls: string; label: string }> = {
  ok: { cls: "chip-ok", label: "Complete" },
  warn: { cls: "chip-warn", label: "Approval needed" },
  err: { cls: "chip-err", label: "Safety flag" },
  run: { cls: "chip-run", label: "Running…" },
  gate: { cls: "chip-gate", label: "Trust boundary" },
};

function money(n: number, currency = "GBP") {
  const sym = currency === "GBP" ? "£" : currency === "USD" ? "$" : "";
  return `${sym}${n.toFixed(0)}`;
}

async function resetBoard(setResetting: (v: boolean) => void) {
  if (!window.confirm("Reset the demo board? This wipes all tickets and re-seeds the canonical T-102 story.")) return;
  setResetting(true);
  try {
    await fetch("/api/admin/reset", { method: "POST" });
  } finally {
    window.location.reload();
  }
}

// Derive each partner's live status from real agent runs + payments.
function deriveToolStatus(runs: AgentRun[], payments: Payment[]): ToolStatus[] {
  const latest = (match: (r: AgentRun) => boolean) => {
    for (let i = runs.length - 1; i >= 0; i--) if (match(runs[i])) return runs[i];
    return null;
  };
  const cell = (r: AgentRun | null, idle: string): Omit<ToolStatus, "name"> =>
    r
      ? { action: r.action, ticket: r.ticket_ref ?? "—", ts: hhmm(r.created_at), state: "active" }
      : { action: idle, ticket: "—", ts: "—", state: "idle" };

  const lastRun = runs[runs.length - 1];
  const lastPay = payments[payments.length - 1];
  return [
    { name: "Wassit", ...cell(latest((r) => r.tool_used === "Wassit"), "Front desk idle") },
    { name: "Manus AI", ...cell(latest((r) => Boolean(r.tool_used?.includes("Manus"))), "Idle") },
    {
      name: "Supabase",
      action: "Storing tickets, logs, payments",
      ticket: "All",
      ts: lastRun ? hhmm(lastRun.created_at) : "—",
      state: "active",
    },
    { name: "Cursor", ...cell(latest((r) => r.tool_used === "Cursor"), "No patch yet") },
    { name: "Modal", ...cell(latest((r) => r.tool_used === "Modal"), "No QA run yet") },
    {
      name: "PayPal",
      action: lastPay ? `£${lastPay.amount} checkout · ${lastPay.status}` : "No checkout yet",
      ticket: "—",
      ts: lastPay ? hhmm(lastPay.created_at) : "—",
      state: lastPay ? "warn" : "idle",
    },
  ];
}

export function Dashboard() {
  const { tickets, runs, payments, flags, playing, playDemo } = useAutopilot();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const tools = useMemo(() => deriveToolStatus(runs, payments), [runs, payments]);

  const selected =
    tickets.find((t) => t.id === selectedId) ??
    tickets.find((t) => t.ref === "T-102") ??
    tickets[0] ??
    null;

  const metrics = useMemo(() => {
    const revenue = payments
      .filter((p) => p.status !== "failed")
      .reduce((sum, p) => sum + (p.amount ?? 0), 0);
    const leads = tickets.filter(
      (t) => t.status === "new" || t.status === "qualified",
    ).length;
    const repairsReady = tickets.filter(
      (t) => t.status === "patch_ready" || t.status === "qa_passed",
    ).length;
    const approvals = tickets.filter(
      (t) => t.approval_required && t.status === "approval",
    ).length;
    return { revenue, leads, repairsReady, approvals };
  }, [tickets, payments]);

  return (
    <div className="page">
      {/* status bar */}
      <div className="status-bar">
        <Stat k="Autopilot" v="Running" cls="g" />
        <Stat k="Agents Active" v="6" cls="w" />
        <Stat k="Leads Found" v={String(metrics.leads)} cls="a" />
        <Stat k="Tickets" v={String(tickets.length)} cls="w" />
        <Stat k="Repairs Ready" v={String(metrics.repairsReady)} cls="w" />
        <Stat k="Revenue (sandbox)" v={money(metrics.revenue)} cls="a" />
        <Stat k="Approval Queue" v={String(metrics.approvals)} cls="r" />
        <div className="stat">
          <div className="stat-k">Human involvement</div>
          <div className="approval-chip">APPROVAL-ONLY</div>
        </div>
      </div>

      <div className="dash-explainer">
        <div className="flow">
          <b>Scout</b> finds a real lead <span className="arrow">→</span> <b>Diagnoser</b> + <b>Repair Engineer</b> fix it{" "}
          <span className="arrow">→</span> <b>QA Guard</b> checks <span className="arrow">→</span> <b>Finance Clerk</b> bills.
          Humans approve only at trust boundaries.
        </div>
        <div className="dash-legend">
          <span><span className="lg-dot" style={{ background: "var(--mint)" }} />live / real</span>
          <span><span className="lg-dot" style={{ background: "var(--amber)" }} />sandbox / test</span>
          <span><span className="lg-dot" style={{ background: "var(--red)" }} />needs approval</span>
        </div>
      </div>

      <div className="dash-grid">
        <AgentFeed
          runs={runs}
          playing={playing}
          onPlay={playDemo}
          resetting={resetting}
          onReset={() => resetBoard(setResetting)}
        />
        <Kanban
          tickets={tickets}
          selectedId={selected?.id ?? null}
          onSelect={setSelectedId}
        />
        <div className="zone right-zone">
          <ToolStack tools={tools} />
          <div className="zone-head" style={{ borderTop: "1px solid var(--border)" }}>
            <div>
              <div className="zone-title">Ticket Detail</div>
              <div className="zone-cap">the full repair for the selected ticket</div>
            </div>
            <span className="zone-badge">
              {selected ? selected.ref : "select a ticket"}
            </span>
          </div>
          <div className="ticket-panel">
            {selected ? (
              <TicketDetail ticket={selected} payments={payments} flags={flags} />
            ) : (
              <div className="ticket-panel-empty">
                <div style={{ fontSize: 18, opacity: 0.2 }}>⬅</div>
                <div className="empty-hint">
                  Click any kanban card
                  <br />
                  to inspect the full ticket
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ k, v, cls }: { k: string; v: string; cls: string }) {
  return (
    <div className="stat">
      <div className="stat-k">{k}</div>
      <div className={`stat-v ${cls}`}>{v}</div>
    </div>
  );
}

function AgentFeed({
  runs,
  playing,
  onPlay,
  resetting,
  onReset,
}: {
  runs: AgentRun[];
  playing: boolean;
  onPlay: () => void;
  resetting: boolean;
  onReset: () => void;
}) {
  const reversed = [...runs].reverse();
  return (
    <div className="zone feed-zone">
      <div className="zone-head">
        <div>
          <div className="zone-title">Agent Activity</div>
          <div className="zone-cap">every agent action, streamed live</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="replay-btn" onClick={onReset} disabled={resetting}
            style={{ color: "var(--muted)", borderColor: "var(--border2)", background: "transparent" }}>
            {resetting ? "resetting…" : "↺ Reset board"}
          </button>
          <button className="replay-btn" onClick={onPlay} disabled={playing}>
            {playing ? "● running…" : "▶ Replay T-102"}
          </button>
        </div>
      </div>
      <div className="zone-body">
        {reversed.map((e, i) => {
          const chip = RUN_CHIP[e.status] ?? RUN_CHIP.ok;
          return (
            <div key={e.id} className={`feed-entry${i === 0 ? " flash" : ""}`}>
              <div className="feed-row1">
                <span className="feed-agent" style={{ color: agentColor(e.agent_name) }}>
                  {e.agent_name}
                </span>
                <span className="feed-ts">{hhmm(e.created_at)}</span>
              </div>
              <div className="feed-text">{e.action}</div>
              <div className="feed-chips">
                {e.tool_used && <span className="chip chip-tool">{e.tool_used}</span>}
                <span className={`chip ${chip.cls}`}>{chip.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Kanban({
  tickets,
  selectedId,
  onSelect,
}: {
  tickets: Ticket[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const active = tickets.filter(
    (t) => t.status !== "delivered" && t.status !== "new",
  ).length;
  return (
    <div className="zone kanban-zone">
      <div className="zone-head">
        <div>
          <div className="zone-title">Ticket Pipeline</div>
          <div className="zone-cap">tickets move themselves through stages</div>
        </div>
        <span className="zone-badge">{active} active</span>
      </div>
      <div className="zone-body">
        <div className="kanban-body">
          {STATUS_COLUMNS.map((col) => {
            const cards = tickets.filter((t) => t.status === col.status);
            const danger = col.status === "approval";
            return (
              <div className="k-col" key={col.status}>
                <div
                  className="k-col-head"
                  style={danger ? { color: "var(--red)" } : undefined}
                >
                  {col.label}
                  <span
                    className="k-col-n"
                    style={danger ? { color: "var(--red)" } : undefined}
                  >
                    {cards.length}
                  </span>
                </div>
                {cards.length === 0 && <div className="k-empty">—</div>}
                {cards.map((t) => (
                  <KanbanCard
                    key={t.id}
                    t={t}
                    selected={t.id === selectedId}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KanbanCard({
  t,
  selected,
  onSelect,
}: {
  t: Ticket;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const flagged = t.approval_required && t.status === "approval";
  return (
    <div
      className={`k-card${selected ? " selected" : ""}${flagged ? " flagged" : ""}`}
      onClick={() => onSelect(t.id)}
    >
      <div className="kc-id">{t.ref}</div>
      <div className="kc-title">{t.issue_summary}</div>
      <div className="kc-sub">
        {[t.tool_used, t.issue_category].filter(Boolean).join(" · ")}
      </div>
      <div className="kc-tags">
        {t.suggested_price != null && (
          <span className="kt kt-price">{money(t.suggested_price, t.currency)}</span>
        )}
        {t.confidence_score != null && (
          <span className="kt kt-conf">{t.confidence_score}%</span>
        )}
        {flagged && <span className="kt kt-flag">⚠ gate</span>}
        {t.status === "delivered" && <span className="kt kt-done">✓ done</span>}
      </div>
    </div>
  );
}

function ToolStack({ tools }: { tools: ToolStatus[] }) {
  const dotClass: Record<string, string> = {
    active: "t-active",
    idle: "t-idle",
    warn: "t-warn",
  };
  return (
    <div className="tool-stack">
      <div className="zone-head">
        <div>
          <div className="zone-title">Partner Tool Stack</div>
          <div className="zone-cap">which partner is working right now</div>
        </div>
        <span className="zone-badge">6 partners</span>
      </div>
      <div className="tool-stack-body">
        {tools.map((t) => (
          <div className="tool-card" key={t.name}>
            <div className={`t-dot ${dotClass[t.state]}`} />
            <div className="t-body">
              <div className="t-name">{t.name}</div>
              <div className="t-action">{t.action}</div>
              <div className="t-ticket">{t.ticket}</div>
            </div>
            <div className="t-ts">{t.ts}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TicketDetail({
  ticket,
  payments,
  flags,
}: {
  ticket: Ticket;
  payments: Payment[];
  flags: SafetyFlag[];
}) {
  const repair = DEMO_REPAIRS.find((r) => r.ticket_id === ticket.id);
  const payment = payments.find((p) => p.ticket_id === ticket.id);
  const ticketFlags = flags.filter((f) => f.ticket_id === ticket.id);

  return (
    <div className="t-detail">
      {ticket.trust_boundary && (
        <div className="trust-banner">
          Autonomous until trust boundary: {ticket.trust_boundary}.
        </div>
      )}

      <div>
        <div className="td-sec-title">Lead Signal</div>
        <div className="td-grid">
          <Field k="Source" v={ticket.source ?? "—"} />
          <Field k="Urgency" v={ticket.urgency ?? "—"} cls={ticket.urgency === "high" ? "r" : ""} />
          <Field k="Tool" v={ticket.tool_used ?? "—"} />
          {ticket.confidence_score != null && (
            <Field k="Confidence" v={`${ticket.confidence_score}%`} cls="a" />
          )}
        </div>
        {ticket.error_message && <div className="excerpt">{ticket.error_message}</div>}
      </div>

      <div>
        <div className="td-sec-title">Diagnosis</div>
        <div className="td-grid">
          <Field k="Category" v={ticket.issue_category ?? "—"} />
          <Field k="Risk" v={ticket.risk_level ?? "—"} cls={ticket.risk_level === "high" ? "r" : "g"} />
        </div>
        {repair?.diagnosis && (
          <div className="excerpt" style={{ fontStyle: "normal" }}>
            {repair.diagnosis}
          </div>
        )}
      </div>

      {repair?.patch_diff && (
        <div>
          <div className="td-sec-title">Generated Patch — Cursor</div>
          <div className="code-bl">{repair.patch_diff}</div>
        </div>
      )}

      <div>
        <div className="td-sec-title">Safety Checks</div>
        {ticketFlags.length === 0 && (
          <div className="sf-row">
            <span className="sf-label">no flags raised</span>
            <span className="sf-val sv-ok">clear</span>
          </div>
        )}
        {ticketFlags.map((f) => (
          <div className="sf-row" key={f.id}>
            <span className="sf-label">{f.flag_type}</span>
            <span
              className={`sf-val ${
                f.requires_approval ? "sv-req" : f.resolved ? "sv-ok" : "sv-no"
              }`}
            >
              {f.requires_approval ? "approval required" : f.resolved ? "clear" : "blocked"}
            </span>
          </div>
        ))}
      </div>

      <div>
        <div className="td-sec-title">Quote & Payment</div>
        <div className="td-grid">
          <Field k="Package" v={ticket.suggested_package ?? "—"} />
          <Field
            k="Amount"
            v={ticket.suggested_price != null ? money(ticket.suggested_price, ticket.currency) : "—"}
            cls="a"
          />
          <Field k="PayPal" v={payment ? "Link ready" : "—"} />
          <Field k="Status" v={payment?.status ?? ticket.status} />
        </div>
      </div>

      {ticket.approval_required && ticket.status === "approval" ? (
        <ApproveButton reason={ticket.approval_reason} />
      ) : null}

      <Link href={`/ticket/${ticket.ref}`} className="dismiss-btn">
        Open full ticket →
      </Link>
    </div>
  );
}

function ApproveButton({ reason }: { reason: string | null }) {
  const [approved, setApproved] = useState(false);
  return (
    <div>
      {reason && !approved && (
        <div style={{ marginBottom: 8 }} className="trust-banner">
          {reason}
        </div>
      )}
      <button
        className="approve-btn"
        disabled={approved}
        onClick={() => setApproved(true)}
        style={approved ? { background: "var(--mint)" } : undefined}
      >
        {approved ? "✓ Approved — outreach not sent" : "Approve (outreach stays in-app) →"}
      </button>
    </div>
  );
}

function Field({ k, v, cls = "" }: { k: string; v: string; cls?: string }) {
  return (
    <div>
      <div className="td-k">{k}</div>
      <div className={`td-v ${cls}`}>{v}</div>
    </div>
  );
}
