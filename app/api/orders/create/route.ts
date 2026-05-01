import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildOpeningMessage } from "@/lib/confirm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public webhook for ingesting orders.
// Auth: `Authorization: Bearer <merchant_id>` header.
// In a real production setup we'd issue real API keys, but for the MVP
// the merchant_id (UUID) is the simplest token.
//
// Body shape:
// {
//   external_order_id?: string,
//   customer_name?: string,
//   customer_phone: string (required),
//   customer_address?: string,
//   customer_city?: string,
//   product_name: string (required),
//   product_price_mad: number (required),
//   quantity?: number  (default 1)
// }
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const merchantId = auth.replace(/^Bearer\s+/i, "").trim();
  if (!merchantId) {
    return NextResponse.json({ error: "missing Bearer token (merchant_id)" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: merchant, error: merchantErr } = await admin
    .from("merchants")
    .select("id, is_active, balance_mad")
    .eq("id", merchantId)
    .maybeSingle();

  if (merchantErr || !merchant) {
    return NextResponse.json({ error: "invalid merchant" }, { status: 401 });
  }
  if (!merchant.is_active) {
    return NextResponse.json({ error: "merchant inactive" }, { status: 403 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const phone = String(body.customer_phone ?? "").trim();
  const productName = String(body.product_name ?? "").trim();
  const price = Number(body.product_price_mad);

  if (!phone || !productName || !Number.isFinite(price) || price <= 0) {
    return NextResponse.json(
      { error: "customer_phone, product_name, product_price_mad required" },
      { status: 400 }
    );
  }

  const insert = {
    merchant_id: merchant.id,
    external_order_id: body.external_order_id ?? null,
    customer_name: body.customer_name ?? null,
    customer_phone: phone,
    customer_address: body.customer_address ?? null,
    customer_city: body.customer_city ?? null,
    product_name: productName,
    product_price_mad: price,
    quantity: body.quantity ? Number(body.quantity) : 1,
    raw_payload: body,
    status: "pending" as const,
  };

  const { data: order, error: orderErr } = await admin
    .from("orders")
    .insert(insert)
    .select()
    .single();

  if (orderErr || !order) {
    return NextResponse.json({ error: orderErr?.message ?? "insert failed" }, { status: 500 });
  }

  // Pre-build the opening Darija message and persist it as the first outbound
  // message. When a real WhatsApp channel is wired in, sending it is one fetch.
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

  return NextResponse.json({
    ok: true,
    order_id: order.id,
    status: "confirming",
    opening_message: opening,
    test_endpoint: `/api/confirm/${order.id}`,
  });
}
