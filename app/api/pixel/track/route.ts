import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildOpeningMessage } from "@/lib/confirm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/pixel/track
// Public endpoint — auth via the per-store pixel_token (random 36-char).
// Events: page_view | add_to_cart | checkout_started | order_placed | cart_abandoned
//
// On `cart_abandoned` with a phone number, we synthesize an order in
// status=pending so the AI confirmation engine can later attempt recovery
// via WhatsApp.
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const token = String(body.token ?? "").trim();
  const eventType = String(body.event_type ?? "").trim();
  if (!token || !eventType) return NextResponse.json({ error: "bad event" }, { status: 400 });

  const admin = createAdminClient();

  // Resolve token → connection. Cache-friendly query (unique index).
  const { data: conn } = await admin
    .from("store_connections")
    .select("id, merchant_id, store_url")
    .eq("pixel_token", token)
    .maybeSingle();

  // We accept events even if conn is null (gives merchants visibility into
  // setup mistakes); they just won't trigger AI recovery.
  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;

  await admin.from("pixel_events").insert({
    store_connection_id: conn?.id ?? null,
    pixel_token: token,
    event_type: eventType,
    customer_email: body.customer_email ?? null,
    customer_phone: body.customer_phone ?? null,
    customer_name: body.customer_name ?? null,
    cart_value_mad: body.cart_value_mad ?? null,
    cart_items: body.cart_items ?? null,
    page_url: body.page_url ?? null,
    user_agent: req.headers.get("user-agent"),
    ip_address: ip,
    raw_payload: body,
  });

  // Cart abandonment → synthesize an order so the recovery flow can run.
  if (
    eventType === "cart_abandoned" &&
    conn &&
    body.customer_phone &&
    String(body.customer_phone).length >= 6
  ) {
    await synthesizeRecoveryOrder(conn, body);
  }

  return NextResponse.json({ ok: true });
}

async function synthesizeRecoveryOrder(
  conn: { id: string; merchant_id: string; store_url: string | null },
  body: any
) {
  const admin = createAdminClient();
  const phone = String(body.customer_phone).trim();

  // Dedupe: don't synthesize a recovery order if we already have a pending
  // one for this phone in the last 24h.
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: existing } = await admin
    .from("orders")
    .select("id")
    .eq("merchant_id", conn.merchant_id)
    .eq("customer_phone", phone)
    .in("status", ["pending", "confirming"])
    .gte("created_at", since)
    .maybeSingle();
  if (existing) return;

  const cartValue = Number(body.cart_value_mad ?? 0) || 0;
  const productName =
    Array.isArray(body.cart_items) && body.cart_items[0]?.name
      ? String(body.cart_items[0].name)
      : "Articles dyalek f l-panier";

  const { data: order } = await admin
    .from("orders")
    .insert({
      merchant_id: conn.merchant_id,
      store_connection_id: conn.id,
      customer_name: body.customer_name ?? null,
      customer_phone: phone,
      product_name: productName,
      product_price_mad: cartValue || 0,
      quantity: 1,
      raw_payload: { source: "pixel_abandoned_cart", body },
      status: "pending",
      ai_summary: "Abandoned cart — recovery candidate",
    })
    .select()
    .single();

  if (!order) return;

  // Build the recovery opening message (slightly different tone — softer)
  const opening = buildOpeningMessage({
    customerName: order.customer_name,
    productName: order.product_name,
    productPriceMad: Number(order.product_price_mad),
    quantity: order.quantity,
    address: null,
    city: null,
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
}

// CORS preflight (the pixel posts cross-origin from the merchant's storefront)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
