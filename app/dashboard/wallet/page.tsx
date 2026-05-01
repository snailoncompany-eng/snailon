import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRICING } from "@/lib/pricing";
import TopupButton from "@/components/topup-button";

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

      <h2 className="serif text-2xl tracking-tightest mt-12">Top up.</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        {PRICING.topupTiers.map((t) => (
          <TopupButton key={t.mad} mad={t.mad} label={t.label} orders={t.orders} />
        ))}
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
