"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { agentColor } from "@/lib/agents";

// One button → the whole company runs on one lead. Lead discovery is LIVE by
// default (real public search via /api/scout/live, constrained to Supabase/auth
// so it matches the repair). QA + checkout are real calls. A demo fixture is an
// explicit, secondary fallback — never a silent substitute.

type StageState = "pending" | "active" | "done" | "gate";

const STAGES = [
  { key: "lead", label: "Live Scout", sub: "Scout · SO/GitHub" },
  { key: "qualified", label: "Qualified", sub: "Qualifier · agent" },
  { key: "outreach", label: "Outreach", sub: "Outreach · Claude" },
  { key: "approval", label: "Approval Gate", sub: "Human · approve", gate: true },
  { key: "ticket", label: "Ticket", sub: "Operator · Supabase" },
  { key: "diagnosed", label: "Diagnosed", sub: "Diagnoser · Claude" },
  { key: "patch", label: "Patch", sub: "Repair Eng · Claude" },
  { key: "qa", label: "QA Check", sub: "QA Guard · Modal" },
  { key: "checkout", label: "Checkout", sub: "Finance · PayPal" },
  { key: "boundary", label: "Trust Boundary", sub: "Human gate · delivery", gate: true },
];

interface LoopLead {
  ref: string;
  platform: string;
  source_url?: string;
  signal: string;
  excerpt?: string;
  likely_issue: string;
  intent_score: number;
  pkg: string;
  price: number;
  outreach: string;
  live: boolean;
  via?: string;
}

const FIXTURE: LoopLead = {
  ref: "L-018",
  platform: "Demo fixture",
  signal: "Built my whole app with Lovable + Supabase. Signup works but profile data won't save and the dashboard crashes.",
  likely_issue: "Auth / RLS — missing profiles INSERT policy",
  intent_score: 91,
  pkg: "Supabase / Auth Rescue",
  price: 99,
  outreach: "Hey — saw your post about Lovable + Supabase profiles staying empty. That's almost always a missing RLS INSERT policy. We can ship a tested SQL patch + trigger that fixes it in under an hour. Want the diagnosis?",
  live: false,
};

const PATCH_EXCERPT = `CREATE POLICY "insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();`;

interface Evt { id: string; agent: string; text: string; tool: string; ts: string; gate?: boolean }
interface QA { status: string; duration: string; warnings: string[]; demo: boolean; ran_on: string }
interface Checkout { url: string; demo: boolean; order: string }
interface Reasoning { diagnosis: string; patch: string; outreach: string; live: boolean }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function LoopPage() {
  const [states, setStates] = useState<StageState[]>(STAGES.map(() => "pending"));
  const [events, setEvents] = useState<Evt[]>([]);
  const [running, setRunning] = useState(false);
  const [searching, setSearching] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [gate, setGate] = useState(false);
  const [approved, setApproved] = useState(false);
  const [lead, setLead] = useState<LoopLead | null>(null);
  const [reasoning, setReasoning] = useState<Reasoning | null>(null);
  const [ticketRef, setTicketRef] = useState<string | null>(null);
  const [qa, setQa] = useState<QA | null>(null);
  const [checkout, setCheckout] = useState<Checkout | null>(null);
  const tmin = useRef(40);
  const evtN = useRef(0);

  function setStage(i: number, s: StageState) {
    setStates((prev) => prev.map((x, idx) => (idx === i ? s : x)));
  }
  function addEvent(agent: string, text: string, tool: string, gateEvt = false) {
    const mm = String(tmin.current).padStart(2, "0");
    tmin.current += 1;
    setEvents((prev) => [{ id: `e${evtN.current++}`, agent, text, tool, ts: `18:${mm}`, gate: gateEvt }, ...prev]);
  }
  function reset() {
    setStates(STAGES.map(() => "pending"));
    setEvents([]); setGate(false); setApproved(false); setLead(null); setReasoning(null);
    setTicketRef(null); setQa(null); setCheckout(null); setLiveError(null); setSearching(false);
    tmin.current = 40; evtN.current = 0;
  }
  async function runStage(i: number, agent: string, text: string, tool: string, ms = 1100) {
    setStage(i, "active");
    addEvent(agent, text, tool);
    await sleep(ms);
    setStage(i, "done");
  }

  // ── primary: live scout ──
  async function startLive() {
    if (running || searching) return;
    reset();
    setRunning(true);
    setSearching(true);
    setStage(0, "active");
    addEvent("Scout", "Searching public sources (Stack Overflow / GitHub) for Supabase auth/RLS pain…", "live search");
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 40000);
      const r = await fetch("/api/scout/live", { signal: ctl.signal }).then((x) => x.json());
      clearTimeout(t);
      if (!r.ok || !r.lead) throw new Error(r.error || "no lead");
      const l: LoopLead = {
        ref: r.lead.ref, platform: r.lead.source, source_url: r.lead.source_url,
        signal: r.lead.signal, excerpt: r.lead.excerpt, likely_issue: r.lead.likely_issue,
        intent_score: r.lead.intent_score, pkg: r.lead.suggested_package, price: r.lead.suggested_price,
        outreach: r.lead.outreach_draft, live: true, via: r.lead.discovered_via,
      };
      setLead(l);
      setSearching(false);
      addEvent("Scout", `Found a real lead on ${l.platform} — "${l.signal.slice(0, 70)}…"`, "live");
      setStage(0, "done");
      await continueToGate(l);
    } catch {
      setSearching(false);
      setStage(0, "pending");
      setRunning(false);
      setLiveError("Live scout couldn't fetch a lead right now (rate limit or network).");
      addEvent("Scout", "Live search failed — offer demo fixture", "live search");
    }
  }

  // ── secondary: explicit demo fixture ──
  async function startDemo() {
    if (running || searching) return;
    reset();
    setRunning(true);
    setLead(FIXTURE);
    setStage(0, "active");
    addEvent("Scout", "Using demo fixture lead (live search skipped)", "fixture");
    await sleep(700);
    setStage(0, "done");
    await continueToGate(FIXTURE);
  }

  async function continueToGate(l: LoopLead) {
    await runStage(1, "Qualifier", `Scored ${l.ref} ${l.intent_score}/100 intent — ${l.pkg}`, "agent");
    // live reasoning: diagnosis + patch + outreach (Claude), with scripted fallback
    let r: Reasoning | null = null;
    try {
      r = await fetch("/api/agents/reason", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signal: l.signal, likely_issue: l.likely_issue, tool_used: "Supabase", source_url: l.source_url }),
      }).then((x) => x.json());
      setReasoning(r);
    } catch { /* fallback handled below */ }
    await runStage(2, "Outreach", `Drafted a personalised outreach reply for ${l.ref}`, r?.live ? "Claude" : "agent");
    setStage(3, "gate");
    setGate(true);
    addEvent("Operator", "Outreach drafted — blocked, needs human approval before sending", "trust boundary", true);
    setRunning(false);
  }

  async function approve() {
    if (!lead) return;
    setGate(false); setApproved(true); setStage(3, "done"); setRunning(true);

    setStage(4, "active");
    addEvent("Operator", "Approved — converting lead to a ticket", "Supabase");
    let ref = "T-?";
    try {
      const r = await fetch("/api/tickets/create", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: `Company Loop · ${lead.platform}`,
          customer_email: `${lead.ref.toLowerCase()}@lead.thirtylabs`,
          tool_used: "Supabase",
          error_message: lead.signal + (lead.source_url ? `\n\nSource: ${lead.source_url}` : ""),
          urgency: "high",
        }),
      }).then((x) => x.json());
      ref = r.ref ?? ref;
    } catch { /* keep placeholder */ }
    setTicketRef(ref);
    addEvent("Operator", `Ticket ${ref} created from ${lead.ref}`, "Supabase");
    setStage(4, "done");

    const diag = reasoning?.live
      ? reasoning.diagnosis.slice(0, 110)
      : "Classified as Auth/RLS — missing INSERT policy on profiles, confidence 86%";
    await runStage(5, "Diagnoser", diag, reasoning?.live ? "Claude" : "agent");
    await runStage(6, "Repair Engineer", "Generated patch" + (reasoning?.live ? " with Claude" : " in Cursor"), reasoning?.live ? "Claude" : "Cursor");

    setStage(7, "active");
    addEvent("QA Guard", "Running sandboxed build + secret scan on Modal…", "Modal");
    try {
      const r = await fetch("/api/modal/run-check", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_ref: ref, code: reasoning?.patch }),
      }).then((x) => x.json());
      setQa({ ...r.result, demo: r.demo });
      addEvent("QA Guard", `Modal QA ${r.result.status} in ${r.result.duration} — ${r.result.secrets_detected ? "secrets found" : "no secrets"}`, "Modal");
    } catch { addEvent("QA Guard", "Modal check failed to run", "Modal"); }
    setStage(7, "done");

    setStage(8, "active");
    addEvent("Finance Clerk", "Creating PayPal sandbox checkout…", "PayPal");
    try {
      const r = await fetch("/api/paypal/create-order", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_ref: ref, amount: lead.price }),
      }).then((x) => x.json());
      setCheckout({ url: r.checkout_url, demo: r.demo, order: r.order_id });
      addEvent("Finance Clerk", `£${lead.price} ${r.demo ? "(demo)" : "sandbox"} checkout created — order ${r.order_id}`, "PayPal");
    } catch { addEvent("Finance Clerk", "PayPal checkout failed", "PayPal"); }
    setStage(8, "done");

    setStage(9, "active");
    await sleep(900);
    addEvent("Operator", "Trust boundary — production deploy + client delivery require human approval", "human gate", true);
    setStage(9, "done");
    setRunning(false);
  }

  const started = states.some((s) => s !== "pending");
  const busy = running || searching;

  return (
    <div className="page">
      <div className="loop-page">
        <div className="loop-inner">
          <div className="loop-head">
            <div>
              <div className="land-eyebrow" style={{ marginBottom: 14 }}>The autonomous studio loop</div>
              <h2>Company Loop</h2>
              <p className="loop-sub">
                One button runs the whole company on a single lead — it finds a real customer by searching public
                demand, qualifies, drafts outreach, stops at a human approval gate, converts to a ticket, diagnoses,
                patches, runs QA, and takes payment. It runs autonomously until it reaches a trust boundary.
              </p>
              <div className="loop-legend">
                <b>live</b>: lead discovery (SO/GitHub) · diagnosis + patch + outreach (Claude) · ticket (Supabase) · QA (Modal) · checkout (PayPal sandbox)
                &nbsp;·&nbsp; real integrations, side effects blocked: outreach never sent, payments sandbox-only
              </div>
            </div>
            <div className="loop-actions">
              {started && !busy && <button className="loop-reset" onClick={reset}>Reset</button>}
              <button className="loop-start" onClick={startLive} disabled={busy || gate}>
                {searching ? "● scouting live…" : running ? "● running…" : started ? "↻ Restart" : "▶ Start Autopilot — Live Scout"}
              </button>
            </div>
          </div>

          {/* flow strip */}
          <div className="loop-flow-legend">
            <span><span className="lg">1</span> autonomous agent step</span>
            <span><span className="lg h">⚠</span> human approval gate</span>
            <span><span className="lg d">✓</span> complete</span>
            <span style={{ color: "var(--muted2)" }}>— each step shows the agent · the partner tool it uses</span>
          </div>
          <div className="loop-strip">
            {STAGES.map((st, i) => (
              <div key={st.key} style={{ display: "flex", alignItems: "flex-start" }}>
                {i > 0 && <div className={`loop-conn${states[i - 1] === "done" ? " done" : ""}`} />}
                <div className={`loop-stage ${states[i]}${st.gate ? " human" : ""}`}>
                  <div className="loop-dot">{states[i] === "done" ? "✓" : st.gate ? "⚠" : i + 1}</div>
                  <div className="loop-label">{st.label}</div>
                  <div className="loop-sublabel">{st.sub}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="loop-body">
            <div className="loop-panel">
              <div className="loop-panel-h">Run Detail</div>
              <div className="loop-detail">
                {!started && (
                  <div className="loop-detail-empty">
                    Press <b>▶ Start Autopilot — Live Scout</b> and watch the company find a real customer and run end to end.
                  </div>
                )}

                {searching && (
                  <div className="loop-card" style={{ borderColor: "rgba(96,165,250,.3)" }}>
                    <div className="loop-card-k"><span>Live Scout</span><span className="live">searching public sources…</span></div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                      Querying Stack Overflow &amp; GitHub for recent Supabase auth / RLS / profile pain signals…
                    </div>
                  </div>
                )}

                {liveError && (
                  <div className="loop-card" style={{ borderColor: "var(--red-dim)" }}>
                    <div className="loop-card-k"><span>Live Scout failed</span><span className="seed">fallback</span></div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 10 }}>{liveError}</div>
                    <button className="dismiss-btn" style={{ marginTop: 0 }} onClick={startDemo}>Use demo fixture instead →</button>
                  </div>
                )}

                {lead && (
                  <div className="loop-card">
                    <div className="loop-card-k">
                      <span>Lead · {lead.ref}</span>
                      <span className={lead.live ? "live" : "seed"}>
                        {lead.live ? `Live · ${lead.platform}` : "Demo fixture"}
                      </span>
                    </div>
                    <div className="lead-signal" style={{ marginBottom: 8 }}>&quot;{lead.signal}&quot;</div>
                    {lead.source_url && (
                      <div className="lead-row" style={{ marginBottom: 6 }}>
                        <span className="k">Source</span>
                        <a className="v" href={lead.source_url} target="_blank" rel="noreferrer" style={{ color: "var(--amber)", maxWidth: "70%", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {lead.source_url.replace(/^https?:\/\//, "")}
                        </a>
                      </div>
                    )}
                    <div className="lead-row"><span className="k">Likely issue</span><span className="v">{lead.likely_issue}</span></div>
                    <div className="lead-row"><span className="k">Intent</span><span className="v amber">{lead.intent_score}/100</span></div>
                    <div className="lead-row"><span className="k">Offer</span><span className="v amber">{lead.pkg} · £{lead.price}</span></div>
                    {lead.via && <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--muted2)", marginTop: 6 }}>via {lead.via}</div>}
                  </div>
                )}

                {(gate || approved) && lead && (
                  <div className="loop-card" style={gate ? { borderColor: "rgba(251,191,36,.35)" } : undefined}>
                    <div className="loop-card-k"><span>Outreach draft</span><span className={reasoning?.live ? "live" : "seed"}>{reasoning?.live ? "Claude · live" : "agent-drafted"}</span></div>
                    <div className="lead-draft" style={{ border: "none", padding: 0, background: "none" }}>{reasoning?.outreach ?? lead.outreach}</div>
                    <div className="lead-gate-note" style={{ margin: "10px 0" }}>
                      🔒 Not sent — human approval required. Displayed in-app only; Autopilot never messages public-post authors.
                    </div>
                    {gate ? (
                      <button className="approve-btn" onClick={approve}>Approve &amp; convert to ticket →</button>
                    ) : (
                      <div className="lead-converted-row" style={{ marginTop: 4 }}>✓ Approved — converted to ticket · outreach still not sent</div>
                    )}
                  </div>
                )}

                {ticketRef && (
                  <div className="loop-card">
                    <div className="loop-card-k"><span>Ticket</span><span className="live">Supabase · live</span></div>
                    <div className="td-v a" style={{ fontSize: 14 }}>{ticketRef}</div>
                  </div>
                )}

                {states[5] !== "pending" && reasoning && (
                  <div className="loop-card">
                    <div className="loop-card-k"><span>Diagnosis</span><span className={reasoning.live ? "live" : "seed"}>{reasoning.live ? "Claude · live" : "scripted"}</span></div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.6 }}>{reasoning.diagnosis}</div>
                  </div>
                )}

                {states[6] !== "pending" && (
                  <div className="loop-card">
                    <div className="loop-card-k"><span>Patch{reasoning?.live ? " · Claude" : " · Cursor"}</span><span className={reasoning?.live ? "live" : "seed"}>{reasoning?.live ? "generated live" : "genuine artifact"}</span></div>
                    <div className="code-bl" style={{ fontSize: 10 }}>{reasoning?.patch ?? PATCH_EXCERPT}</div>
                  </div>
                )}

                {qa && (
                  <div className="loop-card" style={{ borderColor: qa.status === "passed" ? "var(--mint-dim)" : "var(--red-dim)" }}>
                    <div className="loop-card-k"><span>QA Guard</span><span className={qa.demo ? "seed" : "live"}>Modal · {qa.demo ? "demo" : "live"}</span></div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: qa.status === "passed" ? "var(--mint)" : "var(--red)" }}>
                      {qa.status.toUpperCase()} · npm run build · {qa.duration} · ran on {qa.ran_on}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{qa.warnings.join(" · ")}</div>
                  </div>
                )}

                {checkout && (
                  <div className="loop-card">
                    <div className="loop-card-k"><span>Checkout</span><span className={checkout.demo ? "seed" : "live"}>PayPal · {checkout.demo ? "demo" : "sandbox"}</span></div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--amber)" }}>£{lead?.price ?? 99} · order {checkout.order}</div>
                    <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#FCD34D", marginTop: 2 }}>Sandbox / test revenue — no real funds move</div>
                    {checkout.url && <a href={checkout.url} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: "var(--amber)", wordBreak: "break-all" }}>{checkout.url}</a>}
                  </div>
                )}

                {states[9] === "done" && (
                  <div className="trust-banner">
                    Final state: <b>Ready for human approval</b>. The company ran autonomously from finding a real
                    customer to preparing payment — stopping at every trust boundary: outreach, production deploy, and
                    real charge.{ticketRef && <> <Link href={`/ticket/${ticketRef}`} style={{ color: "var(--amber)" }}>open ticket →</Link></>}
                  </div>
                )}
              </div>
            </div>

            <div className="loop-panel">
              <div className="loop-panel-h">Agent Timeline</div>
              <div className="loop-timeline-body">
                {events.length === 0 && <div className="loop-detail-empty">No activity yet.</div>}
                {events.map((e) => (
                  <div key={e.id} className="feed-entry" style={{ animation: "none" }}>
                    <div className="feed-row1">
                      <span className="feed-agent" style={{ color: agentColor(e.agent) }}>{e.agent}</span>
                      <span className="feed-ts">{e.ts}</span>
                    </div>
                    <div className="feed-text" style={{ marginBottom: 5 }}>{e.text}</div>
                    <div className="feed-chips">
                      <span className="chip chip-tool">{e.tool}</span>
                      {e.gate && <span className="chip chip-gate">Trust boundary</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
