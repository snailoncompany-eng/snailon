"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Tier } from "@/lib/pricing";

// The embed pulls in the Whop iframe loader — load it on the client only,
// no SSR (avoids a useless server render of the iframe shell).
const WhopCheckoutEmbed = dynamic(
  () => import("@whop/checkout/react").then((m) => m.WhopCheckoutEmbed),
  { ssr: false, loading: () => <CheckoutSkeleton /> }
);

type PreparedTier = Tier & { planId: string | null; planError: string | null };

type Phase =
  | { kind: "picking" }
  | { kind: "paying"; tier: PreparedTier }
  | { kind: "success"; tier: PreparedTier; receiptId: string | null };

export default function CheckoutClient({
  tiers,
  merchantEmail,
  merchantBusinessName,
  initialBalance,
  isAlreadyFounding,
}: {
  tiers: PreparedTier[];
  merchantEmail: string;
  merchantBusinessName: string | null;
  initialBalance: number;
  isAlreadyFounding: boolean;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "picking" });
  const [balance, setBalance] = useState(initialBalance);
  const balanceRef = useRef(initialBalance);

  // Pre-select the first tier by default so the picker isn't visually empty.
  // The iframe doesn't render until they actually click "Pay".
  const [selectedId, setSelectedId] = useState<string>(
    tiers.find((t) => t.highlight)?.id ?? tiers[0]?.id
  );
  const selected = useMemo(() => tiers.find((t) => t.id === selectedId), [tiers, selectedId]);

  // When checkout completes, refresh balance from the server. The webhook
  // has fired — credit_wallet has run — we just pull the new value.
  async function refreshBalanceUntilCredited(targetMin: number) {
    for (let i = 0; i < 15; i++) {
      try {
        const r = await fetch("/api/wallet/balance", { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          if (typeof j.balance_mad === "number") {
            balanceRef.current = j.balance_mad;
            setBalance(j.balance_mad);
            if (j.balance_mad + 0.001 >= targetMin) return;
          }
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  // ---- Picker phase ----
  if (phase.kind === "picking" && selected) {
    return (
      <div className="mt-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tiers.map((tier) => (
            <TierCard
              key={tier.id}
              tier={tier}
              selected={selectedId === tier.id}
              onClick={() => setSelectedId(tier.id)}
            />
          ))}
        </div>

        {isAlreadyFounding && (
          <p className="mono text-xs uppercase tracking-[0.18em] text-clay mt-6">
            you're already a founding store — every top-up gets the +50% automatically.
          </p>
        )}

        <div className="mt-12 grid md:grid-cols-[1.1fr_2fr] gap-8 items-start">
          <SummaryCard
            tier={selected}
            email={merchantEmail}
            businessName={merchantBusinessName}
          />
          <div>
            <p className="mono text-[10px] uppercase tracking-[0.2em] text-clay mb-3">
              ⌬ ready to pay · powered by whop
            </p>
            <button
              onClick={() => selected.planId && setPhase({ kind: "paying", tier: selected })}
              disabled={!selected.planId}
              className="w-full bg-ink text-cream py-5 mono text-sm uppercase tracking-[0.2em] hover:bg-terracotta transition-colors disabled:opacity-40"
            >
              {selected.planError
                ? "couldn't prepare checkout — refresh"
                : `pay ${selected.amountMad} MAD →`}
            </button>
            {selected.planError && (
              <p className="text-terracotta text-xs mt-2 mono">{selected.planError}</p>
            )}
            <p className="mono text-[10px] uppercase tracking-[0.18em] text-clay mt-6 leading-relaxed">
              your card is processed by whop. snailon never sees card details.
              all communications happen on snailon.com.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ---- Paying phase: iframe is mounted with prefilled email ----
  if (phase.kind === "paying") {
    const tier = phase.tier;
    return (
      <div className="mt-12 grid md:grid-cols-[1.1fr_2fr] gap-8 items-start">
        <SummaryCard
          tier={tier}
          email={merchantEmail}
          businessName={merchantBusinessName}
          editable={false}
        />
        <div>
          <div className="flex items-baseline justify-between mb-3">
            <p className="mono text-[10px] uppercase tracking-[0.2em] text-clay">
              ⌬ secure payment
            </p>
            <button
              onClick={() => setPhase({ kind: "picking" })}
              className="mono text-[10px] uppercase tracking-[0.18em] text-clay hover:text-terracotta"
            >
              ← change amount
            </button>
          </div>

          <div className="border border-sand bg-cream">
            {tier.planId ? (
              <WhopCheckoutEmbed
                key={tier.planId}
                planId={tier.planId}
                theme="light"
                hideEmail
                disableEmail
                prefill={{ email: merchantEmail }}
                hidePrice
                hideTermsAndConditions
                skipRedirect
                onComplete={async (_planId, receiptId) => {
                  // Optimistic balance bump — the webhook will reconcile.
                  const optimistic = balanceRef.current + tier.totalCreditMad;
                  balanceRef.current = optimistic;
                  setBalance(optimistic);
                  setPhase({ kind: "success", tier, receiptId: receiptId ?? null });
                  // Pull the real value as soon as the webhook lands.
                  refreshBalanceUntilCredited(optimistic - 0.5);
                }}
              />
            ) : (
              <CheckoutSkeleton />
            )}
          </div>

          <p className="mono text-[10px] uppercase tracking-[0.18em] text-clay mt-4">
            paying as <b className="text-ink">{merchantEmail}</b>
          </p>
        </div>
      </div>
    );
  }

  // ---- Success phase ----
  if (phase.kind === "success") {
    const tier = phase.tier;
    return (
      <div className="mt-16 max-w-xl mx-auto text-center">
        <div className="serif text-7xl tracking-tightest text-terracotta">✓</div>
        <p className="mono text-[10px] uppercase tracking-[0.25em] text-terracotta mt-4">
          payment received
        </p>
        <h2 className="serif text-5xl tracking-tightest mt-2">
          Mar7ba <span className="italic">bik.</span>
        </h2>
        <p className="text-clay mt-3">
          Your wallet now holds{" "}
          <b className="text-ink">{balance.toFixed(2)} MAD</b>
          {" "}— enough for{" "}
          <b className="text-ink">{Math.floor(balance / 5)}</b> confirmations.
        </p>
        {tier.bonusMad > 0 && (
          <p className="mono text-[11px] uppercase tracking-[0.18em] text-terracotta mt-3">
            +{tier.bonusMad} MAD bonus applied
          </p>
        )}

        <div className="mt-10 flex gap-3 justify-center">
          <a
            href="/dashboard"
            className="bg-ink text-cream px-6 py-3 mono text-xs uppercase tracking-[0.2em] hover:bg-terracotta transition-colors"
          >
            go to dashboard →
          </a>
          <button
            onClick={() => window.location.reload()}
            className="border border-ink px-6 py-3 mono text-xs uppercase tracking-[0.2em] hover:bg-sand transition-colors"
          >
            top up again
          </button>
        </div>

        {phase.receiptId && (
          <p className="mono text-[9px] uppercase tracking-[0.18em] text-clay/70 mt-8">
            receipt · {phase.receiptId}
          </p>
        )}
      </div>
    );
  }

  return null;
}

// ---------- Building blocks ----------

function TierCard({
  tier,
  selected,
  onClick,
}: {
  tier: PreparedTier;
  selected: boolean;
  onClick: () => void;
}) {
  const orders = Math.floor(tier.totalCreditMad / 5);
  const ready = !!tier.planId;
  const baseClasses = "relative text-left p-5 border transition-all duration-150";
  const stateClasses = selected
    ? "border-ink bg-ink text-cream shadow-[4px_4px_0_0_rgba(184,68,46,1)]"
    : tier.highlight
    ? "border-terracotta hover:bg-sand"
    : "border-sand hover:border-ink";
  return (
    <button onClick={onClick} disabled={!ready} className={`${baseClasses} ${stateClasses} ${!ready ? "opacity-50" : ""}`}>
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
        <p className={`mono text-[11px] mt-2 ${selected ? "text-cream" : "text-terracotta"}`}>
          +{tier.bonusMad} MAD bonus → {tier.totalCreditMad} MAD credit
        </p>
      ) : (
        <p className={`mono text-[11px] mt-2 ${selected ? "text-cream/70" : "text-clay"}`}>
          ≈ {orders} confirmations
        </p>
      )}
      {tier.tagline && (
        <p className={`text-[12px] mt-3 leading-snug ${selected ? "text-cream/80" : "text-ink"}`}>
          {tier.tagline}
        </p>
      )}
    </button>
  );
}

function SummaryCard({
  tier,
  email,
  businessName,
  editable = true,
}: {
  tier: PreparedTier;
  email: string;
  businessName: string | null;
  editable?: boolean;
}) {
  return (
    <aside className="border border-sand p-6 h-fit">
      <p className="mono text-[10px] uppercase tracking-[0.2em] text-clay">order summary</p>
      <p className="serif text-3xl tracking-tightest mt-2">{tier.label}</p>
      <hr className="border-sand my-4" />
      <div className="flex justify-between text-sm">
        <span>You pay</span>
        <span className="mono">{tier.amountMad.toFixed(2)} MAD</span>
      </div>
      {tier.bonusMad > 0 && (
        <div className="flex justify-between text-sm text-terracotta mt-1">
          <span>+{tier.bonusPct}% bonus</span>
          <span className="mono">+{tier.bonusMad.toFixed(2)} MAD</span>
        </div>
      )}
      <hr className="border-sand my-4" />
      <div className="flex justify-between items-baseline">
        <span className="mono text-[10px] uppercase tracking-wider text-clay">credit added</span>
        <span className="serif text-2xl tracking-tightest">
          {tier.totalCreditMad.toFixed(2)} MAD
        </span>
      </div>
      {tier.isFounding && (
        <p className="mono text-[10px] uppercase tracking-[0.18em] text-terracotta mt-4 leading-relaxed">
          + lifetime +{tier.bonusPct}% bonus on every future top-up. one-time, pre-launch only.
        </p>
      )}
      <hr className="border-sand my-4" />
      <div>
        <p className="mono text-[10px] uppercase tracking-wider text-clay">paying as</p>
        <p className="text-sm mt-1 break-all">{email}</p>
        {businessName && <p className="text-[12px] text-clay mt-0.5">{businessName}</p>}
      </div>
    </aside>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="min-h-[520px] p-6 space-y-4 animate-pulse">
      <div className="h-3 bg-sand w-1/4" />
      <div className="h-12 bg-sand" />
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="h-12 bg-sand" />
        <div className="h-12 bg-sand" />
      </div>
      <div className="h-3 bg-sand w-1/3 mt-6" />
      <div className="h-12 bg-sand" />
      <div className="h-14 bg-ink/20 mt-8" />
    </div>
  );
}
