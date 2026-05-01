import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRICING } from "@/lib/pricing";

export default async function WalletPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const { data: merchant } = await admin
    .from("merchants")
    .select("*")
    .eq("user_id", user!.id)
    .maybeSingle();

  const { data: txs } = await admin
    .from("wallet_transactions")
    .select("*")
    .eq("merchant_id", merchant?.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const balance = Number(merchant?.balance_mad ?? 0);
  const runway = Math.floor(balance / PRICING.pricePerConfirmedOrderMad);

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow eyebrow-accent">wallet</p>
        <h1 className="headline text-4xl mt-2">Your wallet</h1>
      </header>

      {/* Balance hero */}
      <div className="card p-6 sm:p-8">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <p className="eyebrow">current balance</p>
            <p className="font-display text-5xl sm:text-7xl tracking-tight mt-2">
              {balance.toFixed(2)} <span className="text-2xl text-muted">MAD</span>
            </p>
            <p className="text-muted text-sm mt-2">
              ≈ <span className="text-ink font-medium">{runway}</span> confirmations remaining
              {" · "}
              <span className="text-muted">
                {PRICING.pricePerConfirmedOrderMad} MAD per confirmed order
              </span>
            </p>
            {merchant?.is_founding && (
              <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-accent-soft">
                <span className="dot bg-accent" />
                <span className="eyebrow eyebrow-accent">founding · +{merchant.founding_bonus_pct}% on every top-up</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <Link href="/checkout" className="btn btn-primary w-full sm:w-auto">
              + Top up wallet
            </Link>
            {!merchant?.is_founding && (
              <Link href="/checkout" className="btn btn-ghost text-accent w-full sm:w-auto">
                ⌬ Claim founding offer
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Transactions */}
      <section>
        <h2 className="font-display text-2xl tracking-tight mb-4">Transactions</h2>
        {(!txs || txs.length === 0) ? (
          <div className="card p-10 text-center text-muted">No transactions yet.</div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-clean">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Type</th>
                    <th className="hidden sm:table-cell">Reference</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.map((t: any) => {
                    const positive = Number(t.amount_mad) >= 0;
                    return (
                      <tr key={t.id} className="hover:bg-[rgba(10,10,10,0.015)] transition-colors">
                        <td>
                          <div className="text-sm">{formatDate(t.created_at)}</div>
                          <div className="font-mono text-xs text-subtle">{formatTime(t.created_at)}</div>
                        </td>
                        <td>
                          <TypePill type={t.type} kind={t.metadata?.kind} />
                        </td>
                        <td className="hidden sm:table-cell font-mono text-xs text-muted max-w-[180px] truncate">
                          {t.reference ?? "—"}
                        </td>
                        <td className={`text-right font-mono font-medium ${positive ? "text-success" : "text-error"}`}>
                          {positive ? "+" : ""}
                          {Number(t.amount_mad).toFixed(2)}
                        </td>
                        <td className="text-right font-mono">{Number(t.balance_after_mad).toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function TypePill({ type, kind }: { type: string; kind?: string }) {
  const labels: Record<string, { label: string; cls: string }> = {
    topup: { label: "Top-up", cls: "pill-success" },
    signup_bonus: { label: "Welcome bonus", cls: "pill-accent" },
    confirmation_charge: { label: "Confirmation", cls: "pill-muted" },
    refund: { label: "Refund", cls: "pill-success" },
    adjustment:
      kind === "topup_bonus"
        ? { label: "Top-up bonus", cls: "pill-accent" }
        : { label: "Adjustment", cls: "pill-muted" },
  };
  const meta = labels[type] ?? { label: type, cls: "pill-muted" };
  return <span className={`pill ${meta.cls}`}>{meta.label}</span>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
