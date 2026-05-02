/**
 * The one canonical shape every ingest source must produce.
 * Adding a new platform means writing a normalizer that returns this.
 */
export interface NormalizedOrder {
  external_id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  shipping_address: ShippingAddress | null;
  items: OrderItem[];
  total_amount: number | null;
  currency: string;
  raw_payload: Record<string, unknown>;
}

export interface OrderItem {
  name: string;
  sku?: string | null;
  quantity: number;
  price: number | null;
}

export interface ShippingAddress {
  line1?: string;
  line2?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: string;
}

export type IngestSource = "pixel" | "webhook" | "manual" | "test";
export type SnailonPlatform =
  | "shopify"
  | "woocommerce"
  | "youcan"
  | "storeino"
  | "shopyan"
  | "custom";
