import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/stores/[id]/status
 *
 * Lightweight polling endpoint for the connection wizard. Returns:
 *   - connection_status (pending | testing | live | disconnected)
 *   - first_order_at / last_order_at
 *   - recent_orders_5min — count of orders ingested in the last 5 minutes
 *   - recent_log — up to 5 most recent ingest_log entries (outcome, origin)
 *
 * The wizard polls every ~2s while showing "place a test order" and flips
 * the UI to ✓ as soon as connection_status === 'live'.
 */
export async function GET(
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

  const { data: store, error } = await admin
    .from("store_connections")
    .select("id, connection_status, first_order_at, last_order_at")
    .eq("id", params.id)
    .eq("merchant_id", merchant.id)
    .maybeSingle();

  if (error || !store) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { count: recentOrders } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("store_connection_id", params.id)
    .gte("ingested_at", fiveMinAgo);

  // Most recent log outcomes — surfaces "origin_rejected" etc. so the
  // wizard can tell the merchant what's wrong without them digging logs.
  const { data: recentLogs } = await admin
    .from("pixel_events")
    .select("outcome, origin, created_at")
    .eq("store_connection_id", params.id)
    .not("outcome", "is", null)
    .order("created_at", { ascending: false })
    .limit(5);

  return NextResponse.json(
    {
      connection_status: store.connection_status,
      first_order_at: store.first_order_at,
      last_order_at: store.last_order_at,
      recent_orders_5min: recentOrders ?? 0,
      recent_log: recentLogs || [],
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
