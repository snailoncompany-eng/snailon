import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { snippetFor, woocommercePluginPhp } from "@/lib/snailon-stores/snippets";
import { getPlatform } from "@/lib/snailon-platforms/catalog";
import type { SnailonPlatform } from "@/lib/snailon-ingest/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/stores/[id]
 *
 * Returns the store + the merchant-facing install snippet for their
 * platform. For WooCommerce, also returns the inline PHP plugin source
 * on request (`?include=plugin`) so the wizard can offer a download
 * with credentials baked in.
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // We use the admin client + an explicit merchant ownership check rather
  // than relying on RLS, because the existing schema's RLS policy on
  // store_connections joins through merchants — fast enough for normal
  // queries but adds latency on the wizard's poll path. The explicit join
  // mirrors the existing app/api/integrations/[id]/disconnect pattern.
  const admin = createAdminClient();
  const { data: merchant } = await admin
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!merchant) {
    return NextResponse.json({ error: "merchant_not_found" }, { status: 404 });
  }

  const { data: row, error } = await admin
    .from("store_connections")
    .select(
      "id, store_name, platform, primary_domain, pixel_token, webhook_secret, connection_status, first_order_at, last_order_at"
    )
    .eq("id", params.id)
    .eq("merchant_id", merchant.id)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const store = {
    id: row.id,
    name: row.store_name,
    platform: row.platform,
    primary_domain: row.primary_domain,
    public_key: row.pixel_token,
    connection_status: row.connection_status,
    first_order_at: row.first_order_at,
    last_order_at: row.last_order_at,
  };

  const platform = getPlatform(store.platform);
  const snippet = snippetFor(store.platform as SnailonPlatform, store.public_key);

  let pluginPhp: string | null = null;
  if (
    store.platform === "woocommerce" &&
    new URL(req.url).searchParams.get("include") === "plugin" &&
    row.webhook_secret
  ) {
    pluginPhp = woocommercePluginPhp(store.public_key, row.webhook_secret);
  }

  return NextResponse.json({
    store,
    platform_info: platform,
    snippet,
    plugin_php: pluginPhp,
  });
}

/**
 * DELETE /api/stores/[id] — disconnects a store.
 *
 * Cascade in the schema removes store_domains. Orders / pixel_events stay
 * (historical record).
 */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: merchant } = await admin
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!merchant) {
    return NextResponse.json({ error: "merchant_not_found" }, { status: 404 });
  }

  const { error } = await admin
    .from("store_connections")
    .delete()
    .eq("id", params.id)
    .eq("merchant_id", merchant.id);

  if (error) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
