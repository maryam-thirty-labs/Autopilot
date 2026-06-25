// Phase 7 — LIVE lead discovery. Searches public sources (Stack Overflow primary,
// GitHub issues fallback) for a real, recent Supabase auth/RLS/profile pain signal,
// scores it, and drafts outreach. Constrained to Supabase/auth so the live lead
// matches the canonical repair pipeline. Returns ONE real lead WITH a source URL.
//
// GET /api/scout/live  →  { ok, lead, source } | { ok:false, error }

interface LiveLead {
  ref: string;
  source: string;
  source_url: string;
  platform: string;
  signal: string;
  excerpt: string;
  tool_used: string;
  likely_issue: string;
  intent_score: number;
  urgency: string;
  suggested_package: string;
  suggested_price: number;
  outreach_draft: string;
  discovered_via: string;
}

// Constrained to Supabase auth / RLS / profile so discovery connects to the repair.
const SO_QUERIES = [
  "profile not created after signup RLS",
  "RLS policy insert profile denied",
  "supabase auth profile not saving",
  "row level security insert 401",
  "permission denied RLS supabase",
];

const PAIN = /(not|n['’]t|cannot|can['’]t|denied|fail|error|stuck|won['’]t|doesn['’]t|null|empty|help|issue|problem|not working|not saving|not created|403|401)/i;

function decode(s: string): string {
  return (s || "")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
}
function stripHtml(s: string): string {
  return decode((s || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function detectTool(text: string): string {
  const t = text.toLowerCase();
  for (const [needle, label] of [
    ["lovable", "Lovable + Supabase"], ["bolt", "Bolt + Supabase"],
    ["cursor", "Cursor + Supabase"], ["v0", "v0 + Supabase"], ["vercel", "Supabase + Vercel"],
  ] as const) {
    if (t.includes(needle)) return label;
  }
  return "Supabase";
}

function scoreLead(title: string, body: string, unanswered: boolean): number {
  const t = (title + " " + body).toLowerCase();
  let s = 70;
  if (unanswered) s += 10;
  if (t.includes("profile")) s += 6;
  if (t.includes("rls") || t.includes("row level security")) s += 6;
  if (t.includes("insert")) s += 4;
  if (t.includes("policy")) s += 3;
  if (t.includes("signup") || t.includes("sign up") || t.includes("auth")) s += 3;
  return Math.min(99, s);
}

function buildLead(opts: {
  source: string; url: string; title: string; body: string;
  unanswered: boolean; idtail: string; via: string;
}): LiveLead {
  const excerpt = stripHtml(opts.body).slice(0, 220);
  const intent = scoreLead(opts.title, excerpt, opts.unanswered);
  return {
    ref: `L-${opts.idtail}`,
    source: opts.source,
    source_url: opts.url,
    platform: opts.source,
    signal: stripHtml(opts.title),
    excerpt,
    tool_used: detectTool(opts.title + " " + excerpt),
    likely_issue: "Auth / RLS — Supabase profile / insert policy",
    intent_score: intent,
    urgency: intent >= 88 ? "high" : "medium",
    suggested_package: "Supabase / Auth Rescue",
    suggested_price: 99,
    outreach_draft:
      `Hi — saw your post "${stripHtml(opts.title).slice(0, 80)}". That pattern is almost ` +
      `always a missing or mis-scoped RLS INSERT policy on the profiles table — the insert is ` +
      `silently rejected, so no row is created. We ship a tested SQL patch + trigger that fixes ` +
      `it fast. Want the diagnosis?`,
    discovered_via: opts.via,
  };
}

async function fetchJson(url: string, headers: Record<string, string>, ms: number) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, { headers, signal: ctl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function fromStackOverflow(): Promise<LiveLead | null> {
  for (const q of SO_QUERIES) {
    const url =
      "https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=creation" +
      `&q=${encodeURIComponent(q)}&tagged=supabase&site=stackoverflow&pagesize=10&filter=withbody`;
    const data = await fetchJson(url, { Accept: "application/json" }, 9000);
    const items: Record<string, unknown>[] = data?.items ?? [];
    const hit = items.find((it) => PAIN.test(String(it.title) + " " + String(it.body ?? "")));
    if (hit) {
      return buildLead({
        source: "Stack Overflow",
        url: String(hit.link),
        title: String(hit.title),
        body: String(hit.body ?? ""),
        unanswered: Number(hit.answer_count ?? 0) === 0,
        idtail: String(hit.question_id).slice(-4),
        via: `Stack Overflow search · "${q}"`,
      });
    }
  }
  return null;
}

async function fromGitHub(): Promise<LiveLead | null> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "thirty-labs-scout",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const q = "supabase RLS profile insert policy in:title,body type:issue";
  const url = `https://api.github.com/search/issues?q=${encodeURIComponent(q)}&sort=created&order=desc&per_page=15`;
  const data = await fetchJson(url, headers, 9000);
  const items: Record<string, unknown>[] = data?.items ?? [];
  const hit = items.find((it) => PAIN.test(String(it.title) + " " + String(it.body ?? "")));
  if (!hit) return null;
  return buildLead({
    source: "GitHub Issues",
    url: String(hit.html_url),
    title: String(hit.title),
    body: String(hit.body ?? ""),
    unanswered: Number(hit.comments ?? 0) === 0,
    idtail: String(hit.number),
    via: "GitHub issue search",
  });
}

export async function GET() {
  const lead = (await fromStackOverflow()) ?? (await fromGitHub());
  if (!lead) {
    return Response.json({ ok: false, error: "No live lead found right now" }, { status: 200 });
  }
  return Response.json({ ok: true, lead, source: lead.source });
}
