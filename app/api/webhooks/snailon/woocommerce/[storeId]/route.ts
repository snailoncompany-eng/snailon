import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalize } from "@/lib/snailon-ingest/normalize";
import { verifyWooHmac } from "@/lib/snailon-ingest/verify";
import { toOrderRow } from "@/lib/snailon-ingest/to-order-row";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/snailon/woocommerce/[storeId]
 *
 * Receives orders from either:
 *   (a) The Snailon WP plugin (most common) — signed with our webhook_secret
 *       via X-Snailon-Signature.
 *   (b) WooCommerce's native webhook system — signed with X-WC-Webhook-Signature.
 *
 * `storeId` accepts either a store_connections UUID or the snk_xxx public
 * key. Accepting the public key simplifies plugin distribution: the plugin
 * file only needs to know the merchant's snk_ key, not their internal UUID.
 */
export async function POST(
  req: Request,
  { params }: { params: { storeId: string } }
) {
  const db = createAdminClient();

  const raw = await req.text();
  const snailonSig = req.headers.get("x-snailon-signature") || "";
  const wooSig = req.headers.get("x-wc-webhook-signature") || "";

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      params.storeId
    );
  const lookupColumn = isUuid ? "id" : "pixel_token";

  const { data: store } = await db
    .from("store_connections")
    .select("id, merchant_id, platform, webhook_secret, connection_status")
    .eq(lookupColumn, params.storeId)
    .maybeSingle();

  if (!store) {
    return NextResponse.json({ error: "unknown_store" }, { status: 404 });
  }

  const sigPresent = snailonSig || wooSig;
  if (!sigPresent) {
    return NextResponse.json({ error: "missing_signature" }, { status: 401 });
  }

  if (
    !store.webhook_secret ||
    !verifyWooHmac(raw, sigPresent, store.webhook_secret)
  ) {
    await db.from("pixel_events").insert({
      store_connection_id: store.id,
      pixel_token: "webhook",
      event_type: "webhook",
      outcome: "signature_rejected",
      origin: req.headers.get("x-snailon-source") || "woocommerce",
    });
    return NextResponse.json({ error: "bad_signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "malformed" }, { status: 400 });
  }

  const normalized = normalize("woocommerce", payload);
  if (!normalized) {
    return NextResponse.json({ error: "malformed" }, { status: 400 });
  }

  const orderRow = toOrderRow({
    storeConnectionId: store.id,
    merchantId: store.merchant_id,
    source: "webhook",
    order: normalized,
  });

  const { error: upsertErr } = await db.from("orders").upsert(orderRow, {
    onConflict: "store_connection_id,external_order_id",
    ignoreDuplicates: false,
  });

  if (upsertErr) {
    return NextResponse.json({ error: "storage" }, { status: 500 });
  }

  const nowIso = new Date().toISOString();
  if (store.connection_status !== "live") {
    await db
      .from("store_connections")
      .update({
        connection_status: "live",
        first_order_at: nowIso,
        last_order_at: nowIso,
      })
      .eq("id", store.id);
  } else {
    await db
      .from("store_connections")
      .update({ last_order_at: nowIso })
      .eq("id", store.id);
  }

  await db.from("pixel_events").insert({
    store_connection_id: store.id,
    pixel_token: "webhook",
    event_type: "webhook",
    outcome: "accepted",
    origin: req.headers.get("x-snailon-source") || "woocommerce",
  });

  return NextResponse.json({ ok: true });
}
