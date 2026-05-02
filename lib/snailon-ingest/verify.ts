import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Extract a hostname from an Origin or Referer header value.
 * Returns null on garbage.
 */
export function hostnameFromHeader(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * True if `candidate` matches `registered` exactly OR is the www. variant of it
 * OR `registered` is the www. variant of `candidate`. We consider apex and www
 * the same store in the dashboard for sanity.
 */
export function hostMatches(candidate: string, registered: string): boolean {
  const a = candidate.toLowerCase();
  const b = registered.toLowerCase();
  if (a === b) return true;
  if (a === 'www.' + b) return true;
  if (b === 'www.' + a) return true;
  return false;
}

/** True if `candidate` matches any of the registered hostnames. */
export function hostInList(candidate: string, list: string[]): boolean {
  return list.some((h) => hostMatches(candidate, h));
}

// =============================================================================
// HMAC verification — for tier-2 server-side webhooks
// =============================================================================

/**
 * Shopify: base64(HMAC-SHA256(rawBody, secret))
 * Header: X-Shopify-Hmac-SHA256
 */
export function verifyShopifyHmac(rawBody: string, header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const computed = createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
  return safeEqual(computed, header);
}

/**
 * YouCan: hex(HMAC-SHA256(JSON.stringify(payload), oauthClientSecret))
 * Header: x-youcan-signature
 * Note: YouCan signs the JSON.stringify of the payload object — which means
 * we must re-stringify the parsed JSON to match. Pass the *parsed* object back
 * via JSON.stringify.
 */
export function verifyYouCanHmac(payloadStringified: string, header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const computed = createHmac('sha256', secret).update(payloadStringified, 'utf8').digest('hex');
  return safeEqual(computed, header);
}

/**
 * WooCommerce: base64(HMAC-SHA256(rawBody, secret))
 * Header: X-WC-Webhook-Signature
 * Same algorithm as Shopify but different header name.
 */
export function verifyWooHmac(rawBody: string, header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const computed = createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64');
  return safeEqual(computed, header);
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  try {
    return timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}
