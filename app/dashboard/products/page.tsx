import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

export default async function ProductsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const admin = createAdminClient();
  const { data: merchant } = await admin
    .from("merchants")
    .select("id")
    .eq("user_id", user!.id)
    .maybeSingle();
  const { data: products } = await admin
    .from("products")
    .select("*")
    .eq("merchant_id", merchant?.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow eyebrow-accent">catalog</p>
        <h1 className="headline text-4xl mt-2">Products</h1>
        <p className="text-muted mt-1 max-w-xl">
          Synced products from your connected stores. The AI uses these to answer customer questions during confirmation.
        </p>
      </header>

      {(!products || products.length === 0) ? (
        <div className="card p-12 text-center">
          <p className="font-medium">No products yet.</p>
          <p className="text-sm text-muted mt-2 max-w-md mx-auto">
            Connect a store and we'll sync your catalog automatically.
          </p>
          <Link href="/dashboard/integrations" className="btn btn-primary mt-5">
            Connect store <span aria-hidden>→</span>
          </Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-clean">
              <thead>
                <tr>
                  <th>Product</th>
                  <th className="text-right">Price</th>
                  <th className="hidden sm:table-cell">Description</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p: any) => (
                  <tr key={p.id} className="hover:bg-[rgba(10,10,10,0.015)] transition-colors">
                    <td className="font-medium">{p.name}</td>
                    <td className="text-right font-mono">{Number(p.price_mad).toFixed(0)} MAD</td>
                    <td className="hidden sm:table-cell text-muted text-sm max-w-md truncate">
                      {p.description ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
