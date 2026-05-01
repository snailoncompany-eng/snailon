import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWhopSignature } from "@/lib/whop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Whop webhook handler.
// Pulls merchant_id, mad_amount, bonus_mad, is_founding from plan metadata
// (set by createDynamicPlan). Credits the wallet atomically. Idempotent
// against the Whop payment id.
export async function POST(req: Request) {
  const raw = await req.text();
  const sig =
    req.headers.get("whop-signature") ??
    req.headers.get("x-whop-signature") ??
    req.headers.get("whop-webhook-signature");

  // In dev / when secret isn't configured we accept anyway. In production
  // the secret is set, so this still gates real traffic.
  const secretConfigured = !!process.env.WHOP_WEBHOOK_SECRET;
  if (secretConfigured && !verifyWhopSignature(raw, sig)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const eventType: string = event.event ?? event.type ?? event.action ?? "";
  const data = event.data ?? event.payload ?? event;

  // Only process success-type events
  const isSuccess =
    eventType.includes("succeeded") ||
    eventType.includes("payment.success") ||
    eventType.includes("went_valid") ||
    eventType.includes("payment_succeeded");

  if (!isSuccess) {
    return NextResponse.json({ ok: true, ignored: eventType });
  }

  // Metadata can be on the payment or on the plan. Try both.
  const planMetadata = data.plan?.metadata ?? data.checkout?.metadata ?? {};
  const paymentMetadata = data.metadata ?? data.attributes?.metadata ?? {};
  const meta = { ...planMetadata, ...paymentMetadata };

  const merchantId = meta.merchant_id ?? meta.merchantId;
  const madAmount = Number(meta.mad_amount ?? meta.madAmount ?? 0);
  const bonusMad = Number(meta.bonus_mad ?? meta.bonusMad ?? 0);
  const isFoundingPurchase =
    String(meta.is_founding ?? meta.isFounding ?? "false").toLowerCase() === "true";
  const tierLabel = meta.tier_label ?? meta.tierLabel ?? null;

  const paymentId = data.id ?? data.payment_id ?? data.attributes?.id ?? null;

  if (!merchantId || madAmount <= 0) {
    console.warn("Whop webhook missing metadata:", { merchantId, madAmount, paymentId, eventType });
    return NextResponse.json({ ok: true, ignored: "missing metadata" });
  }

  const admin = createAdminClient();

  // Idempotency: don't double-credit on retries
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

  // Look up merchant — they may already be a founding member, in which case
  // EVERY top-up gets the lifetime bonus regardless of which tier they picked.
  const { data: merchant } = await admin
    .from("merchants")
    .select("id, is_founding, founding_bonus_pct")
    .eq("id", merchantId)
    .maybeSingle();
  if (!merchant) {
    return NextResponse.json({ error: "merchant not found" }, { status: 404 });
  }

  // Compute the effective bonus to apply on this top-up:
  //   - if merchant is already founding: apply founding_bonus_pct of mad_amount
  //   - else if this purchase is the founding tier: bonus_mad from metadata
  //   - else: 0
  let effectiveBonus = 0;
  if (merchant.is_founding) {
    effectiveBonus = Math.round(madAmount * (merchant.founding_bonus_pct / 100));
  } else if (isFoundingPurchase) {
    effectiveBonus = bonusMad;
  } else {
    effectiveBonus = bonusMad; // for any other future bonus-tier
  }

  // 1. Credit the base amount
  const { error: baseErr } = await admin.rpc("credit_wallet", {
    p_merchant_id: merchantId,
    p_amount_mad: madAmount,
    p_type: "topup",
    p_reference: paymentId ?? `whop:${Date.now()}`,
    p_metadata: { whop_event: eventType, tier_label: tierLabel, raw: data },
  });
  if (baseErr) {
    console.error("base credit failed:", baseErr);
    return NextResponse.json({ error: baseErr.message }, { status: 500 });
  }

  // 2. Credit the bonus (separate ledger entry so it's auditable)
  if (effectiveBonus > 0) {
    const reasonReference = paymentId ? `${paymentId}:bonus` : `bonus:${Date.now()}`;
    const { error: bonusErr } = await admin.rpc("credit_wallet", {
      p_merchant_id: merchantId,
      p_amount_mad: effectiveBonus,
      p_type: "adjustment",
      p_reference: reasonReference,
      p_metadata: {
        kind: "topup_bonus",
        bonus_pct: merchant.is_founding ? merchant.founding_bonus_pct : null,
        tier_label: tierLabel,
        whop_event: eventType,
      },
    });
    if (bonusErr) {
      console.error("bonus credit failed:", bonusErr);
      // Non-fatal. The base credit already landed.
    }
  }

  // 3. If this was the founding-tier purchase and they aren't yet a member,
  //    flip the flag.
  if (isFoundingPurchase && !merchant.is_founding) {
    const { error: flagErr } = await admin
      .from("merchants")
      .update({ is_founding: true, founding_bonus_pct: bonusMad > 0 ? Math.round((bonusMad / madAmount) * 100) : 50 })
      .eq("id", merchantId);
    if (flagErr) console.error("founding flag flip failed:", flagErr);
  }

  return NextResponse.json({
    ok: true,
    credited_mad: madAmount,
    bonus_mad: effectiveBonus,
    became_founding: isFoundingPurchase && !merchant.is_founding,
  });
}
