# Thirty Labs — Autopilot

An autonomous repair desk for broken AI-built apps (Lovable, Bolt, Cursor, v0, Supabase).
Next.js on Vercel · Supabase as the single source of truth · Modal for sandboxed checks ·
PayPal sandbox for payments · Wassit intake · Manus agents · Cursor repair workspace.

> **Core principle:** everything becomes a Supabase event. The dashboard tells the story.
> Real integrations just make the events more credible.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

The app runs in **DEMO MODE** out of the box (local seed data + a simulated live feed),
so the dashboard is never blank. The nav shows a `DEMO MODE` badge until Supabase is wired.

## Go live with Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. SQL editor → run [`supabase/schema.sql`](supabase/schema.sql), then [`supabase/seed.sql`](supabase/seed.sql).
3. `cp .env.local.example .env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Settings → API)
   - `SUPABASE_SERVICE_ROLE_KEY` (server-only; used by API routes)
4. Restart. The badge flips to `AUTOPILOT RUNNING` and the dashboard streams rows via realtime.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing — pitch, what we fix, the six-agent loop, pricing, partners |
| `/submit` | Intake form → `POST /api/tickets/create` → Supabase |
| `/loop` | **Company Loop** — one **▶ Start Autopilot — Live Scout** button runs the whole company on one lead. **Lead discovery is LIVE** (`/api/scout/live` searches Stack Overflow + GitHub for a real Supabase/auth/RLS pain post, with source URL), then qualify → outreach → **human approval gate** → convert (Supabase) → diagnose → patch → **Modal QA (live)** → **PayPal (live)** → trust boundary. Demo fixture is an explicit fallback, never silent |
| `/dashboard` | Control room — status bar, agent feed, kanban pipeline, partner stack, ticket panel. **▶ Replay T-102** plays the full run |
| `/scout` | **Lead Scout** — autonomous demand discovery: Scout → Qualifier → Outreach → approval gate → convert-to-ticket. **▶ Run Lead Scout** |
| `/safety` | Approval-gate matrix + trust boundaries |
| `/ticket/[id]` | Full ticket: problem, **genuine before/after patch** (read from `sample-app/`), agent timeline, safety, payment |
| `/api/tickets/create` | Creates a ticket (+ Front Desk intake event) |
| `/api/agents/run-demo` | Inserts the scripted T-102 sequence into Supabase (live mode) |
| `/api/agents/log` | Generic agent-event logger for Manus/scripts/webhooks |

## The broken sample app

[`sample-app/`](../sample-app) is the deliberately-broken Lovable + Supabase app behind
ticket T-102 — the repo the Repair Engineer opens in Cursor. `supabase/schema.sql` is the
broken state (RLS on, no INSERT policy); `supabase/patch.sql` is the real fix. The T-102
ticket page reads both and shows the genuine before/after diff.

## The six agents → partners

| Agent | Job | Partner |
| --- | --- | --- |
| Front Desk | Captures the issue at intake | Wassit |
| Operator | Orchestrates the workflow | Manus AI |
| Diagnoser | Classifies + root-causes | Manus AI + Supabase |
| Repair Engineer | Generates the code / SQL patch | Cursor |
| QA Guard | Sandbox build + safety scan | Modal |
| Finance Clerk | Checkout + payment logging | PayPal |

## Build phases

- **0 Scaffold** ✅ · **1 Dashboard** ✅ · **1.5 Safety model** ✅ · **2 Intake** ✅ (early)
- **3 Demo harness** ✅ — `/api/agents/run-demo` + client player replay the T-102 sequence
- **3.5 Lead Scout** ✅ — seeded autonomous demand discovery (scout → qualify → outreach → approval gate → convert), replayable before real Manus/social search exists
- **4 Cursor repair** ✅ — broken sample app + genuine before/after patch on the ticket page
- **5 PayPal** ✅ **live** — `/api/paypal/create-order` creates a real sandbox order (OAuth + Orders v2), writes the payment + Finance Clerk event; "Create PayPal checkout" button on each ticket
- **6 Modal** ✅ **live** — `modal/qa_check.py` deployed (real secret + destructive-SQL scan + build step); `/api/modal/run-check` calls it, writes the QA Guard event; "Run Modal QA check" button on each ticket
- **7 Wassit + Manus real autonomy** ✅ — Wassit webhook live (`/api/wassit/webhook`); **real Manus lead scouting** wired (`/api/scout/run` + `/api/scout/status` → Manus v1 API; "⚡ Run with Manus (live)" button on /scout creates a real task, polls, parses leads). Seeded "▶ Run Lead Scout" remains as the fast/reliable demo path

The canonical demo is **ticket T-102**: a Lovable + Supabase app where signup works but the
dashboard crashes because no `profiles` row is created (missing RLS insert policy).
