-- ════════════════════════════════════════════════════════════════
-- Seed data — mirrors src/lib/demo-data.ts so live mode tells the
-- same T-102 story as the fallback. Run AFTER schema.sql.
-- ════════════════════════════════════════════════════════════════

-- Tickets ----------------------------------------------------------
insert into tickets (ref, source, customer_name, customer_email, tool_used, issue_summary, expected_behavior,
  repo_url, app_url, error_message, urgency, status, issue_category, confidence_score,
  suggested_package, suggested_price, risk_level, approval_required, approval_reason, trust_boundary, created_at)
values
('T-102','Wassit','Priya N.','priya@launchpad.app','Lovable + Supabase',
 'Signup works, but the dashboard crashes — no profile row is created',
 'After signup a row should be inserted into profiles, and the dashboard should load the user''s profile.',
 'https://github.com/launchpad/app','https://launchpad.vercel.app',
 'TypeError: Cannot read properties of null (reading ''full_name'') — profiles row missing',
 'high','approval','Auth / RLS',86,'Supabase / Auth Rescue',99,'high',true,
 'Patch is a production database change + client delivery — requires human approval.',
 'Production deploy and client delivery require approval','2026-06-25T18:02:00Z'),
('L-201','Operator (Manus AI)',null,null,'Bolt + Vercel','Vercel deploy failing after Bolt changes',
 null,null,null,null,'medium','new','Deploy / Config',71,null,null,'low',false,null,null,'2026-06-25T18:33:00Z'),
('L-202','Operator (Manus AI)',null,null,'Supabase','Supabase storage not uploading files',
 null,null,null,null,'low','new','Storage',64,null,null,'low',false,null,null,'2026-06-25T18:31:00Z'),
('T-103','Submit form','Marcus','marcus@indie.dev','Lovable','Lovable auth — users not persisting on refresh',
 'Session should persist across reloads.',null,null,null,'medium','qualified','Auth / Session',79,null,null,'low',false,null,null,'2026-06-25T17:58:00Z'),
('T-104','Submit form','Dana','dana@shopkit.io','v0 + Stripe','v0 + Stripe webhooks not firing on prod',
 'Subscription state should update after checkout.',null,null,null,'high','diagnosing','Payments / Webhooks',68,null,null,'medium',false,null,null,'2026-06-25T17:46:00Z'),
('T-105','Submit form','Ife','ife@boltbuild.app','Bolt + Supabase','Bolt + Supabase — RLS blocks all reads on orders',
 'Users should read their own orders.',null,null,null,'medium','patch_ready','Auth / RLS',81,'Supabase / Auth Rescue',99,'medium',true,
 'Touches RLS policies — review before apply.','Production deploy requires approval','2026-06-25T17:30:00Z'),
('T-106','Submit form','Sam','sam@edgeapp.dev','Vercel','Deploy Rescue — Vercel env config drift',
 'Build should pick up Supabase env vars.',null,null,null,'medium','payment','Deploy / Config',88,'Deploy Rescue',49,'low',false,null,null,'2026-06-25T17:12:00Z'),
('T-100','Submit form','Lena','lena@cursorbuild.dev','Cursor + Supabase','Cursor/Supabase — schema migration drift',
 'Migrations should match production schema.',null,null,null,'low','delivered','Database',90,'MVP Rescue',99,'low',false,null,null,'2026-06-25T14:05:00Z')
on conflict (ref) do nothing;

-- T-102 agent runs -------------------------------------------------
insert into agent_runs (ticket_id, ticket_ref, agent_name, action, tool_used, status, requires_approval, created_at)
select t.id, v.ticket_ref, v.agent_name, v.action, v.tool_used, v.status, v.requires_approval, v.created_at::timestamptz
from (values
  ('T-102','Front Desk','Wassit intake — captured Lovable+Supabase issue: signup ok, dashboard crashes','Wassit','ok',false,'2026-06-25T18:02:00Z'),
  ('T-102','Operator','Picked up T-102, scored intent 86/100, routed to diagnosis','Manus AI','ok',false,'2026-06-25T18:04:00Z'),
  ('T-102','Diagnoser','Classified as Auth/RLS — missing INSERT policy on profiles table','Manus AI + Supabase','ok',false,'2026-06-25T18:07:00Z'),
  ('T-102','Diagnoser','Root cause confirmed: no row inserted into profiles after signup — confidence 86%','Manus AI','ok',false,'2026-06-25T18:09:00Z'),
  ('T-102','Repair Engineer','Generated SQL patch in Cursor — RLS insert policy + handle_new_user trigger','Cursor','ok',false,'2026-06-25T18:13:00Z'),
  ('T-102','QA Guard','Modal sandbox: npm run build passed in 38s, no secrets detected','Modal','ok',false,'2026-06-25T18:18:00Z'),
  ('T-102','Finance Clerk','Created £99 Auth Rescue PayPal sandbox checkout — logged to Supabase','PayPal','ok',false,'2026-06-25T18:22:00Z'),
  ('T-102','Operator','Trust boundary reached — production deploy + client delivery need human approval','Manus AI','gate',true,'2026-06-25T18:25:00Z'),
  ('T-104','Diagnoser','T-104 diagnosing — Stripe webhook endpoint not registered on prod','Manus AI','run',false,'2026-06-25T18:28:00Z'),
  ('L-201','Operator','New lead L-201 found — Bolt rebuild broke Vercel deploy','Manus AI','ok',false,'2026-06-25T18:33:00Z')
) as v(ticket_ref, agent_name, action, tool_used, status, requires_approval, created_at)
left join tickets t on t.ref = v.ticket_ref;

-- T-102 repair plan ------------------------------------------------
insert into repair_plans (ticket_id, diagnosis, repair_steps, patch_summary, patch_diff, risk_level, created_at)
select t.id,
 'Signup creates an auth.users row but nothing inserts into profiles. The profiles table has RLS enabled with no INSERT policy, so the client insert is silently rejected and the dashboard reads null.',
 '["Add an INSERT policy on profiles scoped to auth.uid() = id","Add an UPDATE policy on profiles for the owner","Add a handle_new_user trigger to auto-create the profile row on signup"]'::jsonb,
 '2 RLS policies + auth.users → profiles trigger',
 E'-- T-102 · Repair Engineer · generated in Cursor\nALTER TABLE profiles ENABLE ROW LEVEL SECURITY;\n\nCREATE POLICY "insert own profile"\n  ON profiles FOR INSERT\n  WITH CHECK (auth.uid() = id);\n\nCREATE POLICY "update own profile"\n  ON profiles FOR UPDATE\n  USING (auth.uid() = id);\n\n-- Modal sandbox: npm run build -> passed',
 'high','2026-06-25T18:13:00Z'
from tickets t where t.ref = 'T-102';

-- Payments ---------------------------------------------------------
insert into payments (ticket_id, provider, amount, currency, checkout_url, status, created_at)
select t.id, 'PayPal', v.amount, 'GBP', v.url, v.status, v.created_at::timestamptz
from (values
  ('T-102',99,'https://sandbox.paypal.com/checkoutnow?token=DEMO102','created','2026-06-25T18:22:00Z'),
  ('T-106',49,'https://sandbox.paypal.com/checkoutnow?token=DEMO106','created','2026-06-25T17:12:00Z'),
  ('T-100',99,'https://sandbox.paypal.com/checkoutnow?token=DEMO100','paid','2026-06-25T14:05:00Z')
) as v(ref, amount, url, status, created_at)
join tickets t on t.ref = v.ref;

-- T-102 safety flags ----------------------------------------------
insert into safety_flags (ticket_id, flag_type, severity, description, requires_approval, resolved, created_at)
select t.id, v.flag_type, v.severity, v.description, v.requires_approval, v.resolved, v.created_at::timestamptz
from (values
  ('T-102','secret_detected','info','No secrets found in submitted scope',false,true,'2026-06-25T18:18:00Z'),
  ('T-102','production_db_access','high','Patch is a production database change',true,false,'2026-06-25T18:19:00Z'),
  ('T-102','client_delivery','high','Delivering the fix to the customer requires approval',true,false,'2026-06-25T18:25:00Z')
) as v(ref, flag_type, severity, description, requires_approval, resolved, created_at)
join tickets t on t.ref = v.ref;
