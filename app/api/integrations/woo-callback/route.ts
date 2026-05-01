import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/integrations/woo-callback?conn=<connectionId>
//
// WooCommerce posts JSON here after the merchant clicks "Approve" in wp-admin:
//   { key_id, user_id, consumer_key, consumer_secret, key_permissions }
//
// We persist the keys against the connection, generate a webhook secret,
// and (in real production) hit the WC webhook endpoint to register
// orders.create + orders.updated.
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const connectionId = searchParams.get("conn");
  if (!connectionId) return NextResponse.json({ error: "missing conn" }, { status: 400 });

  const body = await req.json().catch(() => null);
  if (!body?.consumer_key || !body?.consumer_secret) {
    return NextResponse.json({ error: "missing keys in callback" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: conn } = await admin
    .from("store_connections")
    .select("*")
    .eq("id", connectionId)
    .maybeSingle();
  if (!conn) return NextResponse.json({ error: "connection not found" }, { status: 404 });

  // Generate a webhook secret we'll register with WooCommerce shortly.
  const webhookSecret = crypto.randomBytes(24).toString("hex");

  const credentials = {
    ...(conn.credentials ?? {}),
    consumer_key: body.consumer_key,
    consumer_secret: body.consumer_secret,
    webhook_secret: webhookSecret,
    key_permissions: body.key_permissions,
  };

  await admin
    .from("store_connections")
    .update({
      credentials,
      capabilities: Array.from(new Set([...(conn.capabilities ?? []), "orders_realtime"])),
      pending_step: null,
    })
    .eq("id", connectionId);

  // Register the webhook on WooCommerce side (best-effort)
  registerWooWebhook(conn.store_url, body.consumer_key, body.consumer_secret, webhookSecret, conn.id, conn.platform).catch(
    (e) => console.warn("woo webhook register failed:", e)
  );

  return NextResponse.json({ ok: true });
}

async function registerWooWebhook(
  storeUrl: string,
  consumerKey: string,
  consumerSecret: string,
  secret: string,
  connectionId: string,
  platform: string
) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://snailon.com";
  const callbackUrl = `${baseUrl}/api/webhooks/store/${platform}/${connectionId}`;
  const auth = "Basic " + Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
  const events = ["order.created", "order.updated"];
  for (const topic of events) {
    await fetch(`${storeUrl}/wp-json/wc/v3/webhooks`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Snailon ${topic}`,
        topic,
        delivery_url: callbackUrl,
        secret,
      }),
    }).catch(() => {});
  }
}
