-- ════════════════════════════════════════════════════════════════
-- Thirty Labs Autopilot — Supabase schema (single source of truth)
-- Run in the Supabase SQL editor. Safety fields are part of the model
-- from the start (Phase 1.5), not bolted on later.
-- ════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ── tickets ──────────────────────────────────────────────────────
create table if not exists tickets (
  id                uuid primary key default gen_random_uuid(),
  ref               text unique,              -- human id, e.g. T-102
  source            text,                     -- Wassit / Submit form / Operator
  customer_name     text,
  customer_email    text,
  tool_used         text,
  issue_summary     text,
  expected_behavior text,
  repo_url          text,
  app_url           text,
  error_message     text,
  urgency           text default 'medium',
  status            text default 'new',       -- new|qualified|diagnosing|patch_ready|qa_passed|approval|payment|delivered
  issue_category    text,
  confidence_score  int,
  suggested_package text,
  suggested_price   numeric,
  currency          text default 'GBP',
  -- safety model
  risk_level        text default 'low',       -- low|medium|high
  approval_required boolean default false,
  approval_reason   text,
  trust_boundary    text,
  created_at        timestamptz default now()
);

-- ── agent_runs (the activity feed) ───────────────────────────────
create table if not exists agent_runs (
  id                uuid primary key default gen_random_uuid(),
  ticket_id         uuid references tickets(id) on delete cascade,
  ticket_ref        text,
  agent_name        text,                     -- Front Desk|Operator|Diagnoser|Repair Engineer|QA Guard|Finance Clerk
  action            text,
  tool_used         text,
  status            text default 'ok',        -- ok|warn|err|run|gate
  output            jsonb,
  requires_approval boolean default false,
  created_at        timestamptz default now()
);

-- ── repair_plans ─────────────────────────────────────────────────
create table if not exists repair_plans (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     uuid references tickets(id) on delete cascade,
  diagnosis     text,
  repair_steps  jsonb,
  patch_summary text,
  patch_diff    text,
  risk_level    text default 'low',
  created_at    timestamptz default now()
);

-- ── payments ─────────────────────────────────────────────────────
create table if not exists payments (
  id           uuid primary key default gen_random_uuid(),
  ticket_id    uuid references tickets(id) on delete cascade,
  provider     text default 'PayPal',
  amount       numeric,
  currency     text default 'GBP',
  checkout_url text,
  status       text default 'created',        -- created|paid|failed
  created_at   timestamptz default now()
);

-- ── safety_flags ─────────────────────────────────────────────────
create table if not exists safety_flags (
  id                uuid primary key default gen_random_uuid(),
  ticket_id         uuid references tickets(id) on delete cascade,
  flag_type         text,
  severity          text default 'info',       -- info|low|medium|high
  description       text,
  requires_approval boolean default true,
  resolved          boolean default false,
  created_at        timestamptz default now()
);

-- ── leads (Lead Scout — Phase 3.5 / 7) ───────────────────────────
create table if not exists leads (
  id                uuid primary key default gen_random_uuid(),
  ref               text unique,              -- L-018
  platform          text,                     -- Reddit / X / Discord
  signal            text,                     -- the public post text
  likely_issue      text,
  intent_score      int,
  suggested_package text,
  suggested_price   numeric,
  currency          text default 'GBP',
  outreach_draft    text,
  status            text default 'found',     -- found|qualified|drafted|approval|converted
  converted_ticket  uuid references tickets(id) on delete set null,
  created_at        timestamptz default now()
);

-- ── tool_events ──────────────────────────────────────────────────
create table if not exists tool_events (
  id            uuid primary key default gen_random_uuid(),
  ticket_id     uuid references tickets(id) on delete cascade,
  tool_name     text,
  event_summary text,
  status        text default 'ok',
  created_at    timestamptz default now()
);

-- ── realtime ─────────────────────────────────────────────────────
-- Dashboard subscribes to these so new rows stream in live.
alter publication supabase_realtime add table tickets;
alter publication supabase_realtime add table agent_runs;
alter publication supabase_realtime add table payments;
alter publication supabase_realtime add table safety_flags;
alter publication supabase_realtime add table tool_events;
alter publication supabase_realtime add table leads;

-- ── RLS (hackathon-permissive) ───────────────────────────────────
-- Anon may read everything (dashboard) and insert tickets (submit form).
-- All other writes go through API routes using the service-role key.
alter table tickets      enable row level security;
alter table agent_runs   enable row level security;
alter table repair_plans enable row level security;
alter table payments     enable row level security;
alter table safety_flags enable row level security;
alter table tool_events  enable row level security;
alter table leads        enable row level security;

do $$
declare t text;
begin
  foreach t in array array['tickets','agent_runs','repair_plans','payments','safety_flags','tool_events','leads']
  loop
    execute format('drop policy if exists "anon read %1$s" on %1$s;', t);
    execute format('create policy "anon read %1$s" on %1$s for select using (true);', t);
  end loop;
end $$;

drop policy if exists "anon insert tickets" on tickets;
create policy "anon insert tickets" on tickets for insert with check (true);
