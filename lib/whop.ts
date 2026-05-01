import crypto from "node:crypto";

const WHOP_API_BASE = "https://api.whop.com/api";
const WHOP_CHECKOUT_CURRENCY = (process.env.WHOP_CHECKOUT_CURRENCY ?? "mad").toLowerCase();

// ---------- Webhook signature verification ----------
export function verifyWhopSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const computed = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const provided = signatureHeader.includes("=") ? signatureHeader.split("=")[1] : signatureHeader;

  try {
    const a = Buffer.from(computed, "hex");
    const b = Buffer.from(provided, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ---------- Dynamic plan creation for embedded checkout ----------
// Creates a hidden one-time-payment plan tied to the existing Snailon product.
// The plan price is whatever amount the user picked. Metadata captures
// merchant_id + mad_amount + bonus_mad + is_founding so the webhook can
// credit correctly.
//
// The returned plan_id is what the embedded checkout iframe needs.
export type CreatePlanArgs = {
  merchantId: string;
  amountMad: number;
  bonusMad: number;
  isFounding: boolean;
  tierLabel: string;
};

export async function createDynamicPlan(args: CreatePlanArgs): Promise<{
  plan_id: string;
  direct_link: string;
}> {
  const apiKey = process.env.WHOP_API_KEY;
  const productId = process.env.WHOP_PRODUCT_ID;
  if (!apiKey) throw new Error("WHOP_API_KEY not set");
  if (!productId) throw new Error("WHOP_PRODUCT_ID not set");

  const body = {
    product_id: productId,
    plan_type: "one_time",
    release_method: "buy_now",
    visibility: "hidden",
    initial_price: args.amountMad,
    base_currency: WHOP_CHECKOUT_CURRENCY,
    internal_notes: `snailon|merchant=${args.merchantId}|mad=${args.amountMad}|bonus=${args.bonusMad}|founding=${args.isFounding}|tier=${args.tierLabel}`,
    metadata: {
      merchant_id: args.merchantId,
      mad_amount: String(args.amountMad),
      bonus_mad: String(args.bonusMad),
      is_founding: args.isFounding ? "true" : "false",
      tier_label: args.tierLabel,
      purpose: "wallet_topup",
    },
  };

  const res = await fetch(`${WHOP_API_BASE}/v2/plans`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Whop plan creation failed (${res.status}): ${text}`);
  }
  const json = await res.json();
  if (!json?.id) {
    throw new Error("Whop did not return a plan id");
  }
  return { plan_id: json.id, direct_link: json.direct_link };
}
