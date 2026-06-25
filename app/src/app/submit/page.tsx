"use client";

import { useState } from "react";
import Link from "next/link";

const TOOLS = ["Lovable", "Bolt", "Cursor", "v0", "Replit", "Supabase Studio", "Other"];
const URGENCY = [
  { key: "low", label: "Low", cls: "u-low" },
  { key: "medium", label: "Medium", cls: "u-med" },
  { key: "high", label: "High — blocking launch", cls: "u-high" },
];

interface Result {
  ref: string;
  demo: boolean;
}

export default function SubmitPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tool, setTool] = useState<string | null>(null);
  const [appUrl, setAppUrl] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [error, setError] = useState("");
  const [expected, setExpected] = useState("");
  const [urgency, setUrgency] = useState("medium");
  const [perm, setPerm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [formError, setFormError] = useState("");

  async function submit() {
    setFormError("");
    if (!email || !error) {
      setFormError("Email and an error / symptom description are required.");
      return;
    }
    if (!perm) {
      setFormError("Please confirm Autopilot may analyse the submitted material.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/tickets/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: name,
          customer_email: email,
          tool_used: tool,
          app_url: appUrl,
          repo_url: repoUrl,
          error_message: error,
          expected_behavior: expected,
          urgency,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");
      setResult({ ref: data.ref, demo: Boolean(data.demo) });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page">
      <div className="submit-page">
        <div className="submit-inner">
          <div className="form-hd">
            <h2>Submit Broken App</h2>
            <p>
              Autopilot will triage your issue, diagnose the root cause, and return a fix plan
              and quote. Everything you submit becomes a ticket the agents work autonomously.
            </p>
            <span className="form-route">POST → /api/tickets/create → Supabase</span>
          </div>

          {result ? (
            <div className="submit-result">
              <div className="sr-label">✓ Ticket created — Autopilot is running</div>
              <div className="sr-id">{result.ref}</div>
              <div className="sr-status">STATUS: Queued for autonomous triage</div>
              <div className="sr-note">
                {result.demo
                  ? "Demo mode — no Supabase configured, so this ticket is illustrative. "
                  : "Diagnosis and quote will be logged to the dashboard as agents work. "}
                <Link href="/dashboard">Track live in the dashboard →</Link>
              </div>
            </div>
          ) : (
            <>
              <div className="fg">
                <label>Name</label>
                <input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="fg">
                <label>Email</label>
                <input type="email" placeholder="you@yourapp.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>

              <div className="fg">
                <label>Tool used to build the app</label>
                <div className="pills">
                  {TOOLS.map((t) => (
                    <span
                      key={t}
                      className={`pill${tool === t ? " on" : ""}`}
                      onClick={() => setTool(tool === t ? null : t)}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="fg">
                <label>App URL</label>
                <input type="text" placeholder="https://yourapp.vercel.app" value={appUrl} onChange={(e) => setAppUrl(e.target.value)} />
              </div>
              <div className="fg">
                <label>Repo link (optional)</label>
                <input type="text" placeholder="https://github.com/you/repo" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} />
              </div>
              <div className="fg">
                <label>Error message / symptoms</label>
                <textarea placeholder="Paste the error, describe what's broken, or share console output" value={error} onChange={(e) => setError(e.target.value)} />
              </div>
              <div className="fg">
                <label>What should the app be doing?</label>
                <textarea placeholder="Describe expected behaviour vs what actually happens" value={expected} onChange={(e) => setExpected(e.target.value)} />
              </div>

              <div className="fg">
                <label>Urgency</label>
                <div className="urgency-row">
                  {URGENCY.map((u) => (
                    <span
                      key={u.key}
                      className={`urgency-pill ${u.cls}${urgency === u.key ? " on" : ""}`}
                      onClick={() => setUrgency(u.key)}
                    >
                      {u.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="fg">
                <div className="cb-row">
                  <input type="checkbox" id="perm" checked={perm} onChange={(e) => setPerm(e.target.checked)} />
                  <span>I confirm Thirty Labs can analyse the submitted material for diagnostic purposes.</span>
                </div>
              </div>

              <button
                className="btn-p"
                style={{ width: "100%", padding: 13, fontSize: 12 }}
                onClick={submit}
                disabled={submitting}
              >
                {submitting ? "Submitting…" : "Submit to Autopilot →"}
              </button>
              {formError && <div className="form-err">{formError}</div>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
