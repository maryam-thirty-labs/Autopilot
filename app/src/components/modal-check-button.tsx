"use client";

import { useState } from "react";
import type { QaResult } from "@/lib/integrations/modal";

export function ModalCheckButton({ ticketRef }: { ticketRef: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<(QaResult & { demo?: boolean }) | null>(null);
  const [error, setError] = useState("");

  async function run() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/modal/run-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_ref: ticketRef }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResult({ ...data.result, demo: data.demo });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    const ok = result.status === "passed";
    const color = ok ? "var(--mint)" : "var(--red)";
    const dim = ok ? "var(--mint-dim)" : "var(--red-dim)";
    return (
      <div className="trust-banner" style={{ borderColor: dim, color }}>
        Modal QA {result.status.toUpperCase()} · {result.command} · {result.duration}
        {result.demo ? " (demo)" : ` · ran on ${result.ran_on}`}
        <br />
        <span style={{ color: "var(--muted)" }}>
          {result.warnings.join(" · ")}
        </span>
      </div>
    );
  }

  return (
    <div>
      <button className="dismiss-btn" onClick={run} disabled={loading} style={{ marginTop: 0 }}>
        {loading ? "Running sandbox check…" : "▷ Run Modal QA check"}
      </button>
      {error && <div className="form-err">{error}</div>}
    </div>
  );
}
