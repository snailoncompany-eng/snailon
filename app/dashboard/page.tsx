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
        <h1 className="headline text-4xl">Almost there.</h1>
        <p className="mt-3 text-muted">Finishing your account setup. Refresh in a moment.</p>
      </div>
    );
  }

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [{ data: allOrders }, { data: todayOrders }, { data: recent }, { count: storeConnCount }] = await Promise.all([
    admin.from("orders").select("status, product_price_mad, quantity").eq("merchant_id", merchant.id),
    admin
      .from("orders")
      .select("status, product_price_mad, quantity")
      .eq("merchant_id", merchant.id)
      .gte("created_at", startOfDay.toISOString()),
    admin
      .from("orders")
      .select("id, customer_name, customer_phone, customer_city, product_name, product_price_mad, quantity, status, created_at")
      .eq("merchant_id", merchant.id)
      .order("created_at", { ascending: false })
      .limit(8),
    admin
      .from("store_connections")
      .select("*", { count: "exact", head: true })
      .eq("merchant_id", merchant.id),
  ]);

  const total = (allOrders ?? []).length;
  const confirmed = (allOrders ?? []).filter((o) => o.status === "confirmed").length;
  const pending = (allOrders ?? []).filter((o) => o.status === "pending" || o.status === "confirming").length;
  const todayCount = (todayOrders ?? []).length;
  const todayConfirmed = (todayOrders ?? []).filter((o) => o.status === "confirmed").length;
  const todayGmv = (todayOrders ?? [])
    .filter((o) => o.status === "confirmed")
    .reduce((s, o) => s + Number(o.product_price_mad) * o.quantity, 0);
  const conversionRate = total > 0 ? Math.round((confirmed / total) * 100) : 0;

  const greeting = greetingForTime();

  return (
    <div className="space-y-10">
      <header className="animate-rise">
        <p className="eyebrow eyebrow-accent">overview</p>
        <h1 className="headline text-4xl sm:text-5xl mt-2">
          {greeting}, <span className="italic">{merchant.business_name ?? merchant.email.split("@")[0]}</span>.
        </h1>
        <p className="mt-2 text-muted">
          {todayCount > 0
            ? `${todayCount} ${todayCount === 1 ? "order" : "orders"} today · ${todayConfirmed} confirmed.`
            : "No orders yet today. They'll show up here as they come in."}
        </p>
      </header>

      {/* KPIs — today first */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Kpi label="today · orders" value={todayCount.toString()} />
        <Kpi label="today · confirmed" value={todayConfirmed.toString()} accent />
        <Kpi label="today · gmv" value={`${todayGmv.toFixed(0)} MAD`} />
        <Kpi label="all-time conversion" value={`${conversionRate}%`} sub={`${confirmed} of ${total}`} />
      </section>

      {/* Pipeline status row */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <PipelineCard label="Pending" count={pending} desc="Waiting on AI confirmation" tone="muted" />
        <PipelineCard label="Confirmed" count={confirmed} desc="Ready to ship" tone="success" />
        <PipelineCard
          label="Wallet runway"
          count={Math.floor(Number(merchant.balance_mad ?? 0) / 5)}
          desc="confirmations remaining"
          tone="accent"
        />
      </section>

      {/* No store connected → CTA */}
      {(storeConnCount ?? 0) === 0 && (
        <section className="card p-6 sm:p-8 border-accent bg-accent-soft/40">
          <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
            <div>
              <p className="eyebrow eyebrow-accent">next step</p>
              <h2 className="font-display text-2xl tracking-tight mt-1">
                Connect your store to start receiving orders.
              </h2>
              <p className="text-muted text-sm mt-1">
                Paste your Shopify, WooCommerce or YouCan URL — we handle the rest.
              </p>
            </div>
            <Link href="/dashboard/connect" className="btn btn-primary">
              Connect store <span aria-hidden>→</span>
            </Link>
          </div>
        </section>
      )}

      {/* Recent orders */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-display text-2xl tracking-tight">Recent orders</h2>
          {(recent?.length ?? 0) > 0 && (
            <Link href="/dashboard/orders" className="btn-link text-sm">
              See all →
            </Link>
          )}
        </div>
        {(recent ?? []).length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-muted">No orders yet.</p>
            <p className="text-sm text-subtle mt-2">
              Orders flow in automatically once your store is connected.
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table-clean">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th className="hidden sm:table-cell">Product</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(recent ?? []).map((o: any) => (
                    <tr key={o.id} className="hover:bg-[rgba(10,10,10,0.015)] transition-colors">
                      <td>
                        <div className="font-medium">{o.customer_name ?? "—"}</div>
                        <div className="font-mono text-xs text-muted">
                          {o.customer_phone}
                          {o.customer_city && ` · ${o.customer_city}`}
                        </div>
                      </td>
                      <td className="hidden sm:table-cell text-muted">{o.product_name}</td>
                      <td className="text-right font-mono">
                        {(Number(o.product_price_mad) * o.quantity).toFixed(0)} MAD
                      </td>
                      <td className="text-right">
                        <StatusPill status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function greetingForTime() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="card p-4 sm:p-5">
      <p className="eyebrow">{label}</p>
      <p className={`font-display text-3xl sm:text-4xl tracking-tight mt-2 ${accent ? "text-accent" : ""}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
    </div>
  );
}

function PipelineCard({
  label,
  count,
  desc,
  tone,
}: {
  label: string;
  count: number;
  desc: string;
  tone: "muted" | "success" | "accent";
}) {
  const dotClass = tone === "success" ? "bg-success" : tone === "accent" ? "bg-accent" : "bg-subtle";
  return (
    <div className="card p-4 sm:p-5 flex items-center gap-4">
      <span className={`dot ${dotClass} w-2.5 h-2.5`} />
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted">{desc}</p>
      </div>
      <p className="font-display text-3xl tracking-tight">{count}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    confirmed: "pill-success",
    pending: "pill-muted",
    confirming: "pill-accent",
    unconfirmed: "pill-warning",
    cancelled: "pill-muted",
    failed: "pill-muted",
  };
  return <span className={`pill ${map[status] ?? "pill-muted"}`}>{status}</span>;
}
