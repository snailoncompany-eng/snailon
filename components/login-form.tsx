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
    <form onSubmit={submit} className="space-y-3">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email"
        className="w-full bg-transparent border-b border-ink/30 focus:border-terracotta outline-none py-3 placeholder:text-clay/50"
      />
      <input
        type="password"
        required
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        placeholder="password"
        className="w-full bg-transparent border-b border-ink/30 focus:border-terracotta outline-none py-3 placeholder:text-clay/50"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-ink text-cream py-3 mono text-xs uppercase tracking-[0.2em] hover:bg-terracotta transition-colors disabled:opacity-50 mt-4"
      >
        {loading ? "..." : "sign in →"}
      </button>
      {err && <p className="text-terracotta text-sm pt-2">{err}</p>}
    </form>
  );
}
