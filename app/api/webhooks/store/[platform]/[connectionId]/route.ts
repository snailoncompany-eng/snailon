import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStoreAdapter } from "@/lib/integrations/registry";
import { buildOpeningMessage } from "@/lib/confirm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/webhooks/store/:platform/:connectionId
//
// Universal entry point for every store-platform webhook. The URL embeds:
//   - platform (so we know which adapter to dispatch to)
//   - connectionId (so we know which merchant + which credentials)
//
// Pipeline:
//   1. look up the connection
//   2. adapter verifies the webhook signature
//   3. adapter parses the order payload into a NormalizedOrder
//   4. dedupe against (store_connection_id, external_order_id)
//   5. insert into orders table with status=pending
//   6. build Darija opening, insert outbound message, mark confirming
//
// This is the same pipeline /api/orders/create runs — just fed by webhook.
export async function POST(
  req: Request,
  { params }: { params: { platform: string; connectionId: string } }
) {
  const adapter = getStoreAdapter(params.platform);
  if (!adapter) return NextResponse.json({ error: "unknown platform" }, { status: 404 });

  const admin = createAdminClient();
  const { data: conn } = await admin
    .from("store_connections")
    .select("*")
    .eq("id", params.connectionId)
    .eq("platform", params.platform)
    .eq("is_active", true)
    .maybeSingle();
  if (!conn) return NextResponse.json({ error: "connection not found" }, { status: 404 });

  const rawBody = await req.text();

  // 1. Signature check
  const valid = adapter.verifyWebhook(rawBody, req.headers, conn.credentials);
  if (!valid) {
    console.warn(`[webhook ${params.platform}] invalid signature on ${conn.id}`);
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  // 2. Parse
  const normalized = adapter.parseOrderWebhook(rawBody, req.headers);
  if (!normalized) {
    // Not an order event — may be a ping, a customer.create, etc.
    return NextResponse.json({ ok: true, ignored: "not_an_order" });
  }

  // 3. Idempotency: dedupe on (store_connection_id, external_order_id)
  const { data: existing } = await admin
    .from("orders")
    .select("id")
    .eq("store_connection_id", conn.id)
    .eq("external_order_id", normalized.externalOrderId)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: true, deduped: true, order_id: existing.id });
  }

  // 4. Insert
  const { data: order, error } = await admin
    .from("orders")
    .insert({
      merchant_id: conn.merchant_id,
      store_connection_id: conn.id,
      external_order_id: normalized.externalOrderId,
      customer_name: normalized.customerName,
      customer_phone: normalized.customerPhone,
      customer_address: normalized.customerAddress,
      customer_city: normalized.customerCity,
      product_name: normalized.productName,
      product_price_mad: normalized.productPriceMad,
      quantity: normalized.quantity,
      raw_payload: normalized.rawPayload,
      status: "pending",
    })
    .select()
    .single();
  if (error || !order) {
    console.error(`[webhook ${params.platform}] insert failed:`, error);
    return NextResponse.json({ error: error?.message ?? "insert failed" }, { status: 500 });
  }

  // 5. Build Darija opening + mark confirming. (When WhatsApp is wired in,
  // this is also where we'd send the message via the WhatsApp provider.)
  const opening = buildOpeningMessage({
    customerName: order.customer_name,
    productName: order.product_name,
    productPriceMad: Number(order.product_price_mad),
    quantity: order.quantity,
    address: order.customer_address,
    city: order.customer_city,
  });

  await admin.from("confirmation_messages").insert({
    order_id: order.id,
    direction: "outbound",
    channel: "whatsapp",
    content: opening,
  });
  await admin
    .from("orders")
    .update({ status: "confirming", last_message_at: new Date().toISOString() })
    .eq("id", order.id);

  return NextResponse.json({ ok: true, order_id: order.id, status: "confirming" });
}
