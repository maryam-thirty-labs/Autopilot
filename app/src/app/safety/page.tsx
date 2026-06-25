export const metadata = { title: "Safety — Thirty Labs" };

const GATES: { action: string; allowed: string; approval: string }[] = [
  { action: "Find public leads", allowed: "auto", approval: "no" },
  { action: "Score lead intent", allowed: "auto", approval: "no" },
  { action: "Technical diagnosis", allowed: "auto", approval: "no" },
  { action: "Patch generation (Cursor)", allowed: "auto", approval: "no" },
  { action: "Run sandbox build check (Modal)", allowed: "auto", approval: "no" },
  { action: "Draft outreach message", allowed: "auto", approval: "no" },
  { action: "Send outreach to lead", allowed: "no", approval: "gate" },
  { action: "Generate payment link (PayPal)", allowed: "auto", approval: "no" },
  { action: "Production database change", allowed: "no", approval: "gate" },
  { action: "Destructive SQL execution", allowed: "no", approval: "gate" },
  { action: "Access secrets / env vars", allowed: "no", approval: "block" },
  { action: "Charge a real customer", allowed: "no", approval: "gate" },
  { action: "Production deployment", allowed: "no", approval: "gate" },
];

const FLAGS = [
  { ico: "🔑", key: "secret_detected", st: "false — no secrets in scope", cls: "fst-ok" },
  { ico: "🗄️", key: "production_database_access", st: "blocked — sandbox only", cls: "fst-blk" },
  { ico: "⚠️", key: "destructive_sql", st: "requires approval before run", cls: "fst-sb" },
  { ico: "📩", key: "outreach_send", st: "requires approval before send", cls: "fst-sb" },
  { ico: "💳", key: "payment_capture", st: "sandbox mode only — no real charges", cls: "fst-sb" },
  { ico: "🚀", key: "production_deploy", st: "blocked — human approval required", cls: "fst-blk" },
];

function allowedBadge(v: string) {
  if (v === "auto") return <span className="b-auto">Yes</span>;
  return <span className="b-no">No</span>;
}
function approvalBadge(v: string) {
  if (v === "no") return <span className="b-no">No</span>;
  if (v === "block") return <span className="b-block">Blocked entirely</span>;
  return <span className="b-gate">Yes — human gate</span>;
}

export default function SafetyPage() {
  return (
    <div className="page">
      <div className="safety-page">
        <div className="safety-inner">
          <div className="land-eyebrow" style={{ marginBottom: 18 }}>
            Safety Architecture
          </div>
          <h2>Human oversight by design</h2>
          <p className="safety-sub">
            Autopilot runs autonomously within defined trust boundaries. Every action with
            real-world consequence — contacting a real person, touching a production system,
            capturing real payment — stops and waits for explicit human approval before executing.
          </p>

          <div className="safety-quote">
            &quot;Thirty Labs runs autonomously until it reaches a trust boundary:
            <br />
            outreach, secrets, production databases, or real payment capture.&quot;
          </div>

          <div className="sec-eyebrow" style={{ marginBottom: 14 }}>
            Approval gate matrix
          </div>
          <table className="s-table">
            <thead>
              <tr>
                <th>Action</th>
                <th>Agent allowed?</th>
                <th>Approval required?</th>
              </tr>
            </thead>
            <tbody>
              {GATES.map((g) => (
                <tr key={g.action}>
                  <td>{g.action}</td>
                  <td>{allowedBadge(g.allowed)}</td>
                  <td>{approvalBadge(g.approval)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="sec-eyebrow" style={{ marginBottom: 14 }}>
            Current system flags
          </div>
          <div className="flag-grid">
            {FLAGS.map((f) => (
              <div className="flag-card" key={f.key}>
                <div className="fc-ico">{f.ico}</div>
                <div>
                  <div className="fc-key">{f.key}</div>
                  <div className={`fc-st ${f.cls}`}>{f.st}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
