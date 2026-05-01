import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function OrdersPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const { data: merchant } = await admin
    .from("merchants")
    .select("id")
    .eq("user_id", user!.id)
    .maybeSingle();
  const { data: orders } = await admin
    .from("orders")
    .select("*")
    .eq("merchant_id", merchant?.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow eyebrow-accent">orders</p>
        <h1 className="headline text-4xl mt-2">All orders</h1>
        <p className="text-muted mt-1">
          {orders?.length ?? 0} {(orders?.length ?? 0) === 1 ? "order" : "orders"} · last 100 shown
        </p>
      </header>

      {(!orders || orders.length === 0) ? (
        <div className="card p-12 text-center">
          <p className="text-muted">No orders yet.</p>
          <p className="text-sm text-subtle mt-2">
            Orders will appear here as soon as your store starts receiving them.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card overflow-hidden hidden sm:block">
            <div className="overflow-x-auto">
              <table className="table-clean">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Customer</th>
                    <th>Product</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o: any) => (
                    <tr key={o.id} className="hover:bg-[rgba(10,10,10,0.015)] transition-colors">
                      <td>
                        <div className="text-sm">{formatDate(o.created_at)}</div>
                        <div className="font-mono text-xs text-subtle">{formatTime(o.created_at)}</div>
                      </td>
                      <td>
                        <div className="font-medium">{o.customer_name ?? "—"}</div>
                        <div className="font-mono text-xs text-muted">{o.customer_phone}</div>
                        {o.customer_address && (
                          <div className="text-xs text-subtle truncate max-w-[200px]">{o.customer_address}</div>
                        )}
                      </td>
                      <td>
                        <div>{o.product_name}</div>
                        <div className="font-mono text-xs text-muted">x {o.quantity}</div>
                      </td>
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

          {/* Mobile card list */}
          <div className="space-y-3 sm:hidden">
            {orders.map((o: any) => (
              <div key={o.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{o.customer_name ?? o.customer_phone}</p>
                    <p className="font-mono text-xs text-muted truncate">{o.customer_phone}</p>
                  </div>
                  <StatusPill status={o.status} />
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-line">
                  <p className="text-sm text-muted truncate pr-3">{o.product_name}</p>
                  <p className="font-mono text-sm whitespace-nowrap">
                    {(Number(o.product_price_mad) * o.quantity).toFixed(0)} MAD
                  </p>
                </div>
                <p className="font-mono text-[11px] text-subtle mt-2">
                  {formatDate(o.created_at)} · {formatTime(o.created_at)}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
