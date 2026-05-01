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
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="eyebrow block mb-1.5">business</label>
          <input
            type="text"
            value={biz}
            onChange={(e) => setBiz(e.target.value)}
            placeholder="Your shop name"
            className="input"
            autoFocus
          />
        </div>
        <div>
          <label className="eyebrow block mb-1.5">whatsapp</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="06 / 07..."
            className="input"
          />
        </div>
      </div>
      <div>
        <label className="eyebrow block mb-1.5">email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className="input"
        />
      </div>
      <div>
        <label className="eyebrow block mb-1.5">password</label>
        <input
          type="password"
          required
          minLength={8}
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="At least 8 characters"
          className="input"
        />
      </div>
      <button type="submit" disabled={loading} className="btn btn-primary w-full mt-2">
        {loading ? "creating account..." : "Create account"}
        {!loading && <span aria-hidden>→</span>}
      </button>
      <p className="eyebrow text-center mt-2">25 mad free credit · 5 confirmations on us</p>
      {err && (
        <div className="rounded-md bg-[#FFE9E9] border border-[#F4C5C5] p-3">
          <p className="text-error text-sm">{err}</p>
        </div>
      )}
      {info && (
        <div className="rounded-md bg-success-soft border border-[#C5E8D5] p-3">
          <p className="text-success text-sm">{info}</p>
        </div>
      )}
    </form>
  );
}
