"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SCOUT_LEADS } from "@/lib/lead-scout";
import type { Lead, LeadStatus } from "@/lib/types";

interface ScoutEvent {
  id: string;
  agent: string;
  text: string;
  ts: string;
  color: string;
  gate?: boolean;
}

const COLOR = {
  Scout: "#60A5FA",
  Qualifier: "#A78BFA",
  Outreach: "#A78BFA",
  Operator: "#F59E0B",
};

const STATUS_BADGE: Record<LeadStatus, { cls: string; label: string }> = {
  found: { cls: "lb-found", label: "Found" },
  qualified: { cls: "lb-qualified", label: "Qualified" },
  drafted: { cls: "lb-drafted", label: "Outreach drafted" },
  approval: { cls: "lb-approval", label: "Approval required" },
  converted: { cls: "lb-converted", label: "Converted" },
};

function money(n: number, c = "GBP") {
  return `${c === "GBP" ? "£" : ""}${n.toFixed(0)}`;
}

interface ManusState {
  taskUrl: string;
  status: string;
  note: string;
}

export default function ScoutPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [events, setEvents] = useState<ScoutEvent[]>([]);
  const [playing, setPlaying] = useState(false);
  const [manus, setManus] = useState<ManusState | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);
  const tmin = useRef(40);
  const evtN = useRef(0);

  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      if (poll.current) clearInterval(poll.current);
    },
    [],
  );

  async function runManus() {
    if (poll.current) clearInterval(poll.current);
    setManus({ taskUrl: "", status: "starting", note: "Asking Manus to scout for broken-app leads…" });
    const res = await fetch("/api/scout/run", { method: "POST" });
    const data = await res.json();
    if (data.configured === false) {
      setManus({ taskUrl: "", status: "off", note: "Manus isn't connected — using the seeded replay instead." });
      return;
    }
    if (!res.ok || !data.task_id) {
      setManus({ taskUrl: "", status: "error", note: data.error || "Failed to start Manus task." });
      return;
    }
    setManus({ taskUrl: data.task_url, status: "running", note: "Scouting live on Manus — this takes a few minutes." });
    poll.current = setInterval(async () => {
      const s = await fetch(`/api/scout/status?id=${data.task_id}`).then((r) => r.json());
      if (s.leads && s.leads.length) {
        if (poll.current) clearInterval(poll.current);
        setLeads(
          s.leads.map((l: Omit<Lead, "id" | "ref" | "currency" | "status">, i: number) => ({
            ...l,
            id: `manus-${i}`,
            ref: `L-${300 + i}`,
            currency: "GBP",
            status: "approval" as const,
          })),
        );
        setManus({ taskUrl: s.task_url, status: "done", note: "Manus returned live leads — approval required before outreach." });
      } else if (s.done) {
        if (poll.current) clearInterval(poll.current);
        setManus({ taskUrl: s.task_url, status: "done", note: "Manus finished but returned no parseable leads — see the task on Manus." });
      } else {
        setManus((m) => (m ? { ...m, status: s.status || "running" } : m));
      }
    }, 6000);
  }

  function addEvent(agent: keyof typeof COLOR, text: string, gate = false) {
    const mm = String(tmin.current).padStart(2, "0");
    tmin.current += 1;
    setEvents((prev) => [
      { id: `se-${evtN.current++}`, agent, text, ts: `18:${mm}`, color: COLOR[agent], gate },
      ...prev,
    ]);
  }

  function setLeadStatus(id: string, status: LeadStatus) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
  }

  function run() {
    if (playing) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    tmin.current = 40;
    evtN.current = 0;
    setLeads([]);
    setEvents([]);
    setPlaying(true);

    let acc = 200;
    const at = (ms: number, fn: () => void) => {
      acc += ms;
      timers.current.push(setTimeout(fn, acc));
    };

    // 1) Scout finds the leads
    SCOUT_LEADS.forEach((l, i) => {
      at(i === 0 ? 300 : 800, () => {
        setLeads((prev) => [...prev, { ...l, status: "found" }]);
        addEvent("Scout", `Found ${l.platform} post — ${l.likely_issue.split(" — ")[0]}`);
      });
    });
    // 2) Qualifier scores intent
    SCOUT_LEADS.forEach((l) => {
      at(750, () => {
        setLeadStatus(l.id, "qualified");
        addEvent("Qualifier", `Scored ${l.ref} ${l.intent_score}/100 intent — ${l.suggested_package}`);
      });
    });
    // 3) Outreach drafts a personalised reply
    SCOUT_LEADS.forEach((l) => {
      at(750, () => {
        setLeadStatus(l.id, "drafted");
        addEvent("Outreach", `Drafted personalised reply for ${l.ref}`);
      });
    });
    // 4) Trust boundary — outreach send needs human approval
    SCOUT_LEADS.forEach((l, idx) => {
      at(750, () => {
        setLeadStatus(l.id, "approval");
        addEvent("Operator", `${l.ref} ready — outreach send blocked, needs human approval`, true);
        if (idx === SCOUT_LEADS.length - 1) setPlaying(false);
      });
    });
  }

  async function convert(lead: Lead) {
    // human approved → send outreach + open a ticket
    try {
      const res = await fetch("/api/tickets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "Lead Scout",
          customer_email: `${lead.ref.toLowerCase()}@lead.thirtylabs`,
          tool_used: lead.platform,
          error_message: lead.signal,
          urgency: "medium",
        }),
      });
      const data = await res.json();
      const ref = data.ref ?? "T-???";
      setLeads((prev) =>
        prev.map((l) => (l.id === lead.id ? { ...l, status: "converted", converted_ref: ref } : l)),
      );
      addEvent("Operator", `Outreach approved — ${lead.ref} converted to ticket ${ref}`);
    } catch {
      addEvent("Operator", `Convert failed for ${lead.ref}`);
    }
  }

  return (
    <div className="page">
      <div className="scout-page">
        <div className="scout-inner">
          <div className="scout-head">
            <div>
              <div className="land-eyebrow" style={{ marginBottom: 14 }}>
                Autonomous Demand Discovery
              </div>
              <h2>Lead Scout</h2>
              <p className="scout-sub">
                The company doesn&apos;t just wait for tickets — it finds stuck founders. Scout
                surfaces public posts about broken Lovable/Bolt/Cursor/Supabase apps, Qualifier
                scores intent, Outreach drafts a personalised reply. Sending stops at a human
                approval gate. Approved leads convert into tickets.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button className="replay-btn" onClick={run} disabled={playing}>
                {playing ? "● scouting…" : "▶ Run Lead Scout"}
              </button>
              <button
                className="replay-btn"
                style={{ color: "var(--purple)", borderColor: "rgba(167,139,250,.3)", background: "rgba(167,139,250,.08)" }}
                onClick={runManus}
                disabled={manus?.status === "running" || manus?.status === "starting"}
              >
                {manus?.status === "running" || manus?.status === "starting" ? "● Manus…" : "⚡ Run with Manus (live)"}
              </button>
            </div>
          </div>

          {manus && (
            <div
              className="trust-banner"
              style={{
                marginBottom: 18,
                borderColor: "rgba(167,139,250,.3)",
                color: manus.status === "error" ? "var(--red)" : "var(--purple)",
              }}
            >
              Manus · {manus.status} — {manus.note}
              {manus.taskUrl && (
                <>
                  {" "}
                  <a href={manus.taskUrl} target="_blank" rel="noreferrer" style={{ color: "var(--amber)" }}>
                    watch on Manus →
                  </a>
                </>
              )}
            </div>
          )}

          <div className="scout-pipeline">
            <span className="sp-step"><b>Scout</b> · Manus AI · finds posts</span>
            <span className="sp-step"><b>Qualifier</b> · scores intent</span>
            <span className="sp-step"><b>Outreach</b> · drafts reply</span>
            <span className="sp-step gate"><b>Approval gate</b> · human before send</span>
            <span className="sp-step"><b>Convert</b> · lead → ticket</span>
          </div>

          {leads.length === 0 ? (
            <div className="scout-empty">
              Press <b>▶ Run Lead Scout</b> to watch the company discover demand on its own.
            </div>
          ) : (
            <div className="scout-grid">
              {leads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} onConvert={() => convert(lead)} />
              ))}
            </div>
          )}

          {events.length > 0 && (
            <div style={{ marginTop: 36 }}>
              <div className="sec-eyebrow" style={{ marginBottom: 12 }}>
                Scout activity
              </div>
              <div style={{ border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden" }}>
                {events.map((e) => (
                  <div key={e.id} className="feed-entry" style={{ animation: "none" }}>
                    <div className="feed-row1">
                      <span className="feed-agent" style={{ color: e.color }}>{e.agent}</span>
                      <span className="feed-ts">{e.ts}</span>
                    </div>
                    <div className="feed-text" style={{ marginBottom: e.gate ? 5 : 0 }}>{e.text}</div>
                    {e.gate && <span className="chip chip-gate">Trust boundary</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LeadCard({ lead, onConvert }: { lead: Lead; onConvert: () => void }) {
  const badge = STATUS_BADGE[lead.status];
  const showDraft = lead.status === "drafted" || lead.status === "approval";
  return (
    <div className={`lead-card ${lead.status}`}>
      <div className="lead-top">
        <span className="lead-platform">{lead.platform}</span>
        <span className="lead-score">{lead.intent_score}/100</span>
      </div>
      <div className="lead-ref">{lead.ref}</div>
      <div className="lead-signal">&quot;{lead.signal}&quot;</div>
      <div className="lead-meta">
        <div className="lead-row">
          <span className="k">Likely issue</span>
          <span className="v">{lead.likely_issue}</span>
        </div>
        <div className="lead-row">
          <span className="k">Suggested offer</span>
          <span className="v amber">{lead.suggested_package} · {money(lead.suggested_price, lead.currency)}</span>
        </div>
      </div>

      {showDraft && (
        <div className="lead-draft">
          <div className="lead-draft-label">Outreach draft · not sent — approval required</div>
          {lead.outreach_draft}
        </div>
      )}

      <div className="lead-top">
        <span className={`lead-badge ${badge.cls}`}>{badge.label}</span>
      </div>

      {lead.status === "approval" && (
        <>
          <div className="lead-gate-note">
            🔒 Not sent — human approval required. Displayed in-app only; never sent to the post author.
          </div>
          <div className="lead-actions">
            <button className="approve-btn" onClick={onConvert}>
              Approve &amp; convert to ticket →
            </button>
          </div>
        </>
      )}

      {lead.status === "converted" && lead.converted_ref && (
        <div className="lead-converted-row">
          ✓ Converted to{" "}
          <Link href="/dashboard">{lead.converted_ref}</Link> · outreach not sent
        </div>
      )}
    </div>
  );
}
