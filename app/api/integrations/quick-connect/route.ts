import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { detectPlatform } from "@/lib/integrations/detect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/integrations/quick-connect
// Body: { url: string }
//
// Pipeline (target: <3s end-to-end):
//   1. Detect platform via parallel HTTP probes
//   2. Save a partial connection row with what we know
//   3. Trigger ForceLog auto-setup (fire-and-forget, doesn't block)
//   4. Return: connection summary, public catalog preview, next step
//
// The merchant sees their store name + product preview WITHIN this response.
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
  const inputUrl = String(body.url ?? "").trim();
  if (!inputUrl) return NextResponse.json({ error: "missing url" }, { status: 400 });

  const detection = await detectPlatform(inputUrl);
  if (!detection) {
    return NextResponse.json(
      { error: "We couldn't read that URL. Double-check it's your store address." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: merchant } = await admin
    .from("merchants")
    .select("id, business_name")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!merchant) return NextResponse.json({ error: "merchant not found" }, { status: 404 });

  const platformForRow = detection.platform === "unknown" ? "custom" : detection.platform;

  // Generate the universal pixel token (works regardless of platform).
  const pixelToken = `pix_${crypto.randomBytes(18).toString("hex")}`;

  // Persist partial connection. Capabilities reflect what works RIGHT NOW.
  const capabilities: string[] = [];
  if (detection.publicCatalog.length > 0) capabilities.push("public_catalog");

  const { data: conn, error } = await admin
    .from("store_connections")
    .upsert(
      {
        merchant_id: merchant.id,
        platform: platformForRow,
        store_url: detection.storeUrl ?? "",
        store_name: detection.storeName ?? detection.hostname,
        credentials: {},
        is_active: true,
        capabilities,
        detected_platform: detection.platform,
        pending_step: detection.nextStep,
        pixel_token: pixelToken,
        product_count: detection.publicCatalog.length,
        metadata: { signals: detection.signals },
      },
      { onConflict: "merchant_id,platform,store_url" }
    )
    .select()
    .single();

  if (error || !conn) {
    return NextResponse.json({ error: error?.message ?? "save failed" }, { status: 500 });
  }

  // Persist whatever public catalog we found (no auth needed).
  if (detection.publicCatalog.length > 0) {
    const rows = detection.publicCatalog.map((p) => ({
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
    await admin
      .from("store_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", conn.id);
  }

  // Auto-set up ForceLog as default carrier in the background (fire-and-forget).
  ensureForceLogCarrier(merchant.id).catch((e) =>
    console.warn("forcelog auto-setup failed:", e)
  );

  // Build the next-step descriptor for the wizard.
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://snailon.com";
  const wizardStep = buildNextStep(detection.nextStep, conn.id, detection.storeUrl, baseUrl);

  return NextResponse.json({
    ok: true,
    connection: {
      id: conn.id,
      platform: conn.platform,
      detected_platform: detection.platform,
      store_name: conn.store_name,
      store_url: conn.store_url,
      capabilities,
      pixel_token: pixelToken,
    },
    catalog_preview: detection.publicCatalog.slice(0, 8).map((p) => ({
      name: p.name,
      price_mad: p.priceMad,
    })),
    catalog_total: detection.publicCatalog.length,
    next_step: wizardStep,
    pixel_snippet: pixelSnippet(baseUrl, pixelToken),
  });
}

function buildNextStep(
  step: string,
  connectionId: string,
  storeUrl: string,
  baseUrl: string
) {
  switch (step) {
    case "woocommerce_auto_auth": {
      // Build the WooCommerce auto-auth URL. Merchant clicks once, lands in
      // their wp-admin, hits "Approve", their store posts the keys back to us.
      const params = new URLSearchParams({
        app_name: "Snailon",
        scope: "read_write",
        user_id: connectionId,
        return_url: `${baseUrl}/dashboard/integrations?wc_return=${connectionId}`,
        callback_url: `${baseUrl}/api/integrations/woo-callback?conn=${connectionId}`,
      });
      return {
        kind: "woocommerce_auto_auth",
        title: "Approve Snailon in your store",
        description:
          "We'll redirect you to your WordPress admin. Click Approve once and we'll handle the rest — no copying, no pasting.",
        cta: "Continue to WooCommerce →",
        url: `${storeUrl}/wc-auth/v1/authorize?${params.toString()}`,
      };
    }
    case "shopify_install_app":
      return {
        kind: "shopify_install_app",
        title: "Connect orders & abandoned checkouts",
        description:
          "Catalog is already in. To pull live orders and recover abandoned carts, install our Shopify app — it takes one click.",
        cta: "Install Snailon for Shopify →",
        // Until our Shopify app is published, we fall back to a token paste.
        // Once published, this URL becomes the official install link.
        url: `https://${new URL(storeUrl).hostname}/admin/oauth/install?client_id=${process.env.SHOPIFY_APP_CLIENT_ID ?? ""}&scope=read_products,read_orders,write_orders,read_checkouts&redirect_uri=${encodeURIComponent(`${baseUrl}/api/integrations/shopify-callback?conn=${connectionId}`)}`,
        fallback: {
          title: "Or paste an Admin API token",
          fields: [
            { key: "admin_api_token", label: "Token", type: "password", placeholder: "shpat_..." },
          ],
        },
      };
    case "youcan_paste_token":
      return {
        kind: "youcan_paste_token",
        title: "One last thing for live orders",
        description:
          "YouCan needs you to paste an access token so we can register the order webhook. We'll guide you to the exact spot.",
        cta: "I have my token →",
        guideUrl: "https://developer.youcan.shop/store-admin/introduction/getting-started",
        fields: [{ key: "access_token", label: "Access token", type: "password", placeholder: "yc_..." }],
      };
    default:
      return {
        kind: "pixel_only",
        title: "Add Snailon to your storefront",
        description:
          "We couldn't auto-detect your platform. Drop our tracking snippet into your theme footer — works on any site.",
      };
  }
}

function pixelSnippet(baseUrl: string, token: string): string {
  return `<script async src="${baseUrl}/pixel/snailon.js" data-snailon-token="${token}"></script>`;
}

async function ensureForceLogCarrier(merchantId: string) {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("carrier_connections")
    .select("id")
    .eq("merchant_id", merchantId)
    .eq("platform", "forcelog")
    .maybeSingle();
  if (existing) return;
  await admin.from("carrier_connections").insert({
    merchant_id: merchantId,
    platform: "forcelog",
    credentials: {},
    is_active: true,
    metadata: {
      mode: "auto_setup_pending",
      note: "ForceLog auto-attached. We'll surface a 'Send to ForceLog' button once their API approves us.",
    },
  });
}
