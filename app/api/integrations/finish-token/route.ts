import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStoreAdapter } from "@/lib/integrations/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/integrations/finish-token
// Body: { connection_id, credentials: {...} }
//
// Used after quick-connect when the platform requires a paste step
// (YouCan, Shopify-without-OAuth-app). We test the creds, save them,
// kick off the full catalog sync + webhook registration.
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.connection_id) return NextResponse.json({ error: "missing connection_id" }, { status: 400 });

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
    .eq("id", body.connection_id)
    .eq("merchant_id", merchant.id)
    .maybeSingle();
  if (!conn) return NextResponse.json({ error: "connection not found" }, { status: 404 });

  const adapter = getStoreAdapter(conn.platform);
  if (!adapter) return NextResponse.json({ error: "platform unsupported" }, { status: 400 });

  // Merge new creds with whatever store_url we already detected
  const credentials = {
    store_url: conn.store_url,
    ...conn.credentials,
    ...(body.credentials ?? {}),
  };

  const test = await adapter.testConnection(credentials);
  if (!test.ok) return NextResponse.json({ error: test.error }, { status: 400 });

  await admin
    .from("store_connections")
    .update({
      credentials,
      store_name: test.storeName ?? conn.store_name,
      external_store_id: test.externalStoreId ?? conn.external_store_id,
      capabilities: Array.from(new Set([...(conn.capabilities ?? []), "orders_realtime"])),
      pending_step: null,
    })
    .eq("id", conn.id);

  // Background: register webhooks + full catalog sync
  if (adapter.registerWebhooks) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://snailon.com";
    const callback = `${baseUrl}/api/webhooks/store/${conn.platform}/${conn.id}`;
    adapter.registerWebhooks(credentials, callback).catch((e) =>
      console.warn(`[finish-token] webhook reg failed:`, e)
    );
  }

  syncCatalog(conn.id, merchant.id, credentials).catch((e) =>
    console.warn("[finish-token] sync failed:", e)
  );

  return NextResponse.json({ ok: true });
}

async function syncCatalog(connectionId: string, merchantId: string, credentials: any) {
  const admin = createAdminClient();
  const { data: conn } = await admin
    .from("store_connections")
    .select("platform")
    .eq("id", connectionId)
    .single();
  if (!conn) return;
  const adapter = getStoreAdapter(conn.platform);
  if (!adapter) return;
  const products = await adapter.syncCatalog(credentials);
  if (products.length === 0) return;
  const rows = products.map((p) => ({
    merchant_id: merchantId,
    store_connection_id: connectionId,
    external_product_id: p.externalProductId,
    name: p.name,
    price_mad: p.priceMad,
    description: p.description ?? null,
    variants: p.variants ?? null,
    is_active: true,
  }));
  await admin.from("products").upsert(rows, { onConflict: "store_connection_id,external_product_id" });
  await admin
    .from("store_connections")
    .update({ last_synced_at: new Date().toISOString(), product_count: products.length })
    .eq("id", connectionId);
}
