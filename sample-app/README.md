# launchpad — broken sample app (ticket T-102)

A deliberately-broken Lovable + Supabase app, used as the live repair demo for
Thirty Labs Autopilot. This is the repo the **Repair Engineer (Cursor)** opens to
generate the fix.

## The symptom (what the customer reported)

> "Built my whole app with Lovable and Supabase. Auth works fine but profile data
> doesn't save. I can see the `auth.users` row but the `profiles` table stays empty.
> The dashboard crashes right after signup."

```
TypeError: Cannot read properties of null (reading 'full_name')
    at Dashboard (src/pages/Dashboard.tsx)
```

## The root cause

`profiles` has **RLS enabled** with a SELECT policy but **no INSERT policy**, and there
is **no trigger** to create the profile on signup. So:

1. `supabase.auth.signUp(...)` → creates the `auth.users` row ✅
2. `supabase.from("profiles").insert(...)` → **silently rejected by RLS** ❌
3. `Dashboard` reads `profiles` → gets `null` → `null.full_name` throws 💥

See [`supabase/schema.sql`](supabase/schema.sql) for the broken state and
[`src/pages/SignUp.tsx`](src/pages/SignUp.tsx) / [`src/pages/Dashboard.tsx`](src/pages/Dashboard.tsx)
for the failing flow.

## The fix

[`supabase/patch.sql`](supabase/patch.sql) — generated in Cursor, verified in a Modal
sandbox. It adds:

| Before (broken) | After (patch) |
| --- | --- |
| RLS on, SELECT policy only | + INSERT policy `auth.uid() = id` |
| client insert silently rejected | + UPDATE policy for the owner |
| no profile row created | + `handle_new_user` trigger auto-creates the row on signup |

After applying the patch: signup creates the profile row, the dashboard loads, no crash.

## Package: Supabase / Auth Rescue — £99

This is the most common repair Autopilot sees. The full autonomous run (intake →
diagnosis → patch → QA → quote → approval) is replayable on the dashboard via
**▶ Replay T-102**, and the genuine before/after diff is shown on
`/ticket/T-102` in the Thirty Labs app.
