"use client";

import { useEffect, useState } from "react";
import type { Tier } from "@/lib/pricing";

const WHOP_LOADER = "https://js.whop.com/static/checkout/loader.js";

declare global {
  interface Window {
    wpc?: any;
  }
}

type SessionState =
  | { status: "loading" }
  | { status: "ready"; planId: string }
  | { status: "error"; message: string };

export default function CheckoutClient({
  tiers,
  isAlreadyFounding,
}: {
  tiers: Tier[];
  isAlreadyFounding: boolean;
}) {
  const [selected, setSelected] = useState<Tier | null>(null);
  // Plan IDs are pre-created in parallel on mount and cached here.
  const [sessions, setSessions] = useState<Record<string, SessionState>>({});

  // Pre-warm Whop's loader script as early as possible.
  useEffect(() => {
    if (document.querySelector(`script[src="${WHOP_LOADER}"]`)) return;
    const s = document.createElement("script");
    s.src = WHOP_LOADER;
    s.async = true;
    document.head.appendChild(s);
  }, []);

  // On mount, kick off plan creation for every visible tier in parallel.
  // By the time the user clicks one, the plan_id is already in memory.
  useEffect(() => {
    const visibleTiers = tiers.filter((t) => !(t.isFounding && isAlreadyFounding));
    setSessions(
      Object.fromEntries(visibleTiers.map((t) => [t.id, { status: "loading" } as SessionState]))
    );

    visibleTiers.forEach(async (tier) => {
      try {
        const res = await fetch("/api/checkout/create-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier_id: tier.id }),
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error ?? "could not create session");
        setSessions((prev) => ({
          ...prev,
          [tier.id]: { status: "ready", planId: j.plan_id },
        }));
      } catch (e: any) {
        setSessions((prev) => ({
          ...prev,
          [tier.id]: { status: "error", message: e.message ?? "checkout error" },
        }));
      }
    });
  }, [tiers, isAlreadyFounding]);

  function pickTier(tier: Tier) {
    if (selected?.id === tier.id) return;
    setSelected(tier);
    // Smooth scroll to the iframe area on mobile
    requestAnimationFrame(() => {
      document.getElementById("checkout-mount")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  const sel = selected ? sessions[selected.id] : null;
  const returnUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/checkout/complete?tier=${selected?.id ?? ""}`
      : "";

  return (
    <div className="mt-12">
      {/* Tier grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiers.map((tier) => {
          const session = sessions[tier.id];
          return (
            <TierCard
              key={tier.id}
              tier={tier}
              selected={selected?.id === tier.id}
              onSelect={() => pickTier(tier)}
              disabled={tier.isFounding && isAlreadyFounding}
              loading={!session || session.status === "loading"}
            />
          );
        })}
      </div>

      {isAlreadyFounding && (
        <p className="mono text-xs uppercase tracking-[0.18em] text-clay mt-6">
          you're already a founding store — every top-up gets the bonus automatically.
        </p>
      )}

      {/* Selected tier summary + iframe */}
      {selected && (
        <div id="checkout-mount" className="mt-12 grid md:grid-cols-[1fr_2fr] gap-8 scroll-mt-8">
          <aside className="border border-sand p-6 h-fit">
            <p className="mono text-[10px] uppercase tracking-[0.2em] text-clay">order summary</p>
            <p className="serif text-3xl tracking-tightest mt-2">{selected.label}</p>
            <hr className="border-sand my-4" />
            <div className="flex justify-between text-sm">
              <span>You pay</span>
              <span className="mono">{selected.amountMad.toFixed(2)} MAD</span>
            </div>
            {selected.bonusMad > 0 && (
              <div className="flex justify-between text-sm text-terracotta mt-1">
                <span>+{selected.bonusPct}% bonus</span>
                <span className="mono">+{selected.bonusMad.toFixed(2)} MAD</span>
              </div>
            )}
            <hr className="border-sand my-4" />
            <div className="flex justify-between items-baseline">
              <span className="mono text-[10px] uppercase tracking-wider text-clay">credit added</span>
              <span className="serif text-2xl tracking-tightest">
                {selected.totalCreditMad.toFixed(2)} MAD
              </span>
            </div>
            {selected.isFounding && (
              <p className="mono text-[10px] uppercase tracking-[0.18em] text-terracotta mt-4 leading-relaxed">
                + lifetime +{selected.bonusPct}% bonus on every future top-up. one-time offer, pre-launch only.
              </p>
            )}
          </aside>

          <div>
            <p className="mono text-[10px] uppercase tracking-[0.2em] text-clay mb-3">
              secure payment · powered by whop
            </p>
            {(!sel || sel.status === "loading") && <CheckoutSkeleton />}
            {sel?.status === "error" && (
              <div className="border border-terracotta p-4 text-terracotta text-sm">
                {sel.message}
              </div>
            )}
            {sel?.status === "ready" && (
              // The `key` forces React to remount when planId changes (tier swap)
              <div
                key={sel.planId}
                data-whop-checkout-plan-id={sel.planId}
                data-whop-checkout-theme="light"
                data-whop-checkout-return-url={returnUrl}
                className="min-h-[600px]"
              />
            )}
          </div>
        </div>
      )}

      {!selected && (
        <p className="mono text-xs uppercase tracking-[0.18em] text-clay mt-8">
          ↑ pick a tier to continue. checkout opens here, on snailon.com.
        </p>
      )}
    </div>
  );
}

function TierCard({
  tier,
  selected,
  onSelect,
  disabled,
  loading,
}: {
  tier: Tier;
  selected: boolean;
  onSelect: () => void;
  disabled: boolean;
  loading: boolean;
}) {
  const orders = Math.floor(tier.totalCreditMad / 5);
  const baseClasses = "relative text-left p-5 border transition-colors";
  const stateClasses = selected
    ? "border-ink bg-ink text-cream"
    : tier.highlight
    ? "border-terracotta hover:bg-sand"
    : "border-sand hover:border-ink";
  const disabledClasses = disabled ? "opacity-40 pointer-events-none" : "cursor-pointer";

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`${baseClasses} ${stateClasses} ${disabledClasses}`}
    >
      {tier.highlight && !selected && (
        <span className="absolute -top-2 left-5 mono text-[9px] uppercase tracking-[0.2em] bg-terracotta text-cream px-2 py-0.5">
          pre-launch
        </span>
      )}
      <p
        className={`mono text-[10px] uppercase tracking-[0.2em] ${
          selected ? "text-cream/70" : tier.highlight ? "text-terracotta" : "text-clay"
        }`}
      >
        {tier.isFounding ? "founding store" : "standard"}
      </p>
      <p className="serif text-4xl tracking-tightest mt-2">
        {tier.amountMad}
        <span className={`text-base ml-1 ${selected ? "text-cream/70" : "text-clay"}`}>MAD</span>
      </p>
      {tier.bonusMad > 0 ? (
        <p
          className={`mono text-[11px] mt-2 ${
            selected ? "text-cream" : "text-terracotta"
          }`}
        >
          +{tier.bonusMad} MAD bonus → {tier.totalCreditMad} MAD credit
        </p>
      ) : (
        <p
          className={`mono text-[11px] mt-2 ${
            selected ? "text-cream/70" : "text-clay"
          }`}
        >
          ≈ {orders} confirmations
        </p>
      )}
      {tier.tagline && (
        <p
          className={`text-[12px] mt-3 leading-snug ${
            selected ? "text-cream/80" : "text-ink"
          }`}
        >
          {tier.tagline}
        </p>
      )}
      {loading && !disabled && (
        <span
          className={`absolute top-3 right-3 mono text-[9px] uppercase tracking-wider ${
            selected ? "text-cream/60" : "text-clay/60"
          }`}
        >
          ↻
        </span>
      )}
    </button>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="border border-sand min-h-[600px] p-6 space-y-4 animate-pulse">
      <div className="h-3 bg-sand w-1/4" />
      <div className="h-10 bg-sand w-full" />
      <div className="h-3 bg-sand w-1/3 mt-6" />
      <div className="h-10 bg-sand w-full" />
      <div className="grid grid-cols-2 gap-3 mt-2">
        <div className="h-10 bg-sand" />
        <div className="h-10 bg-sand" />
      </div>
      <div className="h-3 bg-sand w-1/4 mt-6" />
      <div className="h-10 bg-sand w-full" />
      <div className="h-12 bg-ink/20 w-full mt-6" />
    </div>
  );
}
