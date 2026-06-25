import { createClient } from "@supabase/supabase-js";

// Lovable wired these from the Supabase integration panel.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);
