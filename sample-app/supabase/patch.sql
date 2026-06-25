-- ════════════════════════════════════════════════════════════════
-- T-102 · Auth Rescue patch · generated in Cursor by the Repair Engineer
-- ════════════════════════════════════════════════════════════════
-- Root cause: profiles has RLS enabled with no INSERT policy, so the
-- client-side `insert` after signup is silently rejected and the
-- profile row is never created. The dashboard then reads null.
--
-- Fix: (1) allow a user to insert/update their OWN profile, and
--      (2) auto-create the profile row on signup via a trigger, so the
--          app works even if the client forgets to insert.
-- Verified: Modal sandbox `npm run build` → passed, no secrets, no
--           destructive SQL.
-- ════════════════════════════════════════════════════════════════

-- (1) Let a user manage their own profile row.
create policy "insert own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "update own profile"
  on profiles for update
  using (auth.uid() = id);

-- (2) Auto-create a profile row whenever a new user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
