// Shopify adapter — preview status.
// The credential shape and HMAC verification are real (Shopify's webhook
// auth is well-documented). The catalog sync + order parse are stubbed
// pending merchant pilot. Filling them in is ~3 hours of work.

import crypto from "node:crypto";
import type {
  StoreAdapter,
  StoreCredentials,
  ConnectionTest,
  NormalizedOrder,
  NormalizedProduct,
  PlatformDescriptor,
} from "../types";

const descriptor: PlatformDescriptor = {
  id: "shopify",
  label: "Shopify",
  tagline: "The global commerce platform.",
  monogram: "S",
  fields: [
    {
      key: "store_url",
      label: "Shop URL",
      type: "url",
      placeholder: "yourshop.myshopify.com",
      required: true,
    },
    {
      key: "admin_api_token",
      label: "Admin API access token",
      type: "password",
      placeholder: "shpat_...",
      hint: "Settings → Apps → Develop apps → create custom app → API credentials",
      required: true,
    },
    {
      key: "api_secret_key",
      label: "API secret key (for webhook verification)",
      type: "password",
      hint: "Same Apps page → API credentials → API secret key",
      required: true,
    },
  ],
  status: "preview",
  setupHint:
    "Create a custom app in Shopify with read_products + read_orders scopes. Paste the admin API token and the API secret key here.",
};

export const ShopifyAdapter: StoreAdapter = {
  platform: "shopify",
  descriptor,

  async testConnection(creds): Promise<ConnectionTest> {
    const url = String(creds.store_url ?? "").trim().replace(/^https?:\/\//, "");
    const token = String(creds.admin_api_token ?? "").trim();
    if (!url || !token) return { ok: false, error: "Missing shop URL or token" };

    try {
      const res = await fetch(`https://${url}/admin/api/2024-10/shop.json`, {
        headers: { "X-Shopify-Access-Token": token, Accept: "application/json" },
      });
      if (!res.ok) return { ok: false, error: `Shopify auth failed (${res.status})` };
      const json = await res.json();
      return {
        ok: true,
        storeName: json?.shop?.name ?? url,
        externalStoreId: String(json?.shop?.id ?? ""),
      };
    } catch (e: any) {
      return { ok: false, error: e.message ?? "network error" };
    }
  },

  async syncCatalog(_creds): Promise<NormalizedProduct[]> {
    // TODO: GET /admin/api/2024-10/products.json with pagination.
    // The endpoint shape is straightforward; deferred until a merchant
    // explicitly asks for catalog sync. Order ingestion works without it.
    return [];
  },

  verifyWebhook(rawBody, headers, creds): boolean {
    // Shopify signs webhooks with HMAC-SHA256(rawBody, API_SECRET_KEY) → base64
    // Header: X-Shopify-Hmac-Sha256
    const sig = headers.get("x-shopify-hmac-sha256");
    const secret = String(creds.api_secret_key ?? "");
    if (!sig || !secret) return false;

    const expected = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
    try {
      const a = Buffer.from(expected);
      const b = Buffer.from(sig);
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    } catch {
      return false;
    }
  },

  parseOrderWebhook(_rawBody): NormalizedOrder | null {
    // TODO: parse Shopify orders/create payload. See:
    // https://shopify.dev/docs/api/admin-rest/2024-10/resources/order
    // Key fields: id, customer.{first_name, last_name, email, phone},
    // shipping_address.{address1, city, phone}, line_items[0].{title, quantity, price}.
    return null;
  },

  async registerWebhooks(creds, callbackUrl): Promise<void> {
    // TODO: POST /admin/api/2024-10/webhooks.json topic=orders/create address=callbackUrl
    void creds;
    void callbackUrl;
  },
};
