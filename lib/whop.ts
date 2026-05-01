import crypto from "node:crypto";

const WHOP_API_BASE = "https://api.whop.com/api/v1";
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

// ---------- Embedded checkout session creation ----------
// Whop's hosted checkout pages ship a `frame-ancestors 'self'` CSP that
// blocks third-party iframing. The correct path for embedded checkout is:
//
//   1. Server: POST /api/v1/checkout_configurations with an inline plan
//   2. Server: receive { id: "ch_xxx" } — this is the session ID
//   3. Client: pass sessionId="ch_xxx" to <WhopCheckoutEmbed/>
//
// `metadata` is propagated to the eventual payment.succeeded webhook,
// so we attach merchant_id, mad_amount, bonus_mad, is_founding here.
export type CreateCheckoutArgs = {
  merchantId: string;
  amountMad: number;
  bonusMad: number;
  isFounding: boolean;
  tierLabel: string;
};

export type CheckoutSession = {
  session_id: string;   // ch_xxx — pass to <WhopCheckoutEmbed sessionId={...}/>
  plan_id: string;      // plan_xxx — informational
  purchase_url: string; // hosted-page fallback
};

export async function createCheckoutSession(args: CreateCheckoutArgs): Promise<CheckoutSession> {
  const apiKey = process.env.WHOP_API_KEY;
  const companyId = process.env.WHOP_COMPANY_ID;
  if (!apiKey) throw new Error("WHOP_API_KEY not set");
  if (!companyId) throw new Error("WHOP_COMPANY_ID not set");

  const body = {
    plan: {
      company_id: companyId,
      initial_price: args.amountMad,
      plan_type: "one_time",
      currency: WHOP_CHECKOUT_CURRENCY,
      release_method: "buy_now",
      visibility: "hidden",
    },
    metadata: {
      merchant_id: args.merchantId,
      mad_amount: String(args.amountMad),
      bonus_mad: String(args.bonusMad),
      is_founding: args.isFounding ? "true" : "false",
      tier_label: args.tierLabel,
      purpose: "wallet_topup",
    },
  };

  const res = await fetch(`${WHOP_API_BASE}/checkout_configurations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    // Don't let a slow Whop response block our SSR for too long
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Whop checkout_configurations ${res.status}: ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  if (!json?.id || !json?.plan?.id) {
    throw new Error("Whop did not return a session id");
  }
  return {
    session_id: json.id,
    plan_id: json.plan.id,
    purchase_url: json.purchase_url ?? "",
  };
}

// Legacy alias retained for any caller still importing the old name.
// (We removed all known callers — but keep the symbol to avoid build errors
// if any branch still references it.)
export const createDynamicPlan = async (args: CreateCheckoutArgs) => {
  const s = await createCheckoutSession(args);
  return { plan_id: s.plan_id, direct_link: s.purchase_url, session_id: s.session_id };
};
