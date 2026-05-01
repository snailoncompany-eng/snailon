import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStoreAdapter } from "@/lib/integrations/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: merchant } = await admin
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!merchant) return NextResponse.json({ error: "merchant not found" }, { status: 404 });

  const { data: conn } = await admin
    .from("store_connections")
    .select("*")
    .eq("id", params.id)
    .eq("merchant_id", merchant.id)
    .maybeSingle();
  if (!conn) return NextResponse.json({ error: "connection not found" }, { status: 404 });

  const adapter = getStoreAdapter(conn.platform);
  if (!adapter) return NextResponse.json({ error: "platform unsupported" }, { status: 400 });

  try {
    const products = await adapter.syncCatalog(conn.credentials);
    if (products.length > 0) {
      const rows = products.map((p) => ({
        merchant_id: merchant.id,
        store_connection_id: conn.id,
        external_product_id: p.externalProductId,
        name: p.name,
        price_mad: p.priceMad,
        description: p.description ?? null,
        variants: p.variants ?? null,
        is_active: true,
      }));
      await admin
        .from("products")
        .upsert(rows, { onConflict: "store_connection_id,external_product_id" });
    }
    await admin
      .from("store_connections")
      .update({ last_synced_at: new Date().toISOString(), product_count: products.length })
      .eq("id", conn.id);

    return NextResponse.json({ ok: true, count: products.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "sync failed" }, { status: 500 });
  }
}
