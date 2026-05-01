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

  return (
    <div>
      <p className="mono text-[10px] uppercase tracking-[0.25em] text-terracotta">wallet</p>
      <h1 className="serif text-5xl tracking-tightest mt-2">
        {(merchant?.balance_mad ?? 0).toFixed(2)}{" "}
        <span className="text-clay text-2xl">MAD</span>
      </h1>
      <p className="text-clay mt-2">
        Each confirmed order costs <b>{PRICING.pricePerConfirmedOrderMad} MAD</b>.
      </p>
      {merchant?.is_founding && (
        <p className="mono text-xs uppercase tracking-[0.18em] text-terracotta mt-2">
          ⌬ founding store · +{merchant.founding_bonus_pct}% on every top-up, forever
        </p>
      )}

      <div className="mt-8 flex gap-3">
        <Link
          href="/checkout"
          className="inline-block bg-ink text-cream px-6 py-3 mono text-xs uppercase tracking-[0.2em] hover:bg-terracotta transition-colors"
        >
          + top up wallet →
        </Link>
        {!merchant?.is_founding && (
          <Link
            href="/checkout"
            className="inline-block border border-terracotta text-terracotta px-6 py-3 mono text-xs uppercase tracking-[0.2em] hover:bg-terracotta hover:text-cream transition-colors"
          >
            ⌬ claim founding offer
          </Link>
        )}
      </div>

      <h2 className="serif text-2xl tracking-tightest mt-16">Transactions.</h2>
      <div className="mt-4 border border-sand">
        <table className="w-full text-sm">
          <thead className="bg-sand mono text-[10px] uppercase tracking-wider text-clay">
            <tr>
              <th className="text-left p-3">when</th>
              <th className="text-left p-3">type</th>
              <th className="text-left p-3">reference</th>
              <th className="text-right p-3">amount</th>
              <th className="text-right p-3">balance</th>
            </tr>
          </thead>
          <tbody>
            {(txs ?? []).map((t: any) => (
              <tr key={t.id} className="border-t border-sand">
                <td className="p-3 mono text-[11px] text-clay">
                  {new Date(t.created_at).toLocaleString()}
                </td>
                <td className="p-3 mono text-[11px]">{t.type}</td>
                <td className="p-3 mono text-[11px] text-clay max-w-[180px] truncate">
                  {t.reference ?? "—"}
                </td>
                <td
                  className={`p-3 text-right mono ${
                    t.amount_mad >= 0 ? "text-moss" : "text-terracotta"
                  }`}
                >
                  {t.amount_mad >= 0 ? "+" : ""}
                  {Number(t.amount_mad).toFixed(2)}
                </td>
                <td className="p-3 text-right mono">{Number(t.balance_after_mad).toFixed(2)}</td>
              </tr>
            ))}
            {(!txs || txs.length === 0) && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-clay">
                  No transactions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
