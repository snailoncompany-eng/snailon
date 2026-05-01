"use client";

import { useState } from "react";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [biz, setBiz] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setErr("");
    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, phone, business_name: biz }),
    });
    if (res.ok) {
      setState("ok");
      setEmail("");
      setPhone("");
      setBiz("");
    } else {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? "Couldn't sign you up. Try again.");
      setState("err");
    }
  }

  if (state === "ok") {
    return (
      <div className="border border-ink bg-ink text-cream p-6">
        <p className="serif text-2xl">You're on the list.</p>
        <p className="mt-2 text-sm">Check your inbox. We'll write the day before launch.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email"
        className="w-full bg-transparent border-b border-ink/30 focus:border-terracotta outline-none py-3 text-base placeholder:text-clay/50"
      />
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="WhatsApp number (06... / 07...)"
        className="w-full bg-transparent border-b border-ink/30 focus:border-terracotta outline-none py-3 text-base placeholder:text-clay/50"
      />
      <input
        type="text"
        value={biz}
        onChange={(e) => setBiz(e.target.value)}
        placeholder="business name (optional)"
        className="w-full bg-transparent border-b border-ink/30 focus:border-terracotta outline-none py-3 text-base placeholder:text-clay/50"
      />
      <button
        type="submit"
        disabled={state === "loading"}
        className="w-full bg-ink text-cream py-3 mono text-xs uppercase tracking-[0.2em] hover:bg-terracotta transition-colors disabled:opacity-50"
      >
        {state === "loading" ? "..." : "join waitlist →"}
      </button>
      {err && <p className="text-terracotta text-sm">{err}</p>}
    </form>
  );
}
