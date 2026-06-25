import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

interface Profile {
  id: string;
  full_name: string;
}

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      // The profile row was never created (RLS blocked the insert), so this
      // returns null — but the UI below assumes it exists.
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();
      setProfile(data);
    })();
  }, []);

  return (
    <div>
      {/* 🐞 CRASH: profile is null, so reading profile.full_name throws
          "TypeError: Cannot read properties of null (reading 'full_name')".
          This is the exact symptom the customer reported in T-102. */}
      <h1>Welcome back, {profile.full_name.split(" ")[0]} 👋</h1>
      <p>Your account is ready.</p>
    </div>
  );
}
