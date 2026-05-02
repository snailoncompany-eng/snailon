// Platform sniffer + instant-catalog probe.
//
// Given any merchant URL, figure out:
//   - which e-commerce platform (if we can tell)
//   - whether we can preview the catalog publicly right now (no auth)
//   - the canonical normalized URL for downstream calls
//
// All probes run in parallel with a hard 3s timeout. The merchant should
// see SOMETHING within 2s of clicking the button.

import type { NormalizedProduct, StorePlatform } from "./types";

export type DetectionResult = {
  platform: StorePlatform | "unknown";
  storeUrl: string;            // normalized: https://hostname (no trailing slash)
  hostname: string;
  storeName: string | null;    // best-effort guess
  publicCatalog: NormalizedProduct[]; // [] if not available without auth
  signals: string[];           // human-readable notes (for the UI)
  // For dispatching the next step in the connect wizard
  nextStep:
    | "shopify_install_app"
    | "shopify_paste_token"
    | "woocommerce_auto_auth"
    | "youcan_paste_token"
    | "pixel_only";
};

const TIMEOUT_MS = 3000;

function withTimeout<T>(p: Promise<T>, ms = TIMEOUT_MS): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export function normalizeUrl(input: string): { url: string; hostname: string } | null {
  let s = input.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) s = "https://" + s;
  try {
    const u = new URL(s);
    return {
      url: `${u.protocol}//${u.hostname}`,
      hostname: u.hostname.toLowerCase(),
    };
  } catch {
    return null;
  }
}

async function fetchJSON(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "SnailonProbe/1.0" },
      // Timeout via withTimeout wrapper; AbortController also for safety
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "SnailonProbe/1.0" }, cache: "no-store" });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// Shopify exposes /products.json publicly — no auth needed.
// Returns up to 250 per page, paginated by ?page=N.
async function probeShopify(storeUrl: string): Promise<NormalizedProduct[] | null> {
  const json = await withTimeout(fetchJSON(`${storeUrl}/products.json?limit=50`));
  if (!json?.products) return null;
  return json.products.map((p: any): NormalizedProduct => {
    const variant = p.variants?.[0] ?? {};
    return {
      externalProductId: String(p.id),
      name: String(p.title ?? "Untitled"),
      priceMad: Number(variant.price ?? p.price ?? 0),
      description: stripHtml(p.body_html ?? "") || null,
      variants: p.variants ?? null,
    };
  });
}

// YouCan public storefront sometimes exposes /api/products on the seller subdomain.
// Will return null silently if the store has it disabled.
async function probeYouCanPublic(storeUrl: string): Promise<NormalizedProduct[] | null> {
  const json = await withTimeout(fetchJSON(`${storeUrl}/api/products`));
  if (!Array.isArray(json?.data)) return null;
  return json.data.map((p: any): NormalizedProduct => ({
    externalProductId: String(p.id),
    name: String(p.name ?? "Untitled"),
    priceMad: Number(p.price ?? 0),
    description: p.description ?? null,
    variants: null,
  }));
}

// WooCommerce: no public catalog endpoint, but we can ping /wp-json/wc/v3 to
// confirm the platform is installed and reachable.
async function probeWooCommerce(storeUrl: string): Promise<{ ok: boolean; storeName?: string }> {
  const json = await withTimeout(fetchJSON(`${storeUrl}/wp-json/`));
  if (!json) return { ok: false };
  const namespaces: string[] = json?.namespaces ?? [];
  const isWoo = namespaces.some((n) => n.startsWith("wc/"));
  if (!isWoo) return { ok: false };
  return { ok: true, storeName: json?.name ?? null };
}

// Generic <title> + <meta og:site_name> grab as a fallback for store name
async function probeStoreMeta(storeUrl: string): Promise<{ name: string | null; signals: string[] }> {
  const html = await withTimeout(fetchText(storeUrl));
  if (!html) return { name: null, signals: [] };
  const signals: string[] = [];
  // Detect platforms from the HTML
  if (/cdn\.shopify\.com|var Shopify =/i.test(html)) signals.push("shopify_html");
  if (/youcan\.shop|cdn\.ycan\.shop/i.test(html)) signals.push("youcan_html");
  if (/wp-content\/plugins\/woocommerce|woocommerce\.css/i.test(html)) signals.push("woo_html");
  // Best-effort name
  const og = html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
  const title = html.match(/<title>([^<]+)<\/title>/i);
  return { name: og?.[1]?.trim() ?? title?.[1]?.trim() ?? null, signals };
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export async function detectPlatform(rawUrl: string): Promise<DetectionResult | null> {
  const norm = normalizeUrl(rawUrl);
  if (!norm) return null;

  const { url: storeUrl, hostname } = norm;
  const signals: string[] = [];

  // Hostname-based fast path: certain hosts are unambiguous
  const hostSays =
    /\.myshopify\.com$/.test(hostname) ? "shopify"
    : /\.youcan\.(shop|store)$/.test(hostname) ? "youcan"
    : null;
  if (hostSays) signals.push(`host:${hostSays}`);

  // Run the three platform probes + meta scrape in parallel
  const [shopifyCat, youcanCat, woo, meta] = await Promise.all([
    probeShopify(storeUrl),
    probeYouCanPublic(storeUrl),
    probeWooCommerce(storeUrl),
    probeStoreMeta(storeUrl),
  ]);
  signals.push(...meta.signals);

  // Decide the platform — host signal wins, otherwise probe results.
  let platform: StorePlatform | "unknown" = "unknown";
  let publicCatalog: NormalizedProduct[] = [];

  if (hostSays === "shopify" || (shopifyCat && shopifyCat.length > 0)) {
    platform = "shopify";
    publicCatalog = shopifyCat ?? [];
  } else if (hostSays === "youcan" || meta.signals.includes("youcan_html") || (youcanCat && youcanCat.length > 0)) {
    platform = "youcan";
    publicCatalog = youcanCat ?? [];
  } else if (woo.ok || meta.signals.includes("woo_html")) {
    platform = "woocommerce";
  }

  // What does the wizard need to do next?
  let nextStep: DetectionResult["nextStep"];
  switch (platform) {
    case "shopify":
      // We have catalog already. Need orders → install OAuth app or paste admin token.
      nextStep = "shopify_install_app";
      break;
    case "woocommerce":
      // WooCommerce auto-auth: send them to /wc-auth/v1/authorize, no token typing.
      nextStep = "woocommerce_auto_auth";
      break;
    case "youcan":
      // YouCan needs a token paste — until partner OAuth is approved.
      nextStep = "youcan_paste_token";
      break;
    default:
      nextStep = "pixel_only";
  }

  return {
    platform,
    storeUrl,
    hostname,
    storeName: meta.name,
    publicCatalog,
    signals,
    nextStep,
  };
}
