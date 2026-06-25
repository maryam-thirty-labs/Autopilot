import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const navigate = useNavigate();

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();

    // 1) Create the auth user — this works fine.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return alert(error.message);

    // 2) Try to create the profile row.
    //    🐞 This insert is silently REJECTED by RLS — there is no INSERT
    //    policy on profiles. No row is created, but no error is surfaced
    //    to the user either, so signup "looks" successful.
    await supabase.from("profiles").insert({
      id: data.user?.id,
      full_name: fullName,
    });

    // 3) Off to the dashboard… which will crash (see Dashboard.tsx).
    navigate("/dashboard");
  }

  return (
    <form onSubmit={handleSignUp}>
      <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Full name" />
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
      <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" />
      <button type="submit">Create account</button>
    </form>
  );
}
