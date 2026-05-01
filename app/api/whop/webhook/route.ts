import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWhopSignature } from "@/lib/whop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Whop sends webhooks for events like:
//   - payment.succeeded
//   - membership.went_valid
//   - subscription.payment.succeeded
//
// We rely on metadata.merchant_id + metadata.mad_amount, which we attach
// when creating the checkout session.
export async function POST(req: Request) {
  const raw = await req.text();
  const sig =
    req.headers.get("whop-signature") ??
    req.headers.get("x-whop-signature") ??
    req.headers.get("whop-webhook-signature");

  if (!verifyWhopSignature(raw, sig)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const admin = createAdminClient();
  const eventType: string = event.event ?? event.type ?? "";

  // Try to find merchant_id + mad_amount across known shapes.
  const data = event.data ?? event.payload ?? event;
  const metadata = data.metadata ?? data.attributes?.metadata ?? {};
  const merchantId = metadata.merchant_id ?? metadata.merchantId;
  const madAmount = Number(metadata.mad_amount ?? metadata.madAmount ?? 0);
  const paymentId =
    data.id ?? data.payment_id ?? data.attributes?.id ?? null;

  // Only act on success-type events
  const isSuccess =
    eventType.includes("succeeded") ||
    eventType.includes("payment.success") ||
    eventType.includes("went_valid");

  if (!isSuccess) {
    return NextResponse.json({ ok: true, ignored: eventType });
  }

  if (!merchantId || !madAmount || madAmount <= 0) {
    console.warn("Whop webhook missing metadata:", { merchantId, madAmount, paymentId });
    return NextResponse.json({ ok: true, ignored: "missing metadata" });
  }

  // Idempotency: don't double-credit if we've already processed this paymentId.
  if (paymentId) {
    const { data: existing } = await admin
      .from("wallet_transactions")
      .select("id")
      .eq("reference", paymentId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ ok: true, deduped: true });
    }
  }

  const { error } = await admin.rpc("credit_wallet", {
    p_merchant_id: merchantId,
    p_amount_mad: madAmount,
    p_type: "topup",
    p_reference: paymentId ?? `whop:${Date.now()}`,
    p_metadata: { whop_event: eventType, raw: data },
  });

  if (error) {
    console.error("credit_wallet failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, credited_mad: madAmount });
}
