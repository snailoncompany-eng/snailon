// WooCommerce adapter — preview status.
// Auth: HTTP Basic with consumer_key:consumer_secret (REST API v3).
// Webhooks: signed via HMAC-SHA256(rawBody, secret) → base64 in
//           x-wc-webhook-signature header.

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
  id: "woocommerce",
  label: "WooCommerce",
  tagline: "Self-hosted WordPress commerce.",
  monogram: "W",
  fields: [
    {
      key: "store_url",
      label: "Site URL",
      type: "url",
      placeholder: "https://yourstore.com",
      required: true,
    },
    {
      key: "consumer_key",
      label: "Consumer key",
      type: "password",
      placeholder: "ck_...",
      required: true,
    },
    {
      key: "consumer_secret",
      label: "Consumer secret",
      type: "password",
      placeholder: "cs_...",
      required: true,
    },
    {
      key: "webhook_secret",
      label: "Webhook secret",
      type: "password",
      hint: "Set this when creating the WooCommerce webhook",
      required: true,
    },
  ],
  status: "preview",
  setupHint:
    "WooCommerce → Settings → Advanced → REST API → Add key (read access). Then Settings → Advanced → Webhooks → create one for orders.create pointing to the URL we'll show after setup.",
};

function basicAuth(key: string, secret: string): string {
  return "Basic " + Buffer.from(`${key}:${secret}`, "utf8").toString("base64");
}

export const WooCommerceAdapter: StoreAdapter = {
  platform: "woocommerce",
  descriptor,

  async testConnection(creds): Promise<ConnectionTest> {
    const url = String(creds.store_url ?? "").trim().replace(/\/$/, "");
    const key = String(creds.consumer_key ?? "");
    const secret = String(creds.consumer_secret ?? "");
    if (!url || !key || !secret) return { ok: false, error: "Missing credentials" };

    try {
      const res = await fetch(`${url}/wp-json/wc/v3/system_status`, {
        headers: { Authorization: basicAuth(key, secret), Accept: "application/json" },
      });
      if (!res.ok) return { ok: false, error: `WooCommerce auth failed (${res.status})` };
      const json = await res.json();
      const storeName = json?.environment?.site_url ?? url;
      return { ok: true, storeName, externalStoreId: storeName };
    } catch (e: any) {
      return { ok: false, error: e.message ?? "network error" };
    }
  },

  async syncCatalog(_creds): Promise<NormalizedProduct[]> {
    // TODO: GET /wp-json/wc/v3/products with paging. Field map:
    // id, name, price (string in store currency), description.
    return [];
  },

  verifyWebhook(rawBody, headers, creds): boolean {
    const sig = headers.get("x-wc-webhook-signature");
    const secret = String(creds.webhook_secret ?? "");
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
    // TODO: parse WooCommerce order. Field map:
    // id, billing.{first_name, last_name, email, phone},
    // shipping.{address_1, city}, line_items[0].{name, quantity, price}.
    return null;
  },
};
