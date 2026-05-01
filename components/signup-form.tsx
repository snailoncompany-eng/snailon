"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupForm() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [biz, setBiz] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setInfo("");
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password: pw,
      options: {
        data: { business_name: biz, phone },
        emailRedirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard`,
      },
    });
    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }

    // Create the merchant row server-side (uses service role to bypass RLS until session is set).
    if (data.user) {
      await fetch("/api/auth/post-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: data.user.id,
          email,
          business_name: biz,
          phone,
        }),
      });
    }

    if (data.session) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setInfo("Check your email to confirm. Then sign in.");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        type="text"
        value={biz}
        onChange={(e) => setBiz(e.target.value)}
        placeholder="business name"
        className="w-full bg-transparent border-b border-ink/30 focus:border-terracotta outline-none py-3 placeholder:text-clay/50"
      />
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="WhatsApp number"
        className="w-full bg-transparent border-b border-ink/30 focus:border-terracotta outline-none py-3 placeholder:text-clay/50"
      />
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
        minLength={8}
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        placeholder="password (8+ chars)"
        className="w-full bg-transparent border-b border-ink/30 focus:border-terracotta outline-none py-3 placeholder:text-clay/50"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-ink text-cream py-3 mono text-xs uppercase tracking-[0.2em] hover:bg-terracotta transition-colors disabled:opacity-50 mt-4"
      >
        {loading ? "..." : "create account →"}
      </button>
      {err && <p className="text-terracotta text-sm pt-2">{err}</p>}
      {info && <p className="text-moss text-sm pt-2">{info}</p>}
    </form>
  );
}
