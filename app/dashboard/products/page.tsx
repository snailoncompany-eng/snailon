import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function ProductsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const { data: merchant } = await admin.from("merchants").select("id").eq("user_id", user!.id).maybeSingle();
  const { data: products } = await admin
    .from("products")
    .select("*")
    .eq("merchant_id", merchant?.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <p className="mono text-[10px] uppercase tracking-[0.25em] text-terracotta">catalog</p>
      <h1 className="serif text-5xl tracking-tightest mt-2">Products.</h1>
      <p className="text-clay mt-2">
        Adding a catalog improves how the AI answers customer questions during confirmation.
      </p>

      <div className="mt-10 border border-sand">
        <table className="w-full text-sm">
          <thead className="bg-sand mono text-[10px] uppercase tracking-wider text-clay">
            <tr>
              <th className="text-left p-3">name</th>
              <th className="text-right p-3">price</th>
              <th className="text-left p-3">description</th>
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map((p: any) => (
              <tr key={p.id} className="border-t border-sand">
                <td className="p-3">{p.name}</td>
                <td className="p-3 text-right mono">{Number(p.price_mad).toFixed(2)}</td>
                <td className="p-3 text-clay">{p.description ?? "—"}</td>
              </tr>
            ))}
            {(!products || products.length === 0) && (
              <tr>
                <td colSpan={3} className="p-8 text-center text-clay">
                  No products yet. Coming soon: bulk upload + WhatsApp catalog sync.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
