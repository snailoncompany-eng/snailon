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
      <div className="card p-6 animate-rise">
        <div className="flex items-center gap-2 mb-2">
          <span className="dot bg-success" />
          <span className="eyebrow text-success">on the list</span>
        </div>
        <p className="font-display text-2xl tracking-tight">You're in.</p>
        <p className="text-muted mt-1">Check your inbox — we'll write the day before launch.</p>
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
        placeholder="your@email.com"
        className="input input-lg"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="WhatsApp number"
          className="input"
        />
        <input
          type="text"
          value={biz}
          onChange={(e) => setBiz(e.target.value)}
          placeholder="Business (optional)"
          className="input"
        />
      </div>
      <button
        type="submit"
        disabled={state === "loading"}
        className="btn btn-primary w-full"
      >
        {state === "loading" ? "joining..." : "Join the waitlist"}
        <span aria-hidden>→</span>
      </button>
      {err && <p className="text-error text-sm">{err}</p>}
    </form>
  );
}
