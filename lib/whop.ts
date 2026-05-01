import crypto from "node:crypto";

// Verifies a Whop webhook signature.
// Whop sends a header (commonly `whop-signature` or similar) containing
// an HMAC SHA-256 of the raw request body using your webhook secret.
// We compute and constant-time compare.
export function verifyWhopSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;

  const computed = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");

  // Header may be just the hex digest, or "sha256=<hex>", handle both.
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

// Creates a Whop checkout session via their API.
// Docs: https://dev.whop.com — uses /v5/payments/charge or hosted checkout.
// We use the simpler hosted-checkout pattern: build a URL the user opens.
export async function createWhopCheckout(opts: {
  merchantId: string;
  amountMad: number;
  productId?: string;
}): Promise<{ url: string }> {
  const apiKey = process.env.WHOP_API_KEY;
  const productId = opts.productId ?? process.env.WHOP_PRODUCT_ID;
  const planId = process.env.WHOP_PLAN_ID;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://snailon.com";
  if (!apiKey) throw new Error("WHOP_API_KEY not set");

  // Approach: create a checkout session for the configured plan,
  // attaching `merchant_id` + `mad_amount` as metadata so the webhook
  // can credit the right wallet.
  const res = await fetch("https://api.whop.com/api/v5/checkout_sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      plan_id: planId,
      metadata: {
        merchant_id: opts.merchantId,
        mad_amount: String(opts.amountMad),
        purpose: "wallet_topup",
      },
      redirect_url: `${baseUrl}/dashboard/wallet?status=success`,
    }),
  });

  if (!res.ok) {
    // Fallback: return a generic Whop product URL with metadata in query
    // so at minimum we have a clickable path.
    const productUrl = `https://whop.com/checkout/${planId}?metadata[merchant_id]=${encodeURIComponent(
      opts.merchantId
    )}&metadata[mad_amount]=${opts.amountMad}`;
    return { url: productUrl };
  }
  const json = await res.json();
  const url = json?.purchase_url ?? json?.checkout_url ?? json?.url;
  if (!url) throw new Error("Whop did not return a checkout URL");
  return { url };
}
