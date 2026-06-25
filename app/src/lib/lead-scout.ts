// Seeded Lead Scout data (Phase 3.5). Lets the dashboard show autonomous client
// discovery even before real Manus / social search is connected.

import type { Lead } from "./types";

export const SCOUT_LEADS: Omit<Lead, "status" | "converted_ref">[] = [
  {
    id: "lead-018",
    ref: "L-018",
    platform: "Reddit · r/Supabase",
    signal:
      "Built my whole app with Lovable + Supabase. Signup works but profile data won't save and the dashboard crashes. auth.users has the row, profiles is empty. Losing my mind.",
    likely_issue: "Auth / RLS — missing profiles INSERT policy",
    intent_score: 91,
    suggested_package: "Supabase / Auth Rescue",
    suggested_price: 99,
    currency: "GBP",
    outreach_draft:
      "Hey — saw your post about Lovable + Supabase profiles staying empty. That's almost always a missing RLS INSERT policy on profiles (the insert is silently rejected). We can ship a tested SQL patch + trigger that fixes it in under an hour. Want the diagnosis?",
  },
  {
    id: "lead-019",
    ref: "L-019",
    platform: "X / Twitter",
    signal:
      "bolt + supabase app builds locally but every Vercel deploy fails now. pretty sure it's env vars but I've added them 3 times. anyone?",
    likely_issue: "Deploy / Config — Vercel env var drift",
    intent_score: 78,
    suggested_package: "Deploy Rescue",
    suggested_price: 49,
    currency: "GBP",
    outreach_draft:
      "Saw your Bolt + Vercel deploy thread — when env vars 'don't take', it's usually scope (Preview vs Production) or a NEXT_PUBLIC_ prefix mismatch. We do a quick env audit + fix as a flat £49 Deploy Rescue. Happy to take a look.",
  },
  {
    id: "lead-020",
    ref: "L-020",
    platform: "Discord · Indie Hackers",
    signal:
      "v0 + Stripe: checkout works but the webhook never fires in prod so subscriptions stay 'pending' forever. been stuck 2 days.",
    likely_issue: "Payments / Webhooks — endpoint not registered on prod",
    intent_score: 84,
    suggested_package: "MVP Rescue",
    suggested_price: 99,
    currency: "GBP",
    outreach_draft:
      "Your v0 + Stripe webhook issue is a classic prod gap — the endpoint/secret usually isn't registered for the live environment, so events never arrive. We can wire + verify it end to end. Want a quick diagnosis?",
  },
];
