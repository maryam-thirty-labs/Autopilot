import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * True when Supabase env vars are present. The whole app reads this:
 * configured  → live data + realtime from Supabase
 * unconfigured → local demo data + simulated feed (so the dashboard is never blank)
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

/** Browser/anon client — used by the dashboard for reads + realtime subscriptions. */
let browserClient: SupabaseClient | null = null;
export function getSupabaseBrowser(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!browserClient) {
    browserClient = createClient(url!, anonKey!, {
      realtime: { params: { eventsPerSecond: 5 } },
    });
  }
  return browserClient;
}

/**
 * Server client for API routes / server components. Prefers the service-role key
 * (bypasses RLS for inserts from our trusted glue) and falls back to anon.
 */
export function getSupabaseServer(): SupabaseClient | null {
  if (!url) return null;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const key = serviceKey || anonKey;
  if (!key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
