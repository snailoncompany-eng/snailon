"use client";

import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Tier } from "@/lib/pricing";

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

  const [selectedId, setSelectedId] = useState<string>(
    tiers.find((t) => t.highlight)?.id ?? tiers[0]?.id
  );
  const selected = useMemo(() => tiers.find((t) => t.id === selectedId), [tiers, selectedId]);

  async function refreshBalance(targetMin: number) {
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

  // ---- Picker ----
  if (phase.kind === "picking" && selected) {
    return (
      <div className="mt-10 sm:mt-12 space-y-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
          <p className="eyebrow text-muted">
            you're already a founding store — every top-up gets +50% automatically.
          </p>
        )}

        <div className="grid lg:grid-cols-[1.1fr_2fr] gap-6 lg:gap-8 items-start">
          <SummaryCard tier={selected} email={merchantEmail} businessName={merchantBusinessName} />
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="dot bg-success" />
              <p className="eyebrow">secure payment · powered by whop</p>
            </div>
            <button
              onClick={() => selected.planId && setPhase({ kind: "paying", tier: selected })}
              disabled={!selected.planId}
              className="btn btn-primary w-full text-base py-4"
            >
              {selected.planError ? "Couldn't prepare checkout — refresh" : `Pay ${selected.amountMad} MAD`}
              {!selected.planError && <span aria-hidden>→</span>}
            </button>
            {selected.planError && <p className="text-error text-xs mt-2 font-mono">{selected.planError}</p>}
            <div className="mt-6 space-y-2 text-xs text-muted">
              <TrustLine>Your card is processed by Whop. Snailon never sees card details.</TrustLine>
              <TrustLine>All communication happens on snailon.com.</TrustLine>
              <TrustLine>Wallet credit is non-refundable but never expires.</TrustLine>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Paying ----
  if (phase.kind === "paying") {
    const tier = phase.tier;
    return (
      <div className="mt-10 sm:mt-12 grid lg:grid-cols-[1.1fr_2fr] gap-6 lg:gap-8 items-start">
        <SummaryCard tier={tier} email={merchantEmail} businessName={merchantBusinessName} />
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="dot bg-success" />
              <p className="eyebrow">secure payment</p>
            </div>
            <button
              onClick={() => setPhase({ kind: "picking" })}
              className="btn-link text-xs text-muted hover:text-ink"
            >
              ← change amount
            </button>
          </div>
          <div className="card p-0 overflow-hidden">
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
                  const optimistic = balanceRef.current + tier.totalCreditMad;
                  balanceRef.current = optimistic;
                  setBalance(optimistic);
                  setPhase({ kind: "success", tier, receiptId: receiptId ?? null });
                  refreshBalance(optimistic - 0.5);
                }}
              />
            ) : (
              <CheckoutSkeleton />
            )}
          </div>
          <p className="eyebrow mt-4">
            paying as <span className="text-ink">{merchantEmail}</span>
          </p>
        </div>
      </div>
    );
  }

  // ---- Success ----
  if (phase.kind === "success") {
    const tier = phase.tier;
    return (
      <div className="mt-12 max-w-xl mx-auto text-center animate-rise">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success-soft mb-6">
          <span className="text-success text-3xl leading-none">✓</span>
        </div>
        <p className="eyebrow eyebrow-accent">payment received</p>
        <h2 className="headline text-4xl sm:text-5xl mt-2">
          Mar7ba <span className="italic">bik.</span>
        </h2>
        <p className="text-muted mt-3">
          Your wallet now holds <span className="text-ink font-medium">{balance.toFixed(2)} MAD</span> — enough for{" "}
          <span className="text-ink font-medium">{Math.floor(balance / 5)}</span> confirmations.
        </p>
        {tier.bonusMad > 0 && (
          <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-accent-soft">
            <span className="dot bg-accent" />
            <span className="eyebrow eyebrow-accent">+{tier.bonusMad} MAD bonus applied</span>
          </div>
        )}

        <div className="mt-8 flex gap-3 justify-center flex-wrap">
          <a href="/dashboard" className="btn btn-primary">
            Go to dashboard <span aria-hidden>→</span>
          </a>
          <button onClick={() => window.location.reload()} className="btn btn-secondary">
            Top up again
          </button>
        </div>

        {phase.receiptId && (
          <p className="font-mono text-[11px] text-subtle mt-8 break-all">receipt · {phase.receiptId}</p>
        )}
      </div>
    );
  }

  return null;
}

function TrustLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-success shrink-0 mt-0.5"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span>{children}</span>
    </div>
  );
}

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
  return (
    <button
      onClick={onClick}
      disabled={!ready}
      className={`card text-left p-4 sm:p-5 relative transition-all duration-150 ${
        selected ? "card-selected" : "card-interactive"
      } ${tier.highlight && !selected ? "border-accent" : ""} ${!ready ? "opacity-50 pointer-events-none" : ""}`}
    >
      {tier.highlight && (
        <span className="absolute -top-2.5 left-4 pill pill-accent">pre-launch</span>
      )}
      <p className="eyebrow">{tier.isFounding ? "founding store" : "standard"}</p>
      <p className="font-display text-3xl sm:text-4xl tracking-tight mt-2">
        {tier.amountMad}
        <span className="text-base text-muted ml-1">MAD</span>
      </p>
      {tier.bonusMad > 0 ? (
        <p className="text-sm text-accent mt-2 font-medium">
          +{tier.bonusMad} MAD bonus
        </p>
      ) : (
        <p className="text-xs text-muted mt-2">≈ {orders} confirmations</p>
      )}
      {tier.tagline && <p className="text-xs text-muted mt-3 leading-snug">{tier.tagline}</p>}
    </button>
  );
}

function SummaryCard({
  tier,
  email,
  businessName,
}: {
  tier: PreparedTier;
  email: string;
  businessName: string | null;
}) {
  return (
    <aside className="card p-5 sm:p-6 h-fit">
      <p className="eyebrow">order summary</p>
      <p className="font-display text-3xl tracking-tight mt-2">{tier.label}</p>
      <hr className="border-line my-4" />
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">You pay</span>
          <span className="font-mono">{tier.amountMad.toFixed(2)} MAD</span>
        </div>
        {tier.bonusMad > 0 && (
          <div className="flex justify-between text-accent">
            <span>+{tier.bonusPct}% bonus</span>
            <span className="font-mono">+{tier.bonusMad.toFixed(2)} MAD</span>
          </div>
        )}
      </div>
      <hr className="border-line my-4" />
      <div className="flex justify-between items-baseline">
        <span className="eyebrow">credit added</span>
        <span className="font-display text-2xl tracking-tight">{tier.totalCreditMad.toFixed(2)} MAD</span>
      </div>
      {tier.isFounding && (
        <p className="eyebrow eyebrow-accent mt-4 leading-relaxed normal-case tracking-normal text-[12px]">
          + lifetime +{tier.bonusPct}% bonus on every future top-up. One-time, pre-launch only.
        </p>
      )}
      <hr className="border-line my-4" />
      <div>
        <p className="eyebrow mb-1">paying as</p>
        <p className="text-sm break-all">{email}</p>
        {businessName && <p className="text-xs text-muted mt-0.5">{businessName}</p>}
      </div>
    </aside>
  );
}

function CheckoutSkeleton() {
  return (
    <div className="min-h-[520px] p-6 space-y-4">
      <div className="skeleton h-3 w-1/4" />
      <div className="skeleton h-12 w-full" />
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="skeleton h-12" />
        <div className="skeleton h-12" />
      </div>
      <div className="skeleton h-3 w-1/3 mt-6" />
      <div className="skeleton h-12 w-full" />
      <div className="skeleton h-14 w-full mt-8" />
    </div>
  );
}
