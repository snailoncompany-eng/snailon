"use client";

import { useState } from "react";

export default function TopupButton({
  mad,
  label,
  orders,
}: {
  mad: number;
  label: string;
  orders: number;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function go() {
    setLoading(true);
    setErr("");
    const res = await fetch("/api/topup/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mad }),
    });
    const j = await res.json();
    setLoading(false);
    if (res.ok && j.url) {
      window.location.href = j.url;
    } else {
      setErr(j.error ?? "Could not start checkout.");
    }
  }

  return (
    <div className="border border-sand p-4 hover:border-terracotta transition-colors">
      <p className="serif text-3xl tracking-tightest">{label}</p>
      <p className="mono text-[10px] uppercase tracking-wider text-clay mt-1">
        ≈ {orders} confirmations
      </p>
      <button
        onClick={go}
        disabled={loading}
        className="w-full mt-4 bg-ink text-cream py-2 mono text-[11px] uppercase tracking-[0.2em] hover:bg-terracotta transition-colors disabled:opacity-50"
      >
        {loading ? "..." : "top up →"}
      </button>
      {err && <p className="text-terracotta text-xs mt-2">{err}</p>}
    </div>
  );
}
