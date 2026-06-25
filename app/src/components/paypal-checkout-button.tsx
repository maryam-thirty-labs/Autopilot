"use client";

import { useState } from "react";

interface Result {
  checkout_url: string;
  order_id: string;
  demo: boolean;
}

export function PaypalCheckoutButton({
  ticketRef,
  amount,
  currency = "GBP",
}: {
  ticketRef: string;
  amount: number | null;
  currency?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  // Default to the standard Auth Rescue price when a ticket has no price yet
  // (live-created tickets from /loop, /submit, /scout don't carry one).
  const amt = amount ?? 99;

  async function create() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_ref: ticketRef, amount: amt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  const sym = currency === "GBP" ? "£" : "";

  if (result) {
    return (
      <div className="trust-banner" style={{ borderColor: "var(--mint-dim)", color: "var(--mint)" }}>
        ✓ PayPal {result.demo ? "(demo) " : "sandbox "}checkout created · order {result.order_id}
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "#FCD34D", margin: "4px 0" }}>
          Sandbox / test revenue — no real funds move
        </div>
        <a href={result.checkout_url} target="_blank" rel="noreferrer" style={{ color: "var(--amber)", wordBreak: "break-all" }}>
          {result.checkout_url}
        </a>
      </div>
    );
  }

  return (
    <div>
      <button className="approve-btn" onClick={create} disabled={loading}>
        {loading ? "Creating…" : `Create PayPal sandbox checkout · ${sym}${amt}`}
      </button>
      {error && <div className="form-err">{error}</div>}
    </div>
  );
}
