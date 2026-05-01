import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStoreAdapter, getCarrierAdapter } from "@/lib/integrations/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/integrations/connect
// Body: { kind: "store" | "carrier", platform, credentials: {...} }
//
// Pipeline:
//   1. test connection via adapter
//   2. persist connection row
//   3. (store only) register webhook with platform → our public webhook URL
//   4. (store only) kick off catalog sync in the background
//   5. return connection summary immediately so UI feels instant
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const kind = body.kind === "carrier" ? "carrier" : "store";
  const platform = String(body.platform ?? "");
  const credentials = body.credentials ?? {};
  if (!platform) return NextResponse.json({ error: "missing platform" }, { status: 400 });

  const admin = createAdminClient();
  const { data: merchant } = await admin
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!merchant) return NextResponse.json({ error: "merchant not found" }, { status: 404 });

  // ---- STORE flow ----
  if (kind === "store") {
    const adapter = getStoreAdapter(platform);
    if (!adapter) return NextResponse.json({ error: "unknown platform" }, { status: 400 });

    const test = await adapter.testConnection(credentials);
    if (!test.ok) return NextResponse.json({ error: test.error }, { status: 400 });

    const webhookSecret = crypto.randomBytes(24).toString("hex");
    const storeUrl =
      typeof credentials.store_url === "string" ? credentials.store_url : null;

    const { data: conn, error } = await admin
      .from("store_connections")
      .upsert(
        {
          merchant_id: merchant.id,
          platform,
          store_url: storeUrl,
          store_name: test.storeName,
          external_store_id: test.externalStoreId ?? null,
          credentials,
          webhook_secret: webhookSecret,
          is_active: true,
          metadata: test.meta ?? null,
        },
        { onConflict: "merchant_id,platform,store_url" }
      )
      .select()
      .single();

    if (error || !conn) {
      return NextResponse.json({ error: error?.message ?? "save failed" }, { status: 500 });
    }

    // Register webhooks (best-effort; doesn't block response)
    if (adapter.registerWebhooks) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://snailon.com";
      const callbackUrl = `${baseUrl}/api/webhooks/store/${platform}/${conn.id}`;
      adapter
        .registerWebhooks(credentials, callbackUrl)
        .catch((e) => console.warn(`[connect] webhook registration failed: ${e.message}`));
    }

    // Catalog sync in background — don't block the response
    syncCatalogInBackground(adapter, conn.id, credentials).catch((e) =>
      console.warn(`[connect] background sync failed: ${e.message}`)
    );

    return NextResponse.json({
      ok: true,
      connection: {
        id: conn.id,
        platform: conn.platform,
        store_name: conn.store_name,
        store_url: conn.store_url,
      },
      webhook_url: `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://snailon.com"}/api/webhooks/store/${platform}/${conn.id}`,
    });
  }

  // ---- CARRIER flow ----
  const adapter = getCarrierAdapter(platform);
  if (!adapter) return NextResponse.json({ error: "unknown platform" }, { status: 400 });

  const test = await adapter.testConnection(credentials);
  if (!test.ok) return NextResponse.json({ error: test.error }, { status: 400 });

  const { data: conn, error } = await admin
    .from("carrier_connections")
    .upsert(
      {
        merchant_id: merchant.id,
        platform,
        credentials,
        is_active: true,
        metadata: test.meta ?? null,
      },
      { onConflict: "merchant_id,platform" }
    )
    .select()
    .single();

  if (error || !conn) {
    return NextResponse.json({ error: error?.message ?? "save failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    connection: { id: conn.id, platform: conn.platform, label: test.storeName },
  });
}

async function syncCatalogInBackground(
  adapter: ReturnType<typeof getStoreAdapter>,
  connectionId: string,
  credentials: any
) {
  if (!adapter) return;
  const products = await adapter.syncCatalog(credentials);
  if (products.length === 0) return;

  const admin = createAdminClient();
  const { data: conn } = await admin
    .from("store_connections")
    .select("merchant_id")
    .eq("id", connectionId)
    .maybeSingle();
  if (!conn) return;

  const rows = products.map((p) => ({
    merchant_id: conn.merchant_id,
    store_connection_id: connectionId,
    external_product_id: p.externalProductId,
    name: p.name,
    price_mad: p.priceMad,
    description: p.description ?? null,
    variants: p.variants ?? null,
    external_data: null,
    is_active: true,
  }));

  await admin
    .from("products")
    .upsert(rows, { onConflict: "store_connection_id,external_product_id" });

  await admin
    .from("store_connections")
    .update({ last_synced_at: new Date().toISOString(), product_count: products.length })
    .eq("id", connectionId);
}
