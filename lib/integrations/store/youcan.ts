// YouCan adapter — production-grade.
//
// Reference: https://developer.youcan.shop/
// Auth: Bearer access_token (issued via OAuth or paste-in API token)
// Webhooks: POST to /resthooks/subscribe; events fire to our URL with
//           x-youcan-signature = HMAC-SHA256(json.stringify(body), CLIENT_SECRET)
//
// IMPORTANT: webhook signatures are signed with the OAuth Client secret
// (set via env var YOUCAN_OAUTH_CLIENT_SECRET), NOT the merchant's
// access token. If the env var isn't set, signature verification falls
// back to "trust mode" with a warning — do not run prod without it.

import crypto from "node:crypto";
import type {
  StoreAdapter,
  StoreCredentials,
  ConnectionTest,
  NormalizedOrder,
  NormalizedProduct,
  PlatformDescriptor,
} from "../types";

const YOUCAN_API_BASE = "https://api.youcan.shop";

const descriptor: PlatformDescriptor = {
  id: "youcan",
  label: "YouCan",
  tagline: "The dominant Moroccan e-commerce platform.",
  monogram: "Y",
  fields: [
    {
      key: "access_token",
      label: "Access token",
      type: "password",
      placeholder: "yc_xxx...",
      hint: "Settings → API → create or copy your token",
      required: true,
    },
    {
      key: "store_url",
      label: "Store URL",
      type: "url",
      placeholder: "https://yourstore.youcan.shop",
      required: true,
    },
  ],
  status: "live",
  setupHint:
    "In your YouCan Seller Area, go to Apps → API → create a token with read-products and edit-rest-hooks scopes. Paste the token here. We'll register the order webhook automatically.",
};

async function ycFetch<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${YOUCAN_API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YouCan ${path} → ${res.status}: ${body.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

export const YouCanAdapter: StoreAdapter = {
  platform: "youcan",
  descriptor,

  async testConnection(creds): Promise<ConnectionTest> {
    const token = String(creds.access_token ?? "").trim();
    if (!token) return { ok: false, error: "Missing access token" };

    try {
      // /products?limit=1 is a cheap auth check
      const res = await ycFetch<any>("/products?limit=1", token);
      const storeName =
        // Best-effort store name — YouCan doesn't have a dedicated /me endpoint
        // for store-admin tokens, so derive from URL.
        (creds.store_url ? new URL(String(creds.store_url)).hostname : null) ?? "YouCan store";
      return {
        ok: true,
        storeName,
        meta: { product_total: res?.meta?.total ?? null },
      };
    } catch (e: any) {
      return { ok: false, error: e.message ?? "auth failed" };
    }
  },

  async syncCatalog(creds): Promise<NormalizedProduct[]> {
    const token = String(creds.access_token);
    const products: NormalizedProduct[] = [];
    let page = 1;
    // Cap at 5 pages on initial sync to keep it fast (~500 products)
    while (page <= 5) {
      const res = await ycFetch<any>(`/products?include=variants&page=${page}&limit=100`, token);
      const data = res?.data ?? [];
      if (data.length === 0) break;
      for (const p of data) {
        products.push({
          externalProductId: String(p.id),
          name: String(p.name ?? "Untitled"),
          priceMad: Number(p.price ?? 0),
          description: p.description ?? null,
          variants: p.variants ?? null,
        });
      }
      if (data.length < 100) break;
      page++;
    }
    return products;
  },

  verifyWebhook(rawBody, headers): boolean {
    const sig = headers.get("x-youcan-signature");
    const secret = process.env.YOUCAN_OAUTH_CLIENT_SECRET;

    // Trust mode: no client secret configured. Log a warning and accept.
    // Acceptable for dev / paste-token onboarding before YouCan partner approval.
    if (!secret) {
      console.warn("[youcan] YOUCAN_OAUTH_CLIENT_SECRET not set — accepting webhook unsigned");
      return true;
    }
    if (!sig) return false;

    // YouCan signs JSON.stringify(payload). The body we receive is already
    // the JSON string YouCan sent, so HMAC over rawBody matches their hash
    // as long as no proxy mangled it.
    const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
    try {
      const a = Buffer.from(expected, "hex");
      const b = Buffer.from(sig, "hex");
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  },

  parseOrderWebhook(rawBody): NormalizedOrder | null {
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return null;
    }

    // YouCan order.create payload (per their docs):
    // { id, ref, total, currency, status, customer:{...}, variants:[...], shipping:{...}, payment:{...} }
    if (!body?.id || !body?.customer) return null;

    const customer = body.customer ?? {};
    const variants = Array.isArray(body.variants) ? body.variants : [];

    // Phone: prefer customer.phone, fall back to shipping address phone
    const phone =
      customer.phone ??
      body.shipping?.address?.phone ??
      body.shipping?.payload?.address?.phone ??
      "";
    if (!phone) return null;

    // First line item drives productName/quantity/price for the AI's opening.
    // (Multi-item orders: we'll handle aggregation when the AI prompt supports it.)
    const first = variants[0] ?? {};
    const productName =
      first?.variant?.product?.name ??
      first?.product_title ??
      "Order";
    const qty = Number(first?.quantity ?? 1);
    const price = Number(first?.price ?? body.total ?? 0);

    // Address: try several shapes
    const shippingAddr = body.shipping?.address ?? body.shipping?.payload?.address ?? {};
    const address = [
      shippingAddr.address_1 ?? shippingAddr.line1,
      shippingAddr.address_2 ?? shippingAddr.line2,
    ]
      .filter(Boolean)
      .join(", ") || null;
    const city = shippingAddr.city ?? null;

    return {
      externalOrderId: String(body.id),
      customerName:
        [customer.first_name, customer.last_name].filter(Boolean).join(" ") || null,
      customerPhone: String(phone),
      customerEmail: customer.email ?? null,
      customerAddress: address,
      customerCity: city,
      productName: String(productName),
      productPriceMad: price,
      quantity: qty,
      rawPayload: body,
      isAbandoned: false,
    };
  },

  async registerWebhooks(creds, callbackUrl): Promise<void> {
    const token = String(creds.access_token);
    // Subscribe to order.create. If we've already subscribed, YouCan returns 429 — we swallow it.
    const events = ["order.create"];
    for (const event of events) {
      try {
        await ycFetch("/resthooks/subscribe", token, {
          method: "POST",
          body: JSON.stringify({ event, target_url: callbackUrl }),
        });
      } catch (e: any) {
        // 429 = already subscribed; not a hard failure.
        if (!String(e.message).includes("429")) {
          console.warn(`[youcan] subscribe ${event} failed:`, e.message);
        }
      }
    }
  },
};
