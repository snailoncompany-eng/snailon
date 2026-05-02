import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalize } from "@/lib/snailon-ingest/normalize";
import { hostnameFromHeader, hostInList } from "@/lib/snailon-ingest/verify";
import { toOrderRow } from "@/lib/snailon-ingest/to-order-row";
import type { SnailonPlatform } from "@/lib/snailon-ingest/types";

/**
 * POST /api/ingest
 *
 * Receives orders from the universal pixel (/p.js).
 *
 * No HMAC signature here — pixels can't keep secrets. Defenses are:
 *   1. Origin / Referer must match a registered hostname for the store.
 *   2. Per-store rate limit via pixel_events count (50 events / minute).
 *   3. Idempotency by (store_connection_id, external_order_id) at the
 *      SQL upsert level.
 *
 * Pixels send via navigator.sendBeacon, which posts text/plain. We parse
 * JSON manually rather than relying on Next's body-parser content-type
 * negotiation (which would reject text/plain JSON).
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function POST(req: Request) {
  const db = createAdminClient();
  const raw = await req.text();
  let body: {
    v?: number;
    public_key?: string;
    source?: string;
    platform?: string;
    order?: unknown;
  };

  try {
    body = JSON.parse(raw);
  } catch {
    return tinyResponse(400, "malformed");
  }

  const publicKey = typeof body.public_key === "string" ? body.public_key : "";
  if (!publicKey || !publicKey.startsWith("snk_")) {
    return tinyResponse(400, "malformed");
  }

  // ─── 1. Resolve store ──────────────────────────────────────────────────
  const { data: store, error: storeErr } = await db
    .from("store_connections")
    .select("id, merchant_id, platform, primary_domain, connection_status")
    .eq("pixel_token", publicKey)
    .maybeSingle();

  if (storeErr || !store) {
    await logIngest(db, { pixel_token: publicKey, outcome: "malformed" });
    return tinyResponse(404, "unknown_store");
  }

  // ─── 2. Origin allow-list check ────────────────────────────────────────
  const originHost =
    hostnameFromHeader(req.headers.get("origin")) ||
    hostnameFromHeader(req.headers.get("referer"));

  const { data: domains } = await db
    .from("store_domains")
    .select("hostname")
    .eq("store_connection_id", store.id);

  const allowedHosts = (domains || []).map((d) => d.hostname);
  if (store.primary_domain && !allowedHosts.includes(store.primary_domain)) {
    allowedHosts.push(store.primary_domain);
  }

  if (!originHost || !hostInList(originHost, allowedHosts)) {
    await logIngest(db, {
      pixel_token: publicKey,
      store_connection_id: store.id,
      origin: originHost,
      outcome: "origin_rejected",
    });
    return tinyResponse(403, "origin_not_allowed");
  }

  // ─── 3. Rate-limit: 50 ingest events / store / minute ──────────────────
  const oneMinAgo = new Date(Date.now() - 60_000).toISOString();
  const { count: recentCount } = await db
    .from("pixel_events")
    .select("id", { count: "exact", head: true })
    .eq("store_connection_id", store.id)
    .gte("created_at", oneMinAgo);

  if ((recentCount ?? 0) > 50) {
    await logIngest(db, {
      pixel_token: publicKey,
      store_connection_id: store.id,
      origin: originHost,
      outcome: "rate_limited",
    });
    return tinyResponse(429, "rate_limited");
  }

  // ─── 4. Normalize ──────────────────────────────────────────────────────
  const declared = (body.platform || store.platform || "custom") as
    | SnailonPlatform
    | "pixel";
  const normalizerKey: SnailonPlatform | "pixel" =
    declared === "shopify" || declared === "woocommerce" || declared === "youcan"
      ? declared
      : "pixel";

  const normalized = normalize(normalizerKey, body);

  if (!normalized || !normalized.external_id) {
    await logIngest(db, {
      pixel_token: publicKey,
      store_connection_id: store.id,
      origin: originHost,
      outcome: "malformed",
    });
    return tinyResponse(400, "malformed");
  }

  // ─── 5. Upsert order — idempotent ──────────────────────────────────────
  const orderRow = toOrderRow({
    storeConnectionId: store.id,
    merchantId: store.merchant_id,
    source: "pixel",
    order: normalized,
  });

  const { error: upsertErr } = await db
    .from("orders")
    .upsert(orderRow, {
      onConflict: "store_connection_id,external_order_id",
      ignoreDuplicates: false,
    })
    .select("id, ingested_at")
    .single();

  if (upsertErr) {
    await logIngest(db, {
      pixel_token: publicKey,
      store_connection_id: store.id,
      origin: originHost,
      outcome: "malformed",
    });
    return tinyResponse(500, "storage_error");
  }

  // ─── 6. Connection-status milestone ────────────────────────────────────
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

  await logIngest(db, {
    pixel_token: publicKey,
    store_connection_id: store.id,
    origin: originHost,
    outcome: "accepted",
  });

  return tinyResponse(200, "ok");
}

// =============================================================================
// helpers
// =============================================================================

function tinyResponse(status: number, code: string) {
  return new NextResponse(JSON.stringify({ ok: status < 400, code }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}

async function logIngest(
  db: ReturnType<typeof createAdminClient>,
  row: {
    pixel_token: string;
    store_connection_id?: string;
    origin?: string | null;
    outcome:
      | "accepted"
      | "duplicate"
      | "origin_rejected"
      | "signature_rejected"
      | "rate_limited"
      | "malformed";
  }
) {
  await db.from("pixel_events").insert({
    store_connection_id: row.store_connection_id ?? null,
    pixel_token: row.pixel_token,
    event_type: "ingest",
    origin: row.origin ?? null,
    outcome: row.outcome,
  });
}
