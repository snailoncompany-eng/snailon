import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalize } from "@/lib/snailon-ingest/normalize";
import { verifyYouCanHmac } from "@/lib/snailon-ingest/verify";
import { toOrderRow } from "@/lib/snailon-ingest/to-order-row";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/snailon/youcan/[storeId]
 *
 * Tier-2 path — used when a merchant has installed our YouCan Partner app
 * and granted webhook permissions. YouCan signs each delivery with
 * `x-youcan-signature`: hex(HMAC-SHA256(JSON.stringify(payload), client_secret)).
 *
 * The hex format and the JSON.stringify scope (raw body, byte-for-byte)
 * are the two non-obvious bits that bite people. We've already accounted
 * for both in verifyYouCanHmac.
 */
export async function POST(
  req: Request,
  { params }: { params: { storeId: string } }
) {
  const db = createAdminClient();

  const raw = await req.text();
  const sig = req.headers.get("x-youcan-signature") || "";

  const { data: store } = await db
    .from("store_connections")
    .select("id, merchant_id, platform, webhook_secret, connection_status")
    .eq("id", params.storeId)
    .maybeSingle();

  if (!store) {
    return NextResponse.json({ error: "unknown_store" }, { status: 404 });
  }

  if (
    !store.webhook_secret ||
    !verifyYouCanHmac(raw, sig, store.webhook_secret)
  ) {
    await db.from("pixel_events").insert({
      store_connection_id: store.id,
      pixel_token: "webhook",
      event_type: "webhook",
      outcome: "signature_rejected",
      origin: "youcan",
    });
    return NextResponse.json({ error: "bad_signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "malformed" }, { status: 400 });
  }

  // YouCan REST hooks wrap the payload — order data is sometimes at the
  // root, sometimes under .data.order, depending on event_type.
  const orderPayload =
    (payload as { data?: { order?: unknown }; order?: unknown })?.data?.order ||
    (payload as { order?: unknown })?.order ||
    payload;

  const normalized = normalize("youcan", orderPayload);
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
    origin: "youcan",
  });

  return NextResponse.json({ ok: true });
}
