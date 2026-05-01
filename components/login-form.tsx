"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") ?? "/dashboard";
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="eyebrow block mb-1.5">email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="input input-lg"
          autoFocus
        />
      </div>
      <div>
        <label className="eyebrow block mb-1.5">password</label>
        <input
          type="password"
          required
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="••••••••"
          className="input input-lg"
        />
      </div>
      <button type="submit" disabled={loading} className="btn btn-primary w-full mt-2">
        {loading ? "signing in..." : "Sign in"}
        {!loading && <span aria-hidden>→</span>}
      </button>
      {err && (
        <div className="rounded-md bg-[#FFE9E9] border border-[#F4C5C5] p-3">
          <p className="text-error text-sm">{err}</p>
        </div>
      )}
    </form>
  );
}
