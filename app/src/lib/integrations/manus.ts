// Phase 7 — Manus AI integration (server-only). Real v1 API, confirmed against
// the account: create a task, poll it, parse the structured lead output.
//
//   POST   https://api.manus.ai/v1/tasks         (header: API_KEY)  -> {task_id, task_url}
//   GET    https://api.manus.ai/v1/tasks/{id}     (header: API_KEY)  -> {status, output[]}

const MANUS_API_KEY = process.env.MANUS_API_KEY;
const BASE = "https://api.manus.ai/v1";

export const isManusConfigured = Boolean(MANUS_API_KEY);

export interface ScoutedLead {
  platform: string;
  signal: string;
  likely_issue: string;
  intent_score: number;
  suggested_package: string;
  suggested_price: number;
  outreach_draft: string;
}

const SCOUT_PROMPT =
  "You are the Scout agent for Thirty Labs, an autonomous repair desk for broken AI-built apps. " +
  "Find 3 recent public posts (Reddit, X, forums) where someone has a broken app built with Lovable, " +
  "Bolt, Cursor, v0 or Supabase (auth/RLS, deploy/env, payments/webhooks, or database issues). " +
  'Return ONLY a JSON object, no prose: {"leads":[{"platform":"","signal":"<short quote>",' +
  '"likely_issue":"","intent_score":0,"suggested_package":"Triage|Deploy Rescue|Auth Rescue|MVP Rescue",' +
  '"suggested_price":99,"outreach_draft":"<short personalised reply>"}]} with exactly 3 leads.';

function headers() {
  return { API_KEY: MANUS_API_KEY as string, "Content-Type": "application/json" };
}

export interface ManusTaskRef {
  task_id: string;
  task_url: string;
  task_title?: string;
}

/** Kick off a real Manus scouting run. Returns immediately (the task runs async). */
export async function createScoutTask(): Promise<ManusTaskRef> {
  if (!isManusConfigured) throw new Error("MANUS_API_KEY not set");
  const res = await fetch(`${BASE}/tasks`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ prompt: SCOUT_PROMPT, agentProfile: "manus-1.6-lite", hidden: true }),
  });
  if (!res.ok) throw new Error(`Manus create ${res.status}: ${await res.text()}`);
  const d = await res.json();
  return { task_id: d.task_id, task_url: d.task_url, task_title: d.task_title };
}

const RUNNING = new Set(["running", "pending", "queued", "created", "in_progress"]);

export interface ManusTaskState {
  status: string;
  done: boolean;
  task_url: string;
  leads: ScoutedLead[] | null;
  text: string; // latest assistant text (for display / debugging)
}

/** Poll a task: returns its status, and parsed leads once it has produced JSON. */
export async function getScoutTask(id: string): Promise<ManusTaskState> {
  if (!isManusConfigured) throw new Error("MANUS_API_KEY not set");
  const res = await fetch(`${BASE}/tasks/${id}`, { headers: headers() });
  if (!res.ok) throw new Error(`Manus get ${res.status}: ${await res.text()}`);
  const d = await res.json();
  const status: string = d.status ?? "unknown";
  const text = latestAssistantText(d.output ?? []);
  const leads = parseLeads(text);
  return {
    status,
    done: !RUNNING.has(status),
    task_url: d.metadata?.task_url ?? `https://manus.im/app/${id}`,
    leads,
    text,
  };
}

function latestAssistantText(output: unknown[]): string {
  for (let i = output.length - 1; i >= 0; i--) {
    const m = output[i] as { role?: string; content?: { text?: string }[] };
    if (m?.role === "assistant" && Array.isArray(m.content)) {
      const t = m.content.map((c) => c?.text ?? "").join("").trim();
      if (t) return t;
    }
  }
  return "";
}

/** Pull a leads array out of free-form Manus output (handles ```json fences). */
function parseLeads(text: string): ScoutedLead[] | null {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidates = [fenced?.[1], text.match(/\{[\s\S]*\}/)?.[0]].filter(Boolean) as string[];
  for (const c of candidates) {
    try {
      const obj = JSON.parse(c);
      if (Array.isArray(obj?.leads)) return obj.leads as ScoutedLead[];
    } catch {
      /* try next */
    }
  }
  return null;
}
