import type { NormalizedOrder } from "./types";

/**
 * Map our NormalizedOrder onto the actual `orders` table row shape.
 *
 * The existing `orders` table has both legacy flat columns (product_name,
 * product_price_mad, customer_address, customer_city, quantity) and the new
 * structured jsonb columns we added in the v2 migration (items,
 * shipping_address, total_amount, currency, source, needs_phone). We populate
 * BOTH so existing dashboard code that reads the flat columns keeps working
 * while the AI confirmer can read the rich structured data.
 */
export function toOrderRow(args: {
  storeConnectionId: string;
  merchantId: string;
  source: 'pixel' | 'webhook' | 'manual' | 'test';
  order: NormalizedOrder;
}) {
  const { storeConnectionId, merchantId, source, order } = args;
  const firstItem = order.items[0];

  return {
    merchant_id: merchantId,
    store_connection_id: storeConnectionId,
    external_order_id: order.external_id,
    source,

    // Customer
    customer_name:    order.customer_name,
    customer_phone:   order.customer_phone,
    customer_email:   order.customer_email,
    customer_address: order.shipping_address?.line1 || null,
    customer_city:    order.shipping_address?.city  || null,

    // Legacy flat product columns — first item, fallback so the row is valid
    product_name:     firstItem?.name || 'Unknown product',
    product_price_mad:
      firstItem?.price ??
      order.total_amount ??
      0,
    quantity:         firstItem?.quantity || 1,

    // Rich structured columns (new)
    items:            order.items,
    shipping_address: order.shipping_address,
    total_amount:     order.total_amount,
    currency:         order.currency || 'MAD',
    needs_phone:      !order.customer_phone,

    // Catch-all
    raw_payload: order.raw_payload,
    // status defaults to 'pending' from the enum default
  };
}
