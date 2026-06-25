import { isAnthropicConfigured, reason, type Reasoning } from "@/lib/integrations/anthropic";

// Phase 7 — live agent reasoning (Claude): diagnosis + patch + outreach for a lead.
// Falls back to scripted content when ANTHROPIC_API_KEY isn't set.
const FALLBACK: Reasoning = {
  diagnosis:
    "Signup creates an auth.users row but nothing inserts into profiles. The profiles table has RLS enabled with no INSERT policy, so the client insert is silently rejected and the dashboard reads null.",
  patch: `CREATE POLICY "insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();`,
  outreach:
    "Hi — saw your post about Supabase profiles staying empty. That's almost always a missing RLS INSERT policy (the insert is silently rejected). We can ship a tested SQL patch + trigger that fixes it fast. Want the diagnosis?",
  live: false,
};

export async function POST(request: Request) {
  let body: { signal?: string; likely_issue?: string; tool_used?: string; source_url?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isAnthropicConfigured || !body.signal) {
    return Response.json({ ...FALLBACK, configured: isAnthropicConfigured });
  }
  try {
    const r = await reason({
      signal: body.signal,
      likely_issue: body.likely_issue,
      tool_used: body.tool_used,
      source_url: body.source_url,
    });
    return Response.json({ ...r, configured: true });
  } catch (e) {
    return Response.json({ ...FALLBACK, configured: true, error: e instanceof Error ? e.message : "reason failed" });
  }
}
