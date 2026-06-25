import Link from "next/link";
import { notFound } from "next/navigation";
import { getTicketBundle } from "@/lib/ticket-bundle";
import { getRepairArtifacts } from "@/lib/repair-artifacts";
import { PaypalCheckoutButton } from "@/components/paypal-checkout-button";
import { ModalCheckButton } from "@/components/modal-check-button";
import { agentColor } from "@/lib/agents";
import { hhmm } from "@/lib/demo-data";
import type { TicketStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";

const STATUS_COLOR: Record<TicketStatus, string> = {
  new: "var(--muted)",
  qualified: "var(--blue)",
  diagnosing: "var(--amber)",
  patch_ready: "var(--amber)",
  qa_passed: "var(--mint)",
  approval: "var(--red)",
  payment: "var(--amber)",
  delivered: "var(--mint)",
};

function money(n: number | null, currency = "GBP") {
  if (n == null) return "—";
  const sym = currency === "GBP" ? "£" : currency === "USD" ? "$" : "";
  return `${sym}${n.toFixed(0)}`;
}

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bundle = await getTicketBundle(id);
  if (!bundle) notFound();

  const { ticket, runs, repair, payment, flags } = bundle;
  const artifacts = await getRepairArtifacts(ticket.ref);
  const statusColor = STATUS_COLOR[ticket.status] ?? "var(--muted)";

  return (
    <div className="page">
      <div className="ticket-page">
        <div className="ticket-inner">
          <Link href="/dashboard" className="tp-back">
            ← Back to Autopilot
          </Link>

          <div className="tp-head">
            <div>
              <div className="tp-id">{ticket.ref}</div>
              <h1 className="tp-title">{ticket.issue_summary}</h1>
            </div>
            <span
              className="tp-status"
              style={{ color: statusColor, border: `1px solid ${statusColor}` }}
            >
              {STATUS_LABEL[ticket.status]?.toUpperCase()}
            </span>
          </div>

          {ticket.trust_boundary && (
            <div className="trust-banner" style={{ marginTop: 16 }}>
              Autonomous until trust boundary: {ticket.trust_boundary}.
              {ticket.approval_reason ? ` ${ticket.approval_reason}` : ""}
            </div>
          )}

          <div className="tp-meta">
            <Meta k="Customer" v={ticket.customer_name ?? "—"} />
            <Meta k="Tool" v={ticket.tool_used ?? "—"} />
            <Meta k="Category" v={ticket.issue_category ?? "—"} />
            <Meta k="Confidence" v={ticket.confidence_score != null ? `${ticket.confidence_score}%` : "—"} />
            <Meta k="Risk" v={ticket.risk_level ?? "—"} />
            <Meta k="Source" v={ticket.source ?? "—"} />
            <Meta k="Package" v={ticket.suggested_package ?? "—"} />
            <Meta k="Quote" v={money(ticket.suggested_price, ticket.currency)} />
          </div>

          {(ticket.error_message || ticket.expected_behavior) && (
            <div className="tp-sec">
              <div className="tp-sec-title">Problem</div>
              {ticket.error_message && <div className="excerpt">{ticket.error_message}</div>}
              {ticket.expected_behavior && (
                <p className="sec-body" style={{ marginTop: 10 }}>
                  <strong style={{ color: "var(--text)" }}>Expected:</strong>{" "}
                  {ticket.expected_behavior}
                </p>
              )}
            </div>
          )}

          {repair && (
            <div className="tp-sec">
              <div className="tp-sec-title">Diagnosis & Repair Plan</div>
              {repair.diagnosis && (
                <p className="sec-body" style={{ maxWidth: "100%", marginBottom: 14 }}>
                  {repair.diagnosis}
                </p>
              )}
              {repair.repair_steps && repair.repair_steps.length > 0 && (
                <ol style={{ paddingLeft: 18, marginBottom: 16, color: "var(--muted)", fontSize: "12px", lineHeight: 1.9 }}>
                  {repair.repair_steps.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              )}
              {artifacts ? (
                <div className="repair-diff">
                  <div className="repair-col before">
                    <div className="repair-col-label">{artifacts.beforeLabel}</div>
                    <div className="code-bl sm">{artifacts.before}</div>
                  </div>
                  <div className="repair-col after">
                    <div className="repair-col-label">{artifacts.afterLabel}</div>
                    <div className="code-bl sm">{artifacts.after}</div>
                  </div>
                </div>
              ) : (
                repair.patch_diff && <div className="code-bl">{repair.patch_diff}</div>
              )}
            </div>
          )}

          <div className="tp-sec">
            <div className="tp-sec-title">Agent Timeline</div>
            <div className="tp-timeline">
              {runs.length === 0 && (
                <div className="sec-body">No agent activity recorded yet.</div>
              )}
              {runs.map((r) => (
                <div className="tp-tl-row" key={r.id}>
                  <div className="tp-tl-ts">{hhmm(r.created_at)}</div>
                  <div className="tp-tl-body">
                    <div className="tp-tl-agent" style={{ color: agentColor(r.agent_name) }}>
                      {r.agent_name}
                      {r.tool_used ? (
                        <span style={{ color: "var(--muted2)", fontWeight: 400 }}>
                          {" "}· {r.tool_used}
                        </span>
                      ) : null}
                    </div>
                    <div className="tp-tl-text">{r.action}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="tp-sec">
            <div className="tp-sec-title">QA Guard — Modal sandbox</div>
            <p className="sec-body" style={{ marginBottom: 14 }}>
              Runs a sandboxed build + secret/destructive-SQL scan before the patch is allowed near production.
            </p>
            <ModalCheckButton ticketRef={ticket.ref} />
          </div>

          {flags.length > 0 && (
            <div className="tp-sec">
              <div className="tp-sec-title">Safety Checks</div>
              {flags.map((f) => (
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
          )}

          <div className="tp-sec">
            <div className="tp-sec-title">Payment</div>
            {payment ? (
              <div className="tp-meta" style={{ margin: "0 0 16px" }}>
                <Meta k="Provider" v={payment.provider} />
                <Meta k="Amount" v={money(payment.amount, payment.currency)} />
                <Meta k="Status" v={payment.status ?? "—"} />
              </div>
            ) : (
              <p className="sec-body" style={{ marginBottom: 14 }}>
                No checkout created yet for this ticket.
              </p>
            )}
            <PaypalCheckoutButton
              ticketRef={ticket.ref}
              amount={ticket.suggested_price}
              currency={ticket.currency}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Meta({ k, v }: { k: string; v: string }) {
  return (
    <div className="tp-meta-cell">
      <div className="tp-meta-k">{k}</div>
      <div className="tp-meta-v">{v}</div>
    </div>
  );
}
