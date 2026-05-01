"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function CompleteClient({
  initialBalance,
  isFounding,
  foundingPct,
  expectedCreditMad,
  tierLabel,
  wasFoundingPurchase,
  receiptId,
}: {
  initialBalance: number;
  isFounding: boolean;
  foundingPct: number;
  expectedCreditMad: number;
  tierLabel: string | null;
  wasFoundingPurchase: boolean;
  receiptId: string | null;
}) {
  const [balance, setBalance] = useState(initialBalance);
  const [foundingNow, setFoundingNow] = useState(isFounding);
  const [pctNow, setPctNow] = useState(foundingPct);
  const [credited, setCredited] = useState(false);

  // Poll for the webhook to credit the wallet. Webhooks usually land in
  // a few seconds; we poll for up to 30 seconds before giving up.
  useEffect(() => {
    if (expectedCreditMad <= 0) return;
    let cancelled = false;
    let tries = 0;
    const target = initialBalance + expectedCreditMad;

    async function poll() {
      tries++;
      try {
        const res = await fetch("/api/wallet/balance", { cache: "no-store" });
        const j = await res.json();
        if (!cancelled && j?.balance_mad != null) {
          setBalance(j.balance_mad);
          setFoundingNow(!!j.is_founding);
          setPctNow(j.founding_bonus_pct ?? 0);
          if (j.balance_mad + 0.001 >= target) {
            setCredited(true);
            return;
          }
        }
      } catch {}
      if (!cancelled && tries < 15) setTimeout(poll, 2000);
    }
    poll();
    return () => {
      cancelled = true;
    };
  }, [expectedCreditMad, initialBalance]);

  return (
    <>
      <p className="mono text-xs uppercase tracking-[0.25em] text-terracotta rise">
        ⌬ &nbsp; payment received
      </p>
      <h1 className="serif text-5xl md:text-7xl tracking-tightest leading-[0.95] mt-3 rise delay-1">
        Mar7ba <span className="italic text-terracotta">bik.</span>
      </h1>
      <p className="mt-4 text-clay rise delay-2">
        {tierLabel
          ? `${tierLabel} — your wallet is being credited now.`
          : "Your wallet is being credited now."}
      </p>

      <div className="mt-12 border border-sand p-8 rise delay-3">
        <p className="mono text-[10px] uppercase tracking-[0.2em] text-clay">new balance</p>
        <p className="serif text-7xl tracking-tightest mt-2">
          {balance.toFixed(2)}{" "}
          <span className="text-2xl text-clay">MAD</span>
        </p>
        {expectedCreditMad > 0 && !credited && (
          <p className="mono text-[11px] uppercase tracking-wider text-terracotta mt-3 animate-pulse">
            ↻ confirming credit...
          </p>
        )}
        {credited && (
          <p className="mono text-[11px] uppercase tracking-wider text-moss mt-3">
            ✓ credit applied — bonus included
          </p>
        )}

        {foundingNow && (
          <div className="mt-6 pt-6 border-t border-sand">
            <p className="mono text-[10px] uppercase tracking-[0.2em] text-terracotta">
              founding store status
            </p>
            <p className="serif text-2xl tracking-tightest mt-1">
              +{pctNow}% bonus on every top-up, forever.
            </p>
          </div>
        )}
        {wasFoundingPurchase && !foundingNow && (
          <p className="mono text-[11px] text-clay mt-3">
            (your founding-store status will appear in a few seconds)
          </p>
        )}
      </div>

      <div className="mt-8 flex gap-4 rise delay-4">
        <Link
          href="/dashboard"
          className="bg-ink text-cream px-6 py-3 mono text-xs uppercase tracking-[0.2em] hover:bg-terracotta transition-colors"
        >
          go to dashboard →
        </Link>
        <Link
          href="/checkout"
          className="border border-ink px-6 py-3 mono text-xs uppercase tracking-[0.2em] hover:bg-sand transition-colors"
        >
          top up again
        </Link>
      </div>

      {receiptId && (
        <p className="mono text-[10px] uppercase tracking-[0.18em] text-clay mt-6">
          receipt: {receiptId}
        </p>
      )}
    </>
  );
}
