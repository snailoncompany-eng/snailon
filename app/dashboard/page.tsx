import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

export default async function DashboardOverview() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();

  const { data: merchant } = await admin
    .from("merchants")
    .select("*")
    .eq("user_id", user!.id)
    .maybeSingle();

  if (!merchant) {
    return (
      <div className="max-w-xl">
        <h1 className="serif text-5xl tracking-tightest">Almost there.</h1>
        <p className="mt-3 text-clay">Finishing your account setup. Refresh in a moment.</p>
      </div>
    );
  }

  // Pull aggregates
  const { data: orderStats } = await admin
    .from("orders")
    .select("status")
    .eq("merchant_id", merchant.id);

  const counts = (orderStats ?? []).reduce(
    (acc: Record<string, number>, r) => ((acc[r.status] = (acc[r.status] || 0) + 1), acc),
    {}
  );

  const { data: recent } = await admin
    .from("orders")
    .select("id, customer_name, customer_phone, product_name, product_price_mad, status, created_at")
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false })
    .limit(8);

  return (
    <div>
      <p className="mono text-[10px] uppercase tracking-[0.25em] text-terracotta">overview</p>
      <h1 className="serif text-5xl md:text-6xl tracking-tightest mt-2">
        Hi, <span className="italic">{merchant.business_name ?? merchant.email}</span>.
      </h1>
      <p className="mt-3 text-clay">
        You have <b>{(merchant.balance_mad ?? 0).toFixed(2)} MAD</b> in your wallet — enough for{" "}
        <b>{Math.floor((merchant.balance_mad ?? 0) / 5)}</b> confirmations.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
        <Stat label="confirmed" value={counts.confirmed ?? 0} />
        <Stat label="pending" value={counts.pending ?? 0} />
        <Stat label="unconfirmed" value={counts.unconfirmed ?? 0} />
        <Stat label="total" value={(orderStats ?? []).length} />
      </div>

      <div className="mt-16">
        <div className="flex items-baseline justify-between">
          <h2 className="serif text-3xl tracking-tightest">Recent orders.</h2>
          <Link href="/dashboard/orders" className="mono text-xs uppercase tracking-wider text-terracotta">
            see all →
          </Link>
        </div>
        <div className="mt-6 border border-sand">
          {(recent ?? []).length === 0 ? (
            <div className="p-8 text-center text-clay">
              No orders yet. POST to <code className="mono text-xs bg-sand px-1">/api/orders/create</code> to ingest one.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-sand mono text-[10px] uppercase tracking-wider text-clay">
                <tr>
                  <th className="text-left p-3">customer</th>
                  <th className="text-left p-3">product</th>
                  <th className="text-right p-3">total</th>
                  <th className="text-right p-3">status</th>
                </tr>
              </thead>
              <tbody>
                {(recent ?? []).map((o: any) => (
                  <tr key={o.id} className="border-t border-sand">
                    <td className="p-3">
                      {o.customer_name ?? "—"}
                      <br />
                      <span className="mono text-[11px] text-clay">{o.customer_phone}</span>
                    </td>
                    <td className="p-3">{o.product_name}</td>
                    <td className="p-3 text-right mono">{Number(o.product_price_mad).toFixed(2)}</td>
                    <td className="p-3 text-right">
                      <StatusPill status={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="mt-16">
        <h2 className="serif text-3xl tracking-tightest">Send orders to Snailon.</h2>
        <p className="mt-2 text-clay">
          POST any order to this endpoint. We'll handle the confirmation conversation.
        </p>
        <pre className="mono text-xs bg-ink text-cream p-4 mt-4 overflow-x-auto">{`curl -X POST https://snailon.com/api/orders/create \\
  -H "Authorization: Bearer ${merchant.id}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "customer_name": "Khalid",
    "customer_phone": "+212600000000",
    "customer_address": "Ain Sebaa, Casablanca",
    "product_name": "Montre digitale",
    "product_price_mad": 199,
    "quantity": 1
  }'`}</pre>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-sand p-4">
      <p className="mono text-[10px] uppercase tracking-wider text-clay">{label}</p>
      <p className="serif text-4xl tracking-tightest mt-1">{value}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    confirmed: "bg-moss text-cream",
    pending: "bg-sand text-clay",
    confirming: "bg-terracotta text-cream",
    unconfirmed: "bg-clay text-cream",
    cancelled: "bg-ink text-cream",
    failed: "bg-ink text-cream",
  };
  const cls = map[status] ?? "bg-sand text-clay";
  return (
    <span className={`mono text-[10px] uppercase tracking-wider px-2 py-1 ${cls}`}>{status}</span>
  );
}
