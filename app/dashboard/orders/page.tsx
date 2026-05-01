import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function OrdersPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const { data: merchant } = await admin.from("merchants").select("id").eq("user_id", user!.id).maybeSingle();
  const { data: orders } = await admin
    .from("orders")
    .select("*")
    .eq("merchant_id", merchant?.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <p className="mono text-[10px] uppercase tracking-[0.25em] text-terracotta">orders</p>
      <h1 className="serif text-5xl tracking-tightest mt-2">All orders.</h1>

      <div className="mt-10 border border-sand overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-sand mono text-[10px] uppercase tracking-wider text-clay">
            <tr>
              <th className="text-left p-3">when</th>
              <th className="text-left p-3">customer</th>
              <th className="text-left p-3">product</th>
              <th className="text-right p-3">total</th>
              <th className="text-right p-3">status</th>
              <th className="text-left p-3">summary</th>
            </tr>
          </thead>
          <tbody>
            {(orders ?? []).map((o: any) => (
              <tr key={o.id} className="border-t border-sand align-top">
                <td className="p-3 mono text-[11px] text-clay">
                  {new Date(o.created_at).toLocaleString()}
                </td>
                <td className="p-3">
                  {o.customer_name ?? "—"}
                  <br />
                  <span className="mono text-[11px] text-clay">{o.customer_phone}</span>
                  {o.customer_address && (
                    <>
                      <br />
                      <span className="text-[11px] text-clay">{o.customer_address}</span>
                    </>
                  )}
                </td>
                <td className="p-3">
                  {o.product_name}
                  <br />
                  <span className="mono text-[11px] text-clay">x {o.quantity}</span>
                </td>
                <td className="p-3 text-right mono">
                  {Number(o.product_price_mad * o.quantity).toFixed(2)}
                </td>
                <td className="p-3 text-right">
                  <span className="mono text-[10px] uppercase tracking-wider px-2 py-1 bg-sand text-clay">
                    {o.status}
                  </span>
                </td>
                <td className="p-3 text-[12px] text-clay max-w-xs">{o.ai_summary ?? "—"}</td>
              </tr>
            ))}
            {(!orders || orders.length === 0) && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-clay">
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
