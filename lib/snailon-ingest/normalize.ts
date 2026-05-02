import type { NormalizedOrder, OrderItem, SnailonPlatform, ShippingAddress } from "./types";
import { normalizePhone } from "./phone";

/* eslint-disable @typescript-eslint/no-explicit-any */

// =============================================================================
// PIXEL — already roughly normalized client-side; we just sanitize.
// =============================================================================
export function normalizePixel(payload: any): NormalizedOrder | null {
  const o = payload?.order;
  if (!o || !o.external_id) return null;

  return {
    external_id: String(o.external_id).slice(0, 128),
    customer_name: nonEmpty(o.customer_name),
    customer_phone: normalizePhone(o.customer_phone),
    customer_email: nonEmpty(o.customer_email),
    shipping_address: o.shipping_address || null,
    items: Array.isArray(o.items) ? o.items.slice(0, 50).map(normalizeItem) : [],
    total_amount: numOrNull(o.total_amount),
    currency: o.currency || 'MAD',
    raw_payload: payload
  };
}

// =============================================================================
// SHOPIFY — orders/create webhook payload
// https://shopify.dev/docs/api/admin-rest/latest/resources/order
// =============================================================================
export function normalizeShopify(p: any): NormalizedOrder | null {
  if (!p || (!p.id && !p.name)) return null;
  const billing = p.billing_address || {};
  const shipping = p.shipping_address || billing;
  const customer = p.customer || {};

  return {
    external_id: String(p.id || p.name),
    customer_name:
      [customer.first_name, customer.last_name].filter(Boolean).join(' ').trim() ||
      [shipping.first_name, shipping.last_name].filter(Boolean).join(' ').trim() ||
      null,
    customer_phone:
      normalizePhone(customer.phone) ||
      normalizePhone(shipping.phone) ||
      normalizePhone(billing.phone) ||
      normalizePhone(p.phone),
    customer_email: nonEmpty(p.email || customer.email),
    shipping_address: addressFromShopify(shipping),
    items: Array.isArray(p.line_items)
      ? p.line_items.map((li: any) => ({
          name: li.title || li.name || '',
          sku: li.sku || null,
          quantity: Number(li.quantity) || 1,
          price: numOrNull(li.price)
        }))
      : [],
    total_amount: numOrNull(p.total_price ?? p.current_total_price),
    currency: p.currency || p.presentment_currency || 'MAD',
    raw_payload: p
  };
}

function addressFromShopify(a: any): ShippingAddress | null {
  if (!a) return null;
  return {
    line1: a.address1 || '',
    line2: a.address2 || '',
    city: a.city || '',
    region: a.province || '',
    postal_code: a.zip || '',
    country: a.country_code || a.country || ''
  };
}

// =============================================================================
// WOOCOMMERCE — orders/create webhook payload (REST API v3 shape)
// https://woocommerce.github.io/woocommerce-rest-api-docs/#order-properties
// =============================================================================
export function normalizeWoo(p: any): NormalizedOrder | null {
  if (!p || !p.id) return null;
  const billing = p.billing || {};
  const shipping = p.shipping || billing;

  return {
    external_id: String(p.id),
    customer_name:
      [billing.first_name, billing.last_name].filter(Boolean).join(' ').trim() ||
      [shipping.first_name, shipping.last_name].filter(Boolean).join(' ').trim() ||
      null,
    customer_phone: normalizePhone(billing.phone || shipping.phone),
    customer_email: nonEmpty(billing.email),
    shipping_address: {
      line1: shipping.address_1 || '',
      line2: shipping.address_2 || '',
      city: shipping.city || '',
      region: shipping.state || '',
      postal_code: shipping.postcode || '',
      country: shipping.country || ''
    },
    items: Array.isArray(p.line_items)
      ? p.line_items.map((li: any) => ({
          name: li.name || '',
          sku: li.sku || null,
          quantity: Number(li.quantity) || 1,
          price: numOrNull(li.price ?? li.subtotal)
        }))
      : [],
    total_amount: numOrNull(p.total),
    currency: p.currency || 'MAD',
    raw_payload: p
  };
}

// =============================================================================
// YOUCAN — order.create REST hook payload
// https://developer.youcan.shop/store-admin/orders
// =============================================================================
export function normalizeYouCan(p: any): NormalizedOrder | null {
  if (!p || !p.id) return null;
  const customer = p.customer || {};
  const addr = (p.shipping && p.shipping.address) ||
               (p.payment && p.payment.address) ||
               null;

  return {
    external_id: String(p.ref || p.id),
    customer_name:
      [customer.first_name, customer.last_name].filter(Boolean).join(' ').trim() || null,
    customer_phone:
      normalizePhone(customer.phone) ||
      normalizePhone(addr?.phone),
    customer_email: nonEmpty(customer.email),
    shipping_address: addr ? {
      line1: addr.address_1 || addr.address || '',
      line2: addr.address_2 || '',
      city: addr.city || '',
      region: addr.region || addr.state || '',
      postal_code: addr.postal_code || addr.zip || '',
      country: addr.country || ''
    } : null,
    items: Array.isArray(p.line_items)
      ? p.line_items.map((li: any) => ({
          name: li.product_title || li.name || '',
          sku: li.sku || null,
          quantity: Number(li.quantity) || 1,
          price: numOrNull(li.price)
        }))
      : Array.isArray(p.items)
      ? p.items.map((i: any) => ({
          name: i.name || '',
          sku: i.sku || null,
          quantity: Number(i.quantity) || 1,
          price: numOrNull(i.price)
        }))
      : [],
    total_amount: numOrNull(p.total),
    currency: 'MAD',
    raw_payload: p
  };
}

// =============================================================================
// Dispatch
// =============================================================================
export function normalize(platform: SnailonPlatform | 'pixel', payload: any): NormalizedOrder | null {
  switch (platform) {
    case 'pixel':       return normalizePixel(payload);
    case 'shopify':     return normalizeShopify(payload);
    case 'woocommerce': return normalizeWoo(payload);
    case 'youcan':      return normalizeYouCan(payload);
    default:            return normalizePixel(payload); // best-effort
  }
}

// =============================================================================
// helpers
// =============================================================================
function nonEmpty(s: any): string | null {
  if (typeof s !== 'string') return null;
  const t = s.trim();
  return t || null;
}
function numOrNull(v: any): number | null {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : null;
}
function normalizeItem(i: any): OrderItem {
  return {
    name: String(i?.name || '').slice(0, 200),
    sku: i?.sku || null,
    quantity: Math.max(1, Number(i?.quantity) || 1),
    price: numOrNull(i?.price)
  };
}
