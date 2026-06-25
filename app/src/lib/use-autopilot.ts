"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowser, isSupabaseConfigured } from "./supabase";
import {
  DEMO_PAYMENTS,
  DEMO_RUNS,
  DEMO_SAFETY_FLAGS,
  DEMO_TICKETS,
} from "./demo-data";
import { DEMO_SEQUENCE, DEMO_TICKET_REF } from "./demo-sequence";
import type { AgentRun, Payment, SafetyFlag, Ticket } from "./types";

export interface AutopilotData {
  tickets: Ticket[];
  runs: AgentRun[]; // oldest → newest
  payments: Payment[];
  flags: SafetyFlag[];
  configured: boolean;
  loading: boolean;
  playing: boolean;
  playDemo: () => void;
}

// A couple of extra events that stream in over time in DEMO mode, so the
// feed feels alive even before a demo is explicitly replayed.
const DEMO_LIVE: AgentRun[] = [
  {
    id: "live-1", ticket_id: "demo-t-104", ticket_ref: "T-104", agent_name: "Diagnoser",
    action: "T-104 root cause: Stripe webhook secret missing in Vercel env",
    tool_used: "Manus AI", status: "ok", output: null, requires_approval: false,
    created_at: "2026-06-25T18:36:00Z",
  },
  {
    id: "live-2", ticket_id: "demo-l-202", ticket_ref: "L-202", agent_name: "Operator",
    action: "Qualifying L-202 — Supabase storage bucket policy suspected",
    tool_used: "Manus AI", status: "run", output: null, requires_approval: false,
    created_at: "2026-06-25T18:39:00Z",
  },
];

export function useAutopilot(): AutopilotData {
  const [tickets, setTickets] = useState<Ticket[]>(DEMO_TICKETS);
  const [runs, setRuns] = useState<AgentRun[]>(DEMO_RUNS);
  const [payments, setPayments] = useState<Payment[]>(DEMO_PAYMENTS);
  const [flags, setFlags] = useState<SafetyFlag[]>(DEMO_SAFETY_FLAGS);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [playing, setPlaying] = useState(false);

  const liveIdx = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const ticketsRef = useRef(tickets);
  ticketsRef.current = tickets;

  useEffect(() => {
    const sb = getSupabaseBrowser();

    // ── DEMO MODE: simulate a little background activity ──
    if (!sb) {
      const timer = setInterval(() => {
        if (liveIdx.current < DEMO_LIVE.length) {
          const next = DEMO_LIVE[liveIdx.current++];
          setRuns((prev) =>
            prev.some((r) => r.id === next.id) ? prev : [...prev, next],
          );
        }
      }, 9000);
      return () => clearInterval(timer);
    }

    // ── LIVE MODE: initial fetch + realtime ──
    let cancelled = false;
    (async () => {
      const [t, r, p, f] = await Promise.all([
        sb.from("tickets").select("*").order("created_at", { ascending: true }),
        sb.from("agent_runs").select("*").order("created_at", { ascending: true }),
        sb.from("payments").select("*").order("created_at", { ascending: true }),
        sb.from("safety_flags").select("*").order("created_at", { ascending: true }),
      ]);
      if (cancelled) return;
      if (t.data) setTickets(t.data as Ticket[]);
      if (r.data) setRuns(r.data as AgentRun[]);
      if (p.data) setPayments(p.data as Payment[]);
      if (f.data) setFlags(f.data as SafetyFlag[]);
      setLoading(false);
    })();

    const channel = sb
      .channel("autopilot")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, (payload) => {
        setTickets((prev) => upsert(prev, payload));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "agent_runs" }, (payload) => {
        setRuns((prev) => [...prev, payload.new as AgentRun]);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, (payload) => {
        setPayments((prev) => upsert(prev, payload));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "safety_flags" }, (payload) => {
        setFlags((prev) => upsert(prev, payload));
      })
      .subscribe();

    return () => {
      cancelled = true;
      sb.removeChannel(channel);
    };
  }, []);

  // clear any scheduled demo timers on unmount
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const playDemo = useCallback(() => {
    if (playing) return;

    // LIVE MODE: hand off to the server route; realtime streams the rows back.
    if (isSupabaseConfigured) {
      setPlaying(true);
      fetch("/api/agents/run-demo", { method: "POST" })
        .catch(() => {})
        .finally(() => setPlaying(false));
      return;
    }

    // DEMO MODE: drip the scripted sequence into local state.
    const ticket = ticketsRef.current.find((t) => t.ref === DEMO_TICKET_REF);
    if (!ticket) return;
    const tid = ticket.id;

    timers.current.forEach(clearTimeout);
    timers.current = [];

    // reset T-102 to a clean slate, then replay
    setRuns((prev) => prev.filter((r) => r.ticket_ref !== DEMO_TICKET_REF));
    setPayments((prev) => prev.filter((p) => p.ticket_id !== tid));
    setFlags((prev) => prev.filter((f) => f.ticket_id !== tid));
    setTickets((prev) => prev.map((t) => (t.id === tid ? { ...t, status: "new" } : t)));
    setPlaying(true);

    let acc = 400;
    DEMO_SEQUENCE.forEach((step, i) => {
      acc += step.delayMs;
      const created = `2026-06-25T18:${String(40 + i).padStart(2, "0")}:00Z`;
      const to = setTimeout(() => {
        setRuns((prev) => [
          ...prev,
          {
            id: `demo-play-${i}`, ticket_id: tid, ticket_ref: DEMO_TICKET_REF,
            agent_name: step.agent_name, action: step.action, tool_used: step.tool_used,
            status: step.status, output: null, requires_approval: !!step.requires_approval,
            created_at: created,
          },
        ]);
        if (step.setStatus) {
          setTickets((prev) =>
            prev.map((t) => (t.id === tid ? { ...t, status: step.setStatus! } : t)),
          );
        }
        if (step.addPayment) {
          setPayments((prev) => [
            ...prev,
            { id: `demo-pay-${i}`, ticket_id: tid, provider: "PayPal", created_at: created, ...step.addPayment! },
          ]);
        }
        if (step.addFlags) {
          setFlags((prev) => [
            ...prev,
            ...step.addFlags!.map((f, j) => ({ id: `demo-flag-${i}-${j}`, ticket_id: tid, created_at: created, ...f })),
          ]);
        }
        if (i === DEMO_SEQUENCE.length - 1) setPlaying(false);
      }, acc);
      timers.current.push(to);
    });
  }, [playing]);

  return { tickets, runs, payments, flags, configured: isSupabaseConfigured, loading, playing, playDemo };
}

// merge an INSERT/UPDATE realtime payload into an array keyed by id
function upsert<T extends { id: string }>(
  prev: T[],
  payload: { new: Record<string, unknown> },
): T[] {
  const row = payload.new as T;
  if (!row?.id) return prev;
  const idx = prev.findIndex((x) => x.id === row.id);
  if (idx === -1) return [...prev, row];
  const copy = prev.slice();
  copy[idx] = row;
  return copy;
}
